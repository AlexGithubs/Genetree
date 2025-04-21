# routes/members.py (modified to use services and utils)
from flask import Blueprint, request, jsonify, current_app
from services.member_service import MemberService
from models.person import Person
from utils.validators import validate_member_data, validate_media_upload
from services.tree_service import TreeService

members_bp = Blueprint('members', __name__, url_prefix='/api/members')

@members_bp.route('', methods=['GET'])
def get_all_members():
    try:
        members = Person.query.all()
        return jsonify([member.to_dict() for member in members])
    except Exception as e:
        print(f"ERROR in get_all_members: {str(e)}")
        return jsonify({"error": str(e)}), 500

@members_bp.route('/<int:member_id>', methods=['GET'])
def get_member(member_id):
    member = MemberService.get_member_by_id(member_id)
    if not member:
        return jsonify({'error': 'Member not found'}), 404
    return jsonify(member.to_dict())

@members_bp.route('', methods=['POST'])
def create_member():
    data = request.json
    
    # Validate input data
    is_valid, errors = validate_member_data(data)
    if not is_valid:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400
    
    try:
        new_person = MemberService.create_member(data)
        return jsonify(new_person.to_dict()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@members_bp.route('/<int:member_id>', methods=['PUT'])
def update_member(member_id):
    data = request.json
    
    # Validate input data
    is_valid, errors = validate_member_data(data, is_update=True)
    if not is_valid:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400
    
    try:
        member = MemberService.update_member(member_id, data)
        return jsonify(member.to_dict())
    except ValueError as e:
        return jsonify({'error': str(e)}), 404

@members_bp.route('/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    try:
        MemberService.delete_member(member_id)
        return '', 204
    except ValueError as e:
        return jsonify({'error': str(e)}), 404

@members_bp.route('/<int:member_id>/media', methods=['POST'])
def upload_media(member_id):
    # Validate file upload
    is_valid, errors, file = validate_media_upload(
        request, 
        current_app.config['ALLOWED_EXTENSIONS']
    )
    
    if not is_valid:
        return jsonify({'error': errors[0]}), 400
    
    try:
        title = request.form.get('title', '')
        description = request.form.get('description', '')
        
        new_media = MemberService.save_media(member_id, file, title, description)
        return jsonify(new_media.to_dict()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 404

@members_bp.route('/<int:member_id>/media/<int:media_id>', methods=['DELETE'])
def delete_media(member_id, media_id):
    try:
        MemberService.delete_media(media_id, member_id)
        return '', 204
    except ValueError as e:
        return jsonify({'error': str(e)}), 404

# routes/relationships.py (modified to use services and utils)
from flask import Blueprint, request, jsonify
from services.relationship_service import RelationshipService
from utils.validators import validate_relationship_data

relationships_bp = Blueprint('relationships', __name__, url_prefix='/api/relationships')

@relationships_bp.route('', methods=['GET'])
def get_all_relationships():
    relationships = RelationshipService.get_all_relationships()
    return jsonify([rel.to_dict() for rel in relationships])

@relationships_bp.route('/<int:relationship_id>', methods=['GET'])
def get_relationship(relationship_id):
    relationship = RelationshipService.get_relationship_by_id(relationship_id)
    if not relationship:
        return jsonify({'error': 'Relationship not found'}), 404
    return jsonify(relationship.to_dict())

@relationships_bp.route('', methods=['POST'])
def create_relationship():
    data = request.json
    
    # Validate input data
    is_valid, errors = validate_relationship_data(data)
    if not is_valid:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400
    
    try:
        new_relationship = RelationshipService.create_relationship(data)
        return jsonify(new_relationship.to_dict()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@relationships_bp.route('/<int:relationship_id>', methods=['PUT'])
def update_relationship(relationship_id):
    data = request.json
    
    try:
        relationship = RelationshipService.update_relationship(relationship_id, data)
        return jsonify(relationship.to_dict())
    except ValueError as e:
        return jsonify({'error': str(e)}), 404

@relationships_bp.route('/<int:relationship_id>', methods=['DELETE'])
def delete_relationship(relationship_id):
    try:
        RelationshipService.delete_relationship(relationship_id)
        return '', 204
    except ValueError as e:
        return jsonify({'error': str(e)}), 404

@relationships_bp.route('/person/<int:person_id>', methods=['GET'])
def get_person_relationships(person_id):
    relationships = RelationshipService.get_person_relationships(person_id)
    return jsonify([rel.to_dict() for rel in relationships])

# routes/family_tree.py (modified to use services)
from flask import Blueprint, jsonify
from services.tree_service import TreeService

family_tree_bp = Blueprint('family_tree', __name__, url_prefix='/api/family_tree')

@family_tree_bp.route('/tree', methods=['GET'])
def get_family_tree():
    print("DEBUG: members/tree route called")
    
    # Check if a root person is specified
    person_id_str = request.args.get('person_id')
    
    try:
        if person_id_str:
            person_id = int(person_id_str)
            print(f"DEBUG: Getting tree for person ID: {person_id}")
            tree_data = TreeService.get_tree_from_root(person_id)
            print(f"DEBUG: Tree data returned with {len(tree_data['nodes'])} nodes and {len(tree_data['links'])} links")
        else:
            print("DEBUG: Getting full tree from members route")
            tree_data = TreeService.get_full_tree()
            print(f"DEBUG: Full tree data returned with {len(tree_data['nodes'])} nodes and {len(tree_data['links'])} links")
        
        return jsonify(tree_data)
    except Exception as e:
        print(f"ERROR: Failed to get family tree: {str(e)}")
        return jsonify({'error': str(e)}), 500

@family_tree_bp.route('/root/<int:person_id>', methods=['GET'])
def get_family_tree_from_root(person_id):
    try:
        tree_data = TreeService.get_tree_from_root(person_id)
        return jsonify(tree_data)
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500