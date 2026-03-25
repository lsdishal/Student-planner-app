from flask import Blueprint, request, jsonify
from models import db, User, EditorFile
from datetime import datetime

editor_bp = Blueprint('editor', __name__)

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
