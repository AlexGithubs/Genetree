from models.person import Person
from models.relationship import Relationship

class TreeService:
    @staticmethod
    def get_full_tree():
        """Get the entire family tree data"""
        # Fetch all persons
        persons = Person.query.all()
        
        # Fetch all relationships
        relationships = Relationship.query.all()
        
        # Format data for the tree visualization
        tree_data = {
            'nodes': [TreeService.create_node(person) for person in persons],
            'links': [TreeService.create_link(rel) for rel in relationships]
        }
        
        return tree_data
    
    @staticmethod
    def get_tree_from_root(person_id):
        """Get family tree starting from a root person"""
        # Verify the person exists
        root_person = Person.query.get(person_id)
        
        if not root_person:
            raise ValueError(f"Person with ID {person_id} not found")
        
        # Build tree data recursively
        tree_data = TreeService.build_tree_from_root(root_person)
        
        return tree_data
    
    @staticmethod
    def create_node(person):
        """Create a node representation for a person"""
        return {
            'id': person.id,
            'name': f"{person.first_name} {person.last_name}",
            'gender': person.gender,
            'birth_date': person.birth_date.isoformat() if person.birth_date else None,
            'death_date': person.death_date.isoformat() if person.death_date else None,
            'has_profile': True  # Indicates this person has a detailed profile
        }
    
    @staticmethod
    def create_link(relationship):
        """Create a link representation for a relationship"""
        return {
            'source': relationship.person1_id,
            'target': relationship.person2_id,
            'type': relationship.relationship_type
        }
    
    @staticmethod
    def build_tree_from_root(root_person, max_depth=3, current_depth=0, visited=None):
        """
        Recursively build a family tree starting from a root person.
        
        Args:
            root_person: The Person object to start from
            max_depth: Maximum depth to traverse (prevent infinite recursion)
            current_depth: Current depth in the recursion
            visited: Set of visited person IDs to prevent cycles
        
        Returns:
            Dict with nodes and links representing the family tree
        """
        if visited is None:
            visited = set()
        
        if current_depth > max_depth or root_person.id in visited:
            return {'nodes': [], 'links': []}
        
        visited.add(root_person.id)
        
        # Start with the root node
        nodes = [TreeService.create_node(root_person)]
        links = []
        
        # Get all relationships for this person
        relationships = Relationship.query.filter(
            (Relationship.person1_id == root_person.id) | (Relationship.person2_id == root_person.id)
        ).all()
        
        for rel in relationships:
            # Determine the other person in this relationship
            other_person_id = rel.person2_id if rel.person1_id == root_person.id else rel.person1_id
            other_person = Person.query.get(other_person_id)
            
            if other_person and other_person.id not in visited:
                # Add link between root and other person
                links.append(TreeService.create_link(rel))
                
                # Recursively get the subtree for the other person
                subtree = TreeService.build_tree_from_root(other_person, max_depth, current_depth + 1, visited)
                
                # Add subtree nodes and links
                nodes.extend(subtree['nodes'])
                links.extend(subtree['links'])
        
        return {'nodes': nodes, 'links': links}