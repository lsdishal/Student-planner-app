from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    registration_number = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.relationship('StudyNote', backref='owner', lazy=True)
    materials = db.relationship('StudyMaterial', backref='owner', lazy=True)
    files = db.relationship('EditorFile', backref='owner', lazy=True)
    sessions = db.relationship('PomodoroSession', backref='owner', lazy=True)
    tasks = db.relationship('PlannerTask', backref='owner', lazy=True)

class StudyNote(db.Model):
    __tablename__ = 'study_notes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    semester = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class StudyMaterial(db.Model):
    __tablename__ = 'study_materials'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    semester = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), default='note') # pdf, note, doc
    content = db.Column(db.Text, nullable=True)
    is_file = db.Column(db.Boolean, default=False)
    file_path = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class EditorFile(db.Model):
    __tablename__ = 'editor_files'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(20), default='txt')
    last_modified = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PomodoroSession(db.Model):
    __tablename__ = 'pomodoro_sessions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(20), nullable=False) # focus, break
    duration = db.Column(db.Integer, nullable=False) # in minutes
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class PlannerTask(db.Model):
    __tablename__ = 'planner_tasks'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    text = db.Column(db.String(200), nullable=False)
    priority = db.Column(db.String(20), default='Medium') # High, Medium, Low
    category = db.Column(db.String(50), nullable=True) # #DSA, #Exam etc
    due_date = db.Column(db.DateTime, nullable=True)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class OTP(db.Model):
    __tablename__ = 'otps'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

    def is_valid(self):
        return datetime.utcnow() <= self.expires_at

def verify_and_clear_otp(email, code):
    otps = OTP.query.filter_by(email=email).order_by(OTP.created_at.desc()).all()
    if not otps:
        return False
    # Check the latest one
    latest_otp = otps[0]
    if latest_otp.code == code and latest_otp.is_valid():
        # Clear old OTPs for this email to prevent reuse
        OTP.query.filter_by(email=email).delete()
        db.session.commit()
        return True
    return False
