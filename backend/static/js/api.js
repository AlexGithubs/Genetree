/**
 * API service for communicating with the backend
 */
class ApiService {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
    }
    
    // Generic fetch method with error handling
    async fetchApi(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            
            // For non-2xx responses
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
            }
            
            // For 204 No Content
            if (response.status === 204) {
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    // GET methods
    async getAllMembers() {
        return this.fetchApi('/members');
    }
    
    async getMember(id) {
        return this.fetchApi(`/members/${id}`);
    }
    
    async getAllRelationships() {
        return this.fetchApi('/relationships');
    }
    
    async getRelationship(id) {
        return this.fetchApi(`/relationships/${id}`);
    }
    
    async getPersonRelationships(personId) {
        return this.fetchApi(`/relationships/person/${personId}`);
    }
    
    async getFamilyTree() {
        return this.fetchApi('/tree');
    }
    
    async getFamilyTreeFromRoot(personId) {
        console.log(`DEBUG: API calling /tree?root_id=${personId}`);
        return this.fetchApi(`/tree?root_id=${personId}`);
    }
    
    // POST methods
    async createMember(memberData) {
        return this.fetchApi('/members', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(memberData)
        });
    }
    
    async createRelationship(relationshipData) {
        return this.fetchApi('/relationships', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(relationshipData)
        });
    }
    
    async uploadMedia(personId, formData) {
        return this.fetchApi(`/members/${personId}/media`, {
            method: 'POST',
            body: formData
            // Don't set Content-Type header, it will be set automatically with boundary
        });
    }
    
    // PUT methods
    async updateMember(id, memberData) {
        return this.fetchApi(`/members/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(memberData)
        });
    }
    
    async updateRelationship(id, relationshipData) {
        return this.fetchApi(`/relationships/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(relationshipData)
        });
    }
    
    // DELETE methods
    async deleteMember(id) {
        return this.fetchApi(`/members/${id}`, {
            method: 'DELETE'
        });
    }
    
    async deleteRelationship(id) {
        console.log(`DEBUG: API deleting relationship ID: ${id}`);
        return this.fetchApi(`/relationships/${id}`, {
            method: 'DELETE'
        });
    }
    
    async deleteMedia(personId, mediaId) {
        return this.fetchApi(`/members/${personId}/media/${mediaId}`, {
            method: 'DELETE'
        });
    }
}

// Create a single instance for the application
const api = new ApiService();