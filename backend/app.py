# backend/app.py
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from models import db
import routes
import os

app = Flask(__name__)

# Load configuration
app.config.from_object('config')

# Enable CORS for all routes
CORS(app)

# Initialize database
db.init_app(app)

# Create upload directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Register routes
app.register_blueprint(routes.members_bp)
app.register_blueprint(routes.relationships_bp)
app.register_blueprint(routes.family_tree_bp)

# Create tables - using app context approach for Flask 2.0+ compatibility
def create_tables():
    """Create database tables"""
    with app.app_context():
        db.create_all()

create_tables()

# Serve the static files for media
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(400)
def bad_request(error):
    """Handle 400 errors"""
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True)