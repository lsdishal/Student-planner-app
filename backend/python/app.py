import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from models import db
from routes.auth import auth_bp
from routes.attendance import attendance_bp
from routes.planner import planner_bp
from routes.notes import notes_bp
from routes.materials import materials_bp
from routes.editor import editor_bp
from routes.pomodoro import pomodoro_bp
from routes.storage import storage_bp

def create_app():
    # Set frontend folder as static folder
    frontend_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', '..', 'frontend')
    )
    app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
    CORS(app)  # Enable CORS for frontend requests
    
    # Configure SQLite database
    basedir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(basedir, 'webos.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Secret key
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'super-secret-webos-key')

    # Storage Configuration
    upload_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    app.config['UPLOAD_FOLDER'] = upload_path
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(planner_bp, url_prefix='/api/planner')
    app.register_blueprint(notes_bp, url_prefix='/api/notes')
    app.register_blueprint(materials_bp, url_prefix='/api/materials')
    app.register_blueprint(editor_bp, url_prefix='/api/editor')
    app.register_blueprint(pomodoro_bp, url_prefix='/api/pomodoro')
    app.register_blueprint(storage_bp, url_prefix='/api/storage')

    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/login')
    def login_page():
        return send_from_directory(app.static_folder, 'login.html')

    with app.app_context():
        db.create_all()

    return app


if __name__ == '__main__':
    app = create_app()

    # Render-compatible configuration
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)