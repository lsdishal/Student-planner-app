import os
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.utils import secure_filename
from models import db, User, StudyMaterial

storage_bp = Blueprint('storage', __name__)

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'py', 'js', 'html', 'css', 'cpp', 'java'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@storage_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    reg_number = request.form.get('registration_number')
    semester = request.form.get('semester')
    title = request.form.get('title')

    if not all([reg_number, semester, title]):
        return jsonify({"error": "Missing form data"}), 400

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        user = User.query.filter_by(registration_number=reg_number).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Create user-specific upload directory
        user_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], str(reg_number))
        if not os.path.exists(user_dir):
            os.makedirs(user_dir)

        file_path = os.path.join(str(reg_number), filename)
        full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_path)
        
        # Avoid overwriting by appending timestamp or checking existence
        if os.path.exists(full_path):
             filename = f"{int(os.path.getmtime(full_path))}_{filename}"
             file_path = os.path.join(str(reg_number), filename)
             full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_path)

        file.save(full_path)

        # Save to database
        material = StudyMaterial(
            user_id=user.id,
            semester=semester,
            title=title,
            type=filename.rsplit('.', 1)[1].lower(),
            is_file=True,
            file_path=file_path
        )
        db.session.add(material)
        db.session.commit()

        return jsonify({"message": "File uploaded successfully", "id": material.id}), 201

    return jsonify({"error": "File type not allowed"}), 400

@storage_bp.route('/download/<reg_number>/<filename>', methods=['GET'])
def download_file(reg_number, filename):
    user_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], str(reg_number))
    return send_from_directory(user_dir, filename)

@storage_bp.route('/list/<reg_number>', methods=['GET'])
def list_files(reg_number):
    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    materials = StudyMaterial.query.filter_by(user_id=user.id, is_file=True).all()
    return jsonify([{
        "id": m.id,
        "title": m.title,
        "filename": os.path.basename(m.file_path),
        "type": m.type,
        "timestamp": m.timestamp.strftime("%Y-%m-%d %H:%M")
    } for m in materials])
