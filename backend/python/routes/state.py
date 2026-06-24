from flask import Blueprint, request, jsonify
from models import db, User, UserState
import json

state_bp = Blueprint('state', __name__)

@state_bp.route('/save', methods=['POST'])
def save_state():
    try:
        data = request.json or {}
        reg_number = data.get('registration_number')
        key = data.get('key')
        value = data.get('value')

        if not all([reg_number, key]) or value is None:
            return jsonify({"error": "Missing required fields"}), 400

        user = User.query.filter_by(registration_number=reg_number).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Convert non-string values to JSON string
        if not isinstance(value, str):
            value_str = json.dumps(value)
        else:
            value_str = value

        state = UserState.query.filter_by(user_id=user.id, key=key).first()
        if state:
            state.value = value_str
        else:
            state = UserState(user_id=user.id, key=key, value=value_str)
            db.session.add(state)

        db.session.commit()
        return jsonify({"message": "State saved successfully"}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@state_bp.route('/load-all/<reg_number>', methods=['GET'])
def load_all_states(reg_number):
    try:
        user = User.query.filter_by(registration_number=reg_number).first()
        if not user:
            return jsonify([]), 200

        states = UserState.query.filter_by(user_id=user.id).all()
        result = []
        for s in states:
            try:
                val = json.loads(s.value)
            except:
                val = s.value
            result.append({"key": s.key, "value": val})

        return jsonify(result), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500
