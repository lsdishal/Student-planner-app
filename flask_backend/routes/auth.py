from flask import Blueprint, request, jsonify
from models import db, User, OTP, verify_and_clear_otp
from email_service import send_otp_email
import random
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/send-otp', methods=['POST'])
def handle_send_otp():
    data = request.json
    reg_number = data.get('registration_number')
    email = data.get('email')

    if not reg_number or not email:
        return jsonify({"error": "Registration number and email are required"}), 400

    if "@" not in email:
        return jsonify({"error": "Invalid email format"}), 400

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=5)
    
    # Save to db
    new_otp = OTP(email=email, code=otp_code, expires_at=expires)
    db.session.add(new_otp)
    db.session.commit()

    # Send email
    success = send_otp_email(email, otp_code)
    
    if success:
        return jsonify({"message": "OTP sent successfully"}), 200
    else:
        return jsonify({"error": "Failed to send email via SMTP. Check server logs."}), 500

@auth_bp.route('/verify-otp', methods=['POST'])
def handle_verify_otp():
    data = request.json
    reg_number = data.get('registration_number')
    email = data.get('email')
    code = data.get('otp')

    if not all([reg_number, email, code]):
        return jsonify({"error": "Missing required fields"}), 400

    is_valid = verify_and_clear_otp(email, code)

    if is_valid:
        # Auth successful, login or register user
        user = User.query.filter_by(registration_number=reg_number).first()
        
        # Check if email is already used by another account
        existing_email_user = User.query.filter_by(email=email).first()
        if existing_email_user and (not user or existing_email_user.id != user.id):
            return jsonify({"error": "This email is already associated with a different registration number."}), 400

        if not user:
            # Register them
            user = User(registration_number=reg_number, email=email)
            db.session.add(user)
            db.session.commit()
        else:
            if user.email != email:
                user.email = email
                db.session.commit()

        # Returning user details. In a real app, generate a JWT token here.
        return jsonify({"message": "Authentication successful", "user_id": user.id}), 200
    else:
        return jsonify({"error": "Invalid or expired OTP"}), 401
