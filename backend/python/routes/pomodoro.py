from flask import Blueprint, request, jsonify
from models import db, User, PomodoroSession

pomodoro_bp = Blueprint('pomodoro', __name__)

@pomodoro_bp.route('/save', methods=['POST'])
def save_session():
    data = request.json
    reg_number = data.get('registration_number')
    session_type = data.get('type') # focus or break
    duration = data.get('duration') # in minutes

    if not all([reg_number, session_type, duration]):
        return jsonify({"error": "Missing required fields"}), 400

    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    session = PomodoroSession(user_id=user.id, type=session_type, duration=duration)
    db.session.add(session)
    db.session.commit()

    return jsonify({"message": "Session saved", "id": session.id}), 201

@pomodoro_bp.route('/history/<reg_number>', methods=['GET'])
def get_history(reg_number):
    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    sessions = PomodoroSession.query.filter_by(user_id=user.id).order_by(PomodoroSession.timestamp.desc()).limit(10).all()
    
    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "type": s.type,
            "duration": s.duration,
            "timestamp": s.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify(result), 200
