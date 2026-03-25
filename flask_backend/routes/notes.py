from flask import Blueprint, request, jsonify
from models import db, User, StudyNote
from datetime import datetime

notes_bp = Blueprint('notes', __name__)

@notes_bp.route('/save', methods=['POST'])
def save_note():
    data = request.json
    reg_number = data.get('registration_number')
    semester = data.get('semester')
    content = data.get('content')

    if not all([reg_number, semester, content]):
        return jsonify({"error": "Missing registration_number, semester, or content"}), 400

    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    new_note = StudyNote(user_id=user.id, semester=semester, content=content)
    db.session.add(new_note)
    db.session.commit()

    return jsonify({
        "message": "Note saved successfully", 
        "note_id": new_note.id,
        "timestamp": new_note.timestamp.strftime("%Y-%m-%d %H:%M:%S")
    }), 201

@notes_bp.route('/list/<reg_number>/<semester>', methods=['GET'])
def list_notes(reg_number, semester):
    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    notes = StudyNote.query.filter_by(user_id=user.id, semester=semester).order_by(StudyNote.timestamp.desc()).all()
    
    notes_list = []
    for note in notes:
        notes_list.append({
            "id": note.id,
            "content": note.content,
            "timestamp": note.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })

    return jsonify(notes_list), 200

@notes_bp.route('/delete/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    note = StudyNote.query.get(note_id)
    if not note:
        return jsonify({"error": "Note not found"}), 404

    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "Note deleted successfully"}), 200
