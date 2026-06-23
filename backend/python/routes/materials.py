from flask import Blueprint, request, jsonify
from models import db, User, StudyMaterial

materials_bp = Blueprint('materials', __name__)

@materials_bp.route('/save', methods=['POST'])
def save_material():
    data = request.json
    reg_number = data.get('registration_number')
    semester = data.get('semester')
    title = data.get('title')
    material_type = data.get('type', 'note')
    content = data.get('content', '')

    if not all([reg_number, semester, title]):
        return jsonify({"error": "Missing required fields"}), 400

    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    material = StudyMaterial(user_id=user.id, semester=semester, title=title, type=material_type, content=content)
    db.session.add(material)
    db.session.commit()

    return jsonify({"message": "Material added", "id": material.id}), 201

@materials_bp.route('/list/<reg_number>/<semester>', methods=['GET'])
def list_materials(reg_number, semester):
    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    materials = StudyMaterial.query.filter_by(user_id=user.id, semester=semester).all()
    
    result = []
    for m in materials:
        result.append({
            "id": m.id,
            "title": m.title,
            "type": m.type,
            "content": m.content,
            "is_file": m.is_file,
            "file_path": m.file_path,
            "timestamp": m.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify(result), 200

@materials_bp.route('/delete/<int:material_id>', methods=['DELETE'])
def delete_material(material_id):
    material = StudyMaterial.query.get(material_id)
    if not material:
        return jsonify({"error": "Material not found"}), 404
    
    db.session.delete(material)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
