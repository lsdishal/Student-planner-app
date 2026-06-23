import os
from dotenv import load_dotenv

# Load .env file from the same directory as this script
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

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
    # ✅ Set frontend folder
    frontend_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', '..', 'frontend')
    )

    app = Flask(__name__, static_folder=frontend_dir, static_url_path='')

    # ✅ Enable CORS (important for Netlify → Render communication)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # ✅ Database config (SQLite)
    basedir = os.path.abspath(os.path.dirname(__file__))
    
    # Render is read-only for app files. Store DB in /tmp when running on Render/production.
    if os.environ.get('RENDER'):
        db_path = '/tmp/webos.db'
    else:
        db_path = os.path.join(basedir, 'webos.db')

    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # ✅ Secret key
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'super-secret-webos-key')

    # ✅ File upload config
    upload_path = os.path.join(basedir, 'uploads')
    os.makedirs(upload_path, exist_ok=True)

    app.config['UPLOAD_FOLDER'] = upload_path
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

    db.init_app(app)

    # ✅ Register all API routes
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(planner_bp, url_prefix='/api/planner')
    app.register_blueprint(notes_bp, url_prefix='/api/notes')
    app.register_blueprint(materials_bp, url_prefix='/api/materials')
    app.register_blueprint(editor_bp, url_prefix='/api/editor')
    app.register_blueprint(pomodoro_bp, url_prefix='/api/pomodoro')
    app.register_blueprint(storage_bp, url_prefix='/api/storage')

    # ✅ Serve frontend pages properly
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/login')
    def login_page():
        return send_from_directory(app.static_folder, 'login.html')

    @app.route('/login.html')  # 🔥 IMPORTANT FIX
    def login_html():
        return send_from_directory(app.static_folder, 'login.html')

    # ✅ Create DB tables
    with app.app_context():
        db.create_all()

    return app


# ✅ Render-compatible run
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)