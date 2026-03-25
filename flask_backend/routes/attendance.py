from flask import Blueprint, jsonify

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/status', methods=['GET'])
def get_attendance():
    # Placeholder for the future attendance functionality
    return jsonify({
        "modules": ["Physics", "Math", "Computer Science"], 
        "status": "Not implemented yet (Attendance plugin)"
    })
