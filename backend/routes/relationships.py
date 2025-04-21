from flask import Blueprint, request, jsonify
from models import db
from models.person import Person
from models.relationship import Relationship
from services.relationship_service import RelationshipService

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
    """Delete a specific relationship by its ID and its reciprocal."""
    print(f"DEBUG: DELETE /api/relationships/{relationship_id} called")
    
    relationship = Relationship.query.get(relationship_id)
    
    if not relationship:
        print(f"ERROR: Relationship with ID {relationship_id} not found for deletion.")
        return jsonify({'error': 'Relationship not found'}), 404
        
    try:
        # Find the reciprocal relationship
        # Note: For parent/child, the types are swapped
        reciprocal_type = relationship.relationship_type
        if relationship.relationship_type == 'parent-child':
            reciprocal_type = 'child-parent'
        elif relationship.relationship_type == 'child-parent':
            reciprocal_type = 'parent-child'
            
        reciprocal = Relationship.query.filter_by(
            person1_id=relationship.person2_id,
            person2_id=relationship.person1_id,
            relationship_type=reciprocal_type
        ).first()

        # Delete the main relationship
        db.session.delete(relationship)
        print(f"DEBUG: Marked relationship ID {relationship_id} for deletion.")

        # Delete the reciprocal if found
        if reciprocal:
            db.session.delete(reciprocal)
            print(f"DEBUG: Marked reciprocal relationship ID {reciprocal.id} for deletion.")
        else:
            print(f"DEBUG: No reciprocal relationship found for {relationship_id}.")

        db.session.commit()
        print(f"DEBUG: Successfully committed deletion for relationship {relationship_id} (and reciprocal if existed).")
        
        # Return 204 No Content on successful deletion
        return '', 204
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: Failed to delete relationship ID {relationship_id} and/or reciprocal: {str(e)}")
        return jsonify({'error': f'Failed to delete relationship: {str(e)}'}), 500

@relationships_bp.route('/person/<int:person_id>', methods=['GET'])
def get_person_relationships(person_id):
    try:
        # Use the service to get relationships for consistency
        relationships = RelationshipService.get_person_relationships(person_id)
        
        # Create a set to track unique relationship signatures to prevent duplicates
        unique_relationships = {}
        
        for rel in relationships:
            # Create a unique key for each relationship
            other_id = rel.person2_id if rel.person1_id == person_id else rel.person1_id
            rel_type = rel.relationship_type
            
            # Normalize relationship types for consistency
            if rel_type == 'parent-child' and rel.person1_id == person_id:
                normalized_type = 'parent-child'
            elif rel_type == 'parent-child' and rel.person2_id == person_id:
                normalized_type = 'child-parent'
            elif rel_type == 'child-parent' and rel.person1_id == person_id:
                normalized_type = 'child-parent'
            elif rel_type == 'child-parent' and rel.person2_id == person_id:
                normalized_type = 'parent-child'
            else:
                normalized_type = rel_type
            
            # Create a unique key based on other person ID and normalized relationship type
            key = f"{other_id}:{normalized_type}"
            
            # Only keep one relationship record for each unique combination
            if key not in unique_relationships:
                unique_relationships[key] = rel
        
        # Return only unique relationships
        return jsonify([rel.to_dict() for rel in unique_relationships.values()])
    except Exception as e:
        return jsonify({"error": str(e)}), 500