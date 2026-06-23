from flask import Blueprint, request, jsonify
from models import db, User, AttendanceSubject

attendance_bp = Blueprint('attendance', __name__)


def _get_user(reg_number):
    if not reg_number:
        return None
    return User.query.filter_by(registration_number=reg_number).first()


@attendance_bp.route('/list/<reg_number>', methods=['GET'])
def list_subjects(reg_number):
    user = _get_user(reg_number)
    if not user:
        return jsonify({"error": "User not found"}), 404

    subjects = AttendanceSubject.query.filter_by(user_id=user.id).order_by(AttendanceSubject.id).all()
    return jsonify([{
        "id": s.id,
        "name": s.name,
        "total": s.total,
        "attended": s.attended,
    } for s in subjects])


@attendance_bp.route('/subjects', methods=['POST'])
def add_subject():
    data = request.json or {}
    reg_number = data.get('registration_number')
    name = (data.get('name') or '').strip()

    if not reg_number or not name:
        return jsonify({"error": "Registration number and subject name are required"}), 400

    user = _get_user(reg_number)
    if not user:
        return jsonify({"error": "User not found"}), 404

    subject = AttendanceSubject(user_id=user.id, name=name, total=0, attended=0)
    db.session.add(subject)
    db.session.commit()

    return jsonify({
        "id": subject.id,
        "name": subject.name,
        "total": subject.total,
        "attended": subject.attended,
    }), 201


@attendance_bp.route('/subjects/<int:subject_id>', methods=['PATCH'])
def update_subject(subject_id):
    data = request.json or {}
    reg_number = data.get('registration_number')
    action = data.get('action')

    user = _get_user(reg_number)
    if not user:
        return jsonify({"error": "User not found"}), 404

    subject = AttendanceSubject.query.get(subject_id)
    if not subject or subject.user_id != user.id:
        return jsonify({"error": "Subject not found"}), 404

    if action == 'present':
        subject.attended += 1
        subject.total += 1
    elif action == 'absent':
        subject.total += 1
    else:
        return jsonify({"error": "Invalid action"}), 400

    db.session.commit()
    return jsonify({
        "id": subject.id,
        "name": subject.name,
        "total": subject.total,
        "attended": subject.attended,
    })


@attendance_bp.route('/subjects/<int:subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    reg_number = request.args.get('registration_number')
    user = _get_user(reg_number)
    if not user:
        return jsonify({"error": "User not found"}), 404

    subject = AttendanceSubject.query.get(subject_id)
    if not subject or subject.user_id != user.id:
        return jsonify({"error": "Subject not found"}), 404

    db.session.delete(subject)
    db.session.commit()
    return jsonify({"message": "Subject deleted"})


@attendance_bp.route('/reset/<reg_number>', methods=['DELETE'])
def reset_subjects(reg_number):
    user = _get_user(reg_number)
    if not user:
        return jsonify({"error": "User not found"}), 404

    AttendanceSubject.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({"message": "Attendance reset"})
