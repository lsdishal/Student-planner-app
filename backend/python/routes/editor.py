from flask import Blueprint, request, jsonify
from models import db, User, EditorFile
from datetime import datetime
import os
import re
import subprocess
import tempfile

editor_bp = Blueprint('editor', __name__)

MAX_CODE_LENGTH = 50_000
MAX_OUTPUT_LENGTH = 12_000
RUN_TIMEOUT_SECONDS = 5


def run_process(command, working_directory):
    try:
        result = subprocess.run(
            command,
            cwd=working_directory,
            capture_output=True,
            text=True,
            timeout=RUN_TIMEOUT_SECONDS,
            check=False,
            env={**os.environ, "PYTHONUNBUFFERED": "1"}
        )
        return {
            "stdout": result.stdout[-MAX_OUTPUT_LENGTH:],
            "stderr": result.stderr[-MAX_OUTPUT_LENGTH:],
            "exit_code": result.returncode,
            "timed_out": False
        }
    except subprocess.TimeoutExpired as error:
        stdout = error.stdout.decode() if isinstance(error.stdout, bytes) else (error.stdout or "")
        stderr = error.stderr.decode() if isinstance(error.stderr, bytes) else (error.stderr or "")
        return {
            "stdout": stdout[-MAX_OUTPUT_LENGTH:],
            "stderr": (stderr + f"\nExecution stopped after {RUN_TIMEOUT_SECONDS} seconds.")[-MAX_OUTPUT_LENGTH:],
            "exit_code": 124,
            "timed_out": True
        }


@editor_bp.route('/run', methods=['POST'])
def run_code():
    # Code execution is intentionally available only to the local WebOS app.
    if request.remote_addr not in {'127.0.0.1', '::1'}:
        return jsonify({"error": "Code execution is available only on localhost"}), 403

    data = request.get_json(silent=True) or {}
    language = data.get('language')
    code = data.get('code')

    if language not in {'js', 'java', 'python', 'c'}:
        return jsonify({"error": "This language cannot be run in the editor"}), 400
    if not isinstance(code, str) or not code.strip():
        return jsonify({"error": "Enter some code before running"}), 400
    if len(code) > MAX_CODE_LENGTH:
        return jsonify({"error": "Code is too large to run"}), 413

    with tempfile.TemporaryDirectory(prefix='webos-editor-') as temp_directory:
        if language == 'js':
            source_path = os.path.join(temp_directory, 'script.js')
            with open(source_path, 'w', encoding='utf-8') as source_file:
                source_file.write(code)
            result = run_process(['node', source_path], temp_directory)

        elif language == 'python':
            source_path = os.path.join(temp_directory, 'script.py')
            with open(source_path, 'w', encoding='utf-8') as source_file:
                source_file.write(code)
            result = run_process(['python3', source_path], temp_directory)

        elif language == 'c':
            source_path = os.path.join(temp_directory, 'main.c')
            executable_path = os.path.join(temp_directory, 'program')
            with open(source_path, 'w', encoding='utf-8') as source_file:
                source_file.write(code)

            compile_result = run_process(['gcc', source_path, '-o', executable_path], temp_directory)
            if compile_result['exit_code'] != 0:
                return jsonify({**compile_result, "stage": "compile"}), 200
            result = run_process([executable_path], temp_directory)

        else:
            class_match = re.search(
                r'\bpublic\s+(?:final\s+)?class\s+([A-Za-z_$][\w$]*)',
                code
            ) or re.search(r'\bclass\s+([A-Za-z_$][\w$]*)', code)
            if not class_match:
                return jsonify({"error": "Java code must contain a class"}), 400

            class_name = class_match.group(1)
            source_path = os.path.join(temp_directory, f'{class_name}.java')
            with open(source_path, 'w', encoding='utf-8') as source_file:
                source_file.write(code)

            compile_result = run_process(['javac', source_path], temp_directory)
            if compile_result['exit_code'] != 0:
                return jsonify({**compile_result, "stage": "compile"}), 200
            result = run_process(['java', '-cp', temp_directory, class_name], temp_directory)

        return jsonify({**result, "stage": "run"}), 200

@editor_bp.route('/save', methods=['POST'])
def save_file():
    data = request.json
    reg_number = data.get('registration_number')
    filename = data.get('filename')
    content = data.get('content')
    language = data.get('language', 'txt')

    if not all([reg_number, filename, content]):
        return jsonify({"error": "Missing required fields"}), 400

    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    file = EditorFile.query.filter_by(user_id=user.id, filename=filename).first()
    if file:
        file.content = content
        file.language = language
        file.last_modified = datetime.utcnow()
    else:
        file = EditorFile(user_id=user.id, filename=filename, content=content, language=language)
        db.session.add(file)
    
    db.session.commit()
    return jsonify({"message": "File saved", "last_modified": file.last_modified.strftime("%H:%M:%S")}), 200

@editor_bp.route('/list/<reg_number>', methods=['GET'])
def list_files(reg_number):
    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    files = EditorFile.query.filter_by(user_id=user.id).all()
    result = [{"filename": f.filename, "language": f.language} for f in files]
    return jsonify(result), 200

@editor_bp.route('/load/<reg_number>/<filename>', methods=['GET'])
def load_file(reg_number, filename):
    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    file = EditorFile.query.filter_by(user_id=user.id, filename=filename).first()
    if not file:
        return jsonify({"error": "File not found"}), 404

    return jsonify({
        "filename": file.filename,
        "content": file.content,
        "language": file.language
    }), 200
