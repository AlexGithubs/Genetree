from flask import Blueprint, request, jsonify
from models import db
from models.person import Person
from models.relationship import Relationship

relationships_bp = Blueprint('relationships', __name__, url_prefix='/api/relationships')

@relationships_bp.route('', methods=['GET'])
def get_all_relationships():
    relationships = Relationship.query.all()
    return jsonify([rel.to_dict() for rel in relationships])

@relationships_bp.route('/<int:relationship_id>', methods=['GET'])
def get_relationship(relationship_id):
    relationship = Relationship.query.get_or_404(relationship_id)
    return jsonify(relationship.to_dict())

@relationships_bp.route('', methods=['POST'])
def create_relationship():
    data = request.json
    
    # Validate required fields
    if not data or 'person1_id' not in data or 'person2_id' not in data or 'relationship_type' not in data:
        return jsonify({'error': 'Person IDs and relationship type are required'}), 400
    
    # Verify both persons exist
    person1 = Person.query.get(data['person1_id'])
    person2 = Person.query.get(data['person2_id'])
    
    if not person1 or not person2:
        return jsonify({'error': 'One or both persons do not exist'}), 404
    
    # Create the relationship
    new_relationship = Relationship(
        person1_id=data['person1_id'],
        person2_id=data['person2_id'],
        relationship_type=data['relationship_type'],
        description=data.get('description')
    )
    
    db.session.add(new_relationship)
    
    # For parent-child relationships, create the reciprocal relationship automatically
    if data['relationship_type'] == 'parent-child':
        # Add the reciprocal relationship (from child to parent)
        reciprocal = Relationship(
            person1_id=data['person2_id'],  # Child
            person2_id=data['person1_id'],  # Parent
            relationship_type='child-parent',
            description=data.get('description')
        )
        db.session.add(reciprocal)
    
    # For spouse relationships, create the reciprocal relationship automatically
    elif data['relationship_type'] == 'spouse':
        # Add the reciprocal relationship (spouse works both ways)
        reciprocal = Relationship(
            person1_id=data['person2_id'],
            person2_id=data['person1_id'],
            relationship_type='spouse',
            description=data.get('description')
        )
        db.session.add(reciprocal)
    
    # For sibling relationships, create the reciprocal relationship automatically
    elif data['relationship_type'] == 'sibling':
        # Add the reciprocal relationship (sibling works both ways)
        reciprocal = Relationship(
            person1_id=data['person2_id'],
            person2_id=data['person1_id'],
            relationship_type='sibling',
            description=data.get('description')
        )
        db.session.add(reciprocal)
    
    db.session.commit()
    return jsonify(new_relationship.to_dict()), 201

@relationships_bp.route('/<int:relationship_id>', methods=['PUT'])
def update_relationship(relationship_id):
    relationship = Relationship.query.get_or_404(relationship_id)
    data = request.json
    
    # Update fields
    if 'relationship_type' in data:
        relationship.relationship_type = data['relationship_type']
    if 'description' in data:
        relationship.description = data['description']
    
    db.session.commit()
    return jsonify(relationship.to_dict())

@relationships_bp.route('/<int:relationship_id>', methods=['DELETE'])
def delete_relationship(relationship_id):
    relationship = Relationship.query.get_or_404(relationship_id)
    
    # Find and delete reciprocal relationship if it exists
    reciprocal = Relationship.query.filter_by(
        person1_id=relationship.person2_id,
        person2_id=relationship.person1_id
    ).first()
    
    if reciprocal:
        db.session.delete(reciprocal)
    
    db.session.delete(relationship)
    db.session.commit()
    return '', 204

@relationships_bp.route('/person/<int:person_id>', methods=['GET'])
def get_person_relationships(person_id):
    # Get all relationships where this person is involved
    relationships = Relationship.query.filter(
        (Relationship.person1_id == person_id) | (Relationship.person2_id == person_id)
    ).all()
    
    return jsonify([rel.to_dict() for rel in relationships])