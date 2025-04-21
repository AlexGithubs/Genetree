from flask import Flask, jsonify, send_from_directory, request, abort
from flask_cors import CORS
import os
import json
import uuid
import shutil
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create flask app
app = Flask(__name__, static_folder='static')

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///family_tree.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov', 'webm', 'avi', 'mkv', 'mpeg', 'mpg'}
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload size

# Enable CORS properly
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize database
from models import db
db.init_app(app)

try:
    print("Registering blueprints...")
    from routes import members_bp, relationships_bp, family_tree_bp, tree_bp
    app.register_blueprint(members_bp)
    app.register_blueprint(relationships_bp)
    app.register_blueprint(family_tree_bp)
    app.register_blueprint(tree_bp)
    print("Blueprints registered successfully")
except Exception as e:
    print(f"ERROR registering blueprints: {str(e)}")
    # No fallback routes - if registration fails, application should fail to start

# Create tables
# In app.py, update the database creation part
with app.app_context():
    print("Dropping all tables...")
    db.drop_all()
    print("Creating all tables...")
    db.create_all()
    print("Database setup complete!")
    
    # Optional: Add a test person to verify it works
    from models.person import Person
    if Person.query.count() == 0:
        test_person = Person(
            first_name="Kid",
            last_name="1",
            gender="male"
        )
        db.session.add(test_person)
        db.session.commit()
        print("Added test person")
        test_person2 = Person(
            first_name="Parent",
            last_name="1",
            gender="male"
        )
        db.session.add(test_person2)
        db.session.commit()
        print("Added test person")
        test_person3 = Person(
            first_name="Parent",
            last_name="2",
            gender="female"
        )
        db.session.add(test_person3)
        db.session.commit()
        print("Added test person")
        test_person4 = Person(
            first_name="GrandParent",
            last_name="1",
            gender="male"
        )
        db.session.add(test_person4)
        db.session.commit()
        print("Added test person")
        test_person5 = Person(
            first_name="GrandParent",
            last_name="2",
            gender="female"
        )
        db.session.add(test_person5)
        db.session.commit()
        print("Added test person")
        test_person6 = Person(
            first_name="Kid",
            last_name="2",
            gender="female"
        )
        db.session.add(test_person6)
        db.session.commit()
        print("Added test person")
        test_person7 = Person(
            first_name="Great-GrandParent",
            last_name="1",
            gender="female"
        )
        db.session.add(test_person7)
        db.session.commit()
        print("Added test person")
        test_person8 = Person(
            first_name="Kid",
            last_name="3",
            gender="male"
        )
        db.session.add(test_person8)
        db.session.commit()
        print("Added test person")
        test_person9 = Person(
            first_name="Great-GrandParent",
            last_name="2",
            gender="male"
        )
        db.session.add(test_person9)
        db.session.commit()
        print("Added test person")
        
        # Add new people shown in the screenshot
        test_person10 = Person(
            first_name="Great-GrandParent",
            last_name="3",
            gender="male"
        )
        db.session.add(test_person10)
        db.session.commit()
        print("Added test person")
        
        test_person11 = Person(
            first_name="Great-GrandParent",
            last_name="4",
            gender="female"
        )
        db.session.add(test_person11)
        db.session.commit()
        print("Added test person")
        
        test_person12 = Person(
            first_name="Great-GrandParent",
            last_name="5",
            gender="male"
        )
        db.session.add(test_person12)
        db.session.commit()
        print("Added test person")
        
        test_person13 = Person(
            first_name="GrandParent",
            last_name="3",
            gender="male"
        )
        db.session.add(test_person13)
        db.session.commit()
        print("Added test person")
        
        test_person14 = Person(
            first_name="GrandParent",
            last_name="4",
            gender="female"
        )
        db.session.add(test_person14)
        db.session.commit()
        print("Added test person")
        
        test_person15 = Person(
            first_name="GrandParent",
            last_name="5",
            gender="male"
        )
        db.session.add(test_person15)
        db.session.commit()
        print("Added test person")
        
        test_person16 = Person(
            first_name="Parent",
            last_name="3",
            gender="male"
        )
        db.session.add(test_person16)
        db.session.commit()
        print("Added test person")
        
        test_person17 = Person(
            first_name="Kid",
            last_name="Spouse 1",
            gender="female"
        )
        db.session.add(test_person17)
        db.session.commit()
        print("Added test person")

        test_person18 = Person(
            first_name="Parent",
            last_name="4",
            gender="female"
        )
        db.session.add(test_person18)
        db.session.commit()
        print("Added test person")
        
        # Create test relationships to form a 3-generation family tree
        from models.relationship import Relationship
        
        # Great-Grandparents relationship (marriage)
        relationship1 = Relationship(
            person1_id=7,  # Great-GrandParent 1
            person2_id=9,  # Great-GrandParent 2
            relationship_type="spouse"
        )
        db.session.add(relationship1)
        
        # Great-Grandparents to Grandparents (parent-child)
        relationship2 = Relationship(
            person1_id=7,  # Great-GrandParent 1
            person2_id=4,  # GrandParent 1
            relationship_type="parent-child"
        )
        db.session.add(relationship2)
        relationship3 = Relationship(
            person1_id=9,  # Great-GrandParent 2
            person2_id=4,  # GrandParent 1
            relationship_type="parent-child"
        )
        db.session.add(relationship3)
        
        # Grandparents relationship (marriage)
        relationship4 = Relationship(
            person1_id=4,  # GrandParent 1
            person2_id=5,  # GrandParent 2
            relationship_type="spouse"
        )
        db.session.add(relationship4)
        
        # Grandparents to Parents (parent-child)
        relationship5 = Relationship(
            person1_id=4,  # GrandParent 1
            person2_id=2,  # Parent 1
            relationship_type="parent-child"
        )
        db.session.add(relationship5)
        relationship6 = Relationship(
            person1_id=5,  # GrandParent 2
            person2_id=2,  # Parent 1
            relationship_type="parent-child"
        )
        db.session.add(relationship6)
        
        # Parents relationship (marriage)
        relationship7 = Relationship(
            person1_id=2,  # Parent 1
            person2_id=3,  # Parent 2
            relationship_type="spouse"
        )
        db.session.add(relationship7)
        
        # Parents to Kids (parent-child)
        relationship8 = Relationship(
            person1_id=2,  # Parent 1
            person2_id=1,  # Kid 1
            relationship_type="parent-child"
        )
        db.session.add(relationship8)
        relationship9 = Relationship(
            person1_id=3,  # Parent 2
            person2_id=1,  # Kid 1
            relationship_type="parent-child"
        )
        db.session.add(relationship9)
        relationship10 = Relationship(
            person1_id=2,  # Parent 1
            person2_id=6,  # Kid 2
            relationship_type="parent-child"
        )
        db.session.add(relationship10)
        relationship11 = Relationship(
            person1_id=3,  # Parent 2
            person2_id=6,  # Kid 2
            relationship_type="parent-child"
        )
        db.session.add(relationship11)
        relationship12 = Relationship(
            person1_id=2,  # Parent 1
            person2_id=8,  # Kid 3
            relationship_type="parent-child"
        )
        db.session.add(relationship12)
        relationship13 = Relationship(
            person1_id=3,  # Parent 2
            person2_id=8,  # Kid 3
            relationship_type="parent-child"
        )
        db.session.add(relationship13)
        
        # Additional relationships from the screenshot:
        
        # Great-GrandParent 3 & 4 (spouse relationship)
        relationship14 = Relationship(
            person1_id=10,  # Great-GrandParent 3
            person2_id=11,  # Great-GrandParent 4
            relationship_type="spouse"
        )
        db.session.add(relationship14)
        
        # Great-GrandParent 3 & 4 to GrandParent 3 (parent-child)
        relationship15 = Relationship(
            person1_id=10,  # Great-GrandParent 3
            person2_id=13,  # GrandParent 3
            relationship_type="parent-child"
        )
        db.session.add(relationship15)
        relationship16 = Relationship(
            person1_id=11,  # Great-GrandParent 4
            person2_id=13,  # GrandParent 3
            relationship_type="parent-child"
        )
        db.session.add(relationship16)
        
        # Great-GrandParent 5 to GrandParent 4 (parent-child)
        relationship17 = Relationship(
            person1_id=12,  # Great-GrandParent 5
            person2_id=14,  # GrandParent 4
            relationship_type="parent-child"
        )
        db.session.add(relationship17)
        
        # GrandParent 3 & 4 (spouse relationship)
        relationship18 = Relationship(
            person1_id=13,  # GrandParent 3
            person2_id=14,  # GrandParent 4
            relationship_type="spouse"
        )
        db.session.add(relationship18)

        # GrandParent 3 to Parent 2 (parent-child)
        relationship19 = Relationship(
            person1_id=13,  # GrandParent 3
            person2_id=3,  # Parent 2
            relationship_type="parent-child"
        )
        db.session.add(relationship19)
        
        # Parent 3 to Kid Spouse 1 (parent-child)
        relationship20 = Relationship(
            person1_id=16,  # Parent 3
            person2_id=17,  # Kid Spouse 1
            relationship_type="parent-child"
        )
        db.session.add(relationship20)
        
        # Kid 1 and Kid Spouse 1 (spouse relationship)
        relationship21 = Relationship(
            person1_id=1,   # Kid 1
            person2_id=17,  # Kid Spouse 1
            relationship_type="spouse"
        )
        db.session.add(relationship21)
        
        # GrandParent 4 to Parent 2 (parent-child)
        relationship22 = Relationship(
            person1_id=14,  #GrandParent 4
            person2_id=3,  # Parent 2
            relationship_type="parent-child"
        )
        db.session.add(relationship22)

        # GrandParent 5 to Parent 3 (parent-child)
        relationship23 = Relationship(
            person1_id=15,  #GrandParent 5
            person2_id=16,  # Parent 3
            relationship_type="parent-child"
        )
        db.session.add(relationship23)

        # GrandParent 3 to Parent 4 (parent-child)
        relationship24 = Relationship(
            person1_id=13,  #GrandParent 3
            person2_id=18,  # Parent 4
            relationship_type="parent-child"
        )
        db.session.add(relationship24)

        # GrandParent 4 to Parent 4 (parent-child)
        relationship25 = Relationship(
            person1_id=14,  #GrandParent 4
            person2_id=18,  # Parent 4
            relationship_type="parent-child"
        )
        db.session.add(relationship25)

        # Commit all relationships
        db.session.commit()
        print("Added test relationships - completed family tree setup!")

# Create upload directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
logger.info(f"Upload directory set to: {app.config['UPLOAD_FOLDER']}")

# Check if uploads directory is writable and has content
try:
    if os.access(app.config['UPLOAD_FOLDER'], os.W_OK):
        logger.info("Upload directory is writable")
    else:
        logger.warning("Upload directory is not writable")
        
    files = os.listdir(app.config['UPLOAD_FOLDER'])
    logger.info(f"Files in upload directory: {len(files)}")
    if len(files) > 0:
        logger.info(f"Sample files: {files[:5] if len(files) > 5 else files}")
except Exception as e:
    logger.error(f"Error checking upload directory: {str(e)}")

@app.route('/api/debug')
def debug_info():
    try:
        from models.person import Person
        from sqlalchemy import inspect
        
        # Get all tables
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        # Get columns for each table
        schema_info = {}
        for table in tables:
            columns = inspector.get_columns(table)
            schema_info[table] = [column['name'] for column in columns]
        
        # Count records in Person table
        person_count = Person.query.count()
        
        return jsonify({
            "status": "success",
            "database_tables": tables,
            "schema": schema_info,
            "person_count": person_count
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# Serve frontend (SPA routing)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if not path or path == '/' or path == 'index.html':
        return send_from_directory('static', 'index.html')
    try:
        return send_from_directory('static', path)
    except:
        return send_from_directory('static', 'index.html')

# Serve uploaded files
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serve uploaded files"""
    try:
        # Security check to prevent directory traversal attacks
        requested_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.abspath(requested_path).startswith(os.path.abspath(app.config['UPLOAD_FOLDER'])):
            app.logger.error(f"Attempted directory traversal attack: {filename}")
            abort(403)  # Forbidden
            
        if not os.path.exists(requested_path):
            app.logger.error(f"File not found: {requested_path}")
            abort(404)  # Not found
            
        # Log successful file request
        app.logger.info(f"Serving file: {filename}")
        directory = os.path.dirname(requested_path)
        file_name = os.path.basename(requested_path)
        return send_from_directory(directory, file_name)
    except Exception as e:
        app.logger.error(f"Error serving file {filename}: {str(e)}")
        abort(500)  # Internal Server Error

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')