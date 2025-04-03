/**
 * Profiles management class
 */
class ProfilesManager {
    constructor() {
        this.currentMemberId = null;
        this.profileContainer = document.getElementById('profile-container');
        
        // Attach event listeners
        document.getElementById('close-profile').addEventListener('click', () => this.closeProfile());
        document.getElementById('edit-profile-btn').addEventListener('click', () => this.showEditProfileModal());
        document.getElementById('delete-profile-btn').addEventListener('click', () => this.deleteMember());
        document.getElementById('upload-photo-btn').addEventListener('click', () => this.showMediaModal('photo'));
        document.getElementById('upload-media-btn').addEventListener('click', () => this.showMediaModal());
        
        // Member modal events
        document.getElementById('member-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMember();
        });
        
        document.getElementById('add-field-btn').addEventListener('click', () => this.addCustomField());
        
        // Media modal events
        document.getElementById('media-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadMedia();
        });
    }
    
    /**
     * Load and display member profile
     */
    async loadProfile(memberId) {
        try {
            const member = await api.getMember(memberId);
            this.currentMemberId = memberId;
            this.displayProfile(member);
            
            // Load relationships
            this.loadRelationships(memberId);
            
            // Show the profile container
            this.profileContainer.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading profile:', error);
            alert(`Error loading profile: ${error.message}`);
        }
    }
    
    /**
     * Display profile data in the UI
     */
    displayProfile(member) {
        // Set basic information
        document.getElementById('profile-name').textContent = `${member.first_name} ${member.last_name}`;
        
        // Format dates
        let dateText = '';
        if (member.birth_date) {
            dateText += `Born: ${this.formatDate(member.birth_date)}`;
        }
        if (member.death_date) {
            dateText += ` · Died: ${this.formatDate(member.death_date)}`;
        }
        document.getElementById('profile-dates').textContent = dateText;
        
        // Set biography
        document.getElementById('profile-biography').textContent = member.biography || 'No biography provided.';
        
        // Display custom fields
        const customFieldsContainer = document.getElementById('custom-fields-container');
        customFieldsContainer.innerHTML = '';
        
        if (member.custom_fields && member.custom_fields.length > 0) {
            member.custom_fields.forEach(field => {
                const fieldElement = document.createElement('div');
                fieldElement.className = 'custom-field';
                
                const fieldName = document.createElement('div');
                fieldName.className = 'field-name';
                fieldName.textContent = field.field_name;
                
                const fieldValue = document.createElement('div');
                fieldValue.className = 'field-value';
                fieldValue.textContent = field.field_value || '';
                
                fieldElement.appendChild(fieldName);
                fieldElement.appendChild(fieldValue);
                customFieldsContainer.appendChild(fieldElement);
            });
        } else {
            customFieldsContainer.innerHTML = '<p>No custom fields added.</p>';
        }
        
        // Display media
        this.displayMedia(member.media || []);
    }
    
    /**
     * Display media gallery
     */
    displayMedia(mediaArray) {
        const photosContainer = document.getElementById('photos-container');
        const videosContainer = document.getElementById('videos-container');
        
        photosContainer.innerHTML = '';
        videosContainer.innerHTML = '';
        
        // Group media by type
        const photos = mediaArray.filter(media => media.media_type === 'photo');
        const videos = mediaArray.filter(media => media.media_type === 'video');
        
        // Display photos
        if (photos.length > 0) {
            photos.forEach(photo => {
                const photoElement = this.createMediaElement(photo, 'photo');
                photosContainer.appendChild(photoElement);
            });
        } else {
            photosContainer.innerHTML = '<p>No photos added.</p>';
        }
        
        // Display videos
        if (videos.length > 0) {
            videos.forEach(video => {
                const videoElement = this.createMediaElement(video, 'video');
                videosContainer.appendChild(videoElement);
            });
        } else {
            videosContainer.innerHTML = '<p>No videos added.</p>';
        }
        
        // Set profile image to first photo if available
        const profileImage = document.getElementById('profile-image');
        if (photos.length > 0) {
            profileImage.src = `/uploads/${photos[0].file_path}`;
        } else {
            profileImage.src = 'assets/default-profile.png';
        }
    }
    
    /**
     * Create media element (photo or video)
     */
    createMediaElement(media, type) {
        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item';
        mediaElement.title = media.title || '';
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'media-delete';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteMedia(media.id);
        });
        
        // Create media content
        if (type === 'photo') {
            const img = document.createElement('img');
            img.src = `/uploads/${media.file_path}`;
            img.alt = media.title || 'Photo';
            mediaElement.appendChild(img);
        } else {
            const video = document.createElement('video');
            video.src = `/uploads/${media.file_path}`;
            video.addEventListener('click', () => {
                video.play();
            });
            mediaElement.appendChild(video);
            
            // Add video indicator
            const indicator = document.createElement('div');
            indicator.className = 'video-indicator';
            indicator.textContent = 'Video';
            mediaElement.appendChild(indicator);
        }
        
        mediaElement.appendChild(deleteBtn);
        return mediaElement;
    }
    
    /**
     * Load relationships for a member
     */
    async loadRelationships(memberId) {
        try {
            const relationships = await api.getPersonRelationships(memberId);
            const container = document.getElementById('relationships-container');
            container.innerHTML = '';
            
            // Group relationships by type
            const relationshipsByType = {
                'parent-child': [],
                'child-parent': [],
                'spouse': [],
                'sibling': [],
                'other': []
            };
            
            // Fill in relationships
            for (const rel of relationships) {
                const otherId = rel.person1_id === memberId ? rel.person2_id : rel.person1_id;
                const otherPerson = await api.getMember(otherId);
                
                relationshipsByType[rel.relationship_type].push({
                    id: rel.id,
                    type: rel.relationship_type,
                    person: otherPerson
                });
            }
            
            // Display relationships
            if (Object.values(relationshipsByType).flat().length === 0) {
                container.innerHTML = '<p>No relationships defined.</p>';
                return;
            }
            
            // Parents
            if (relationshipsByType['child-parent'].length > 0) {
                this.addRelationshipSection(container, 'Parents', relationshipsByType['child-parent']);
            }
            
            // Children
            if (relationshipsByType['parent-child'].length > 0) {
                this.addRelationshipSection(container, 'Children', relationshipsByType['parent-child']);
            }
            
            // Spouses
            if (relationshipsByType['spouse'].length > 0) {
                this.addRelationshipSection(container, 'Spouses', relationshipsByType['spouse']);
            }
            
            // Siblings
            if (relationshipsByType['sibling'].length > 0) {
                this.addRelationshipSection(container, 'Siblings', relationshipsByType['sibling']);
            }
            
            // Other relationships
            if (relationshipsByType['other'].length > 0) {
                this.addRelationshipSection(container, 'Other Relationships', relationshipsByType['other']);
            }
        } catch (error) {
            console.error('Error loading relationships:', error);
        }
    }
    
    /**
     * Add relationship section to container
     */
    addRelationshipSection(container, title, relationships) {
        const section = document.createElement('div');
        section.className = 'relationship-section';
        
        const sectionTitle = document.createElement('h4');
        sectionTitle.textContent = title;
        section.appendChild(sectionTitle);
        
        relationships.forEach(rel => {
            const relItem = document.createElement('div');
            relItem.className = 'relationship-item';
            
            const personLink = document.createElement('a');
            personLink.href = '#';
            personLink.textContent = `${rel.person.first_name} ${rel.person.last_name}`;
            personLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadProfile(rel.person.id);
            });
            
            relItem.appendChild(personLink);
            section.appendChild(relItem);
        });
        
        container.appendChild(section);
    }
    
    /**
     * Show edit profile modal
     */
    showEditProfileModal() {
        if (!this.currentMemberId) return;
        
        // Get member data
        api.getMember(this.currentMemberId).then(member => {
            // Set form title
            document.getElementById('member-modal-title').textContent = 'Edit Family Member';
            
            // Populate form fields
            document.getElementById('member-id').value = member.id;
            document.getElementById('first-name').value = member.first_name;
            document.getElementById('last-name').value = member.last_name;
            document.getElementById('gender').value = member.gender || 'unknown';
            document.getElementById('birth-date').value = member.birth_date ? member.birth_date.split('T')[0] : '';
            document.getElementById('death-date').value = member.death_date ? member.death_date.split('T')[0] : '';
            document.getElementById('biography').value = member.biography || '';
            
            // Clear custom fields
            const customFieldsEditor = document.getElementById('custom-fields-editor');
            customFieldsEditor.innerHTML = '';
            
            // Add existing custom fields
            if (member.custom_fields && member.custom_fields.length > 0) {
                member.custom_fields.forEach(field => {
                    this.addCustomField(field.field_name, field.field_value);
                });
            }
            
            // Show the modal
            document.getElementById('member-modal').classList.remove('hidden');
        }).catch(error => {
            console.error('Error loading member data:', error);
            alert(`Error loading member data: ${error.message}`);
        });
    }
    
    /**
     * Show add media modal
     */
    showMediaModal(type = null) {
        if (!this.currentMemberId) return;
        
        // Set hidden member ID
        document.getElementById('media-person-id').value = this.currentMemberId;
        
        // Clear form
        document.getElementById('media-file').value = '';
        document.getElementById('media-title').value = '';
        document.getElementById('media-description').value = '';
        
        // Adjust accept attribute based on media type
        if (type === 'photo') {
            document.getElementById('media-file').accept = 'image/*';
        } else {
            document.getElementById('media-file').accept = 'image/*,video/*';
        }
        
        // Show the modal
        document.getElementById('media-modal').classList.remove('hidden');
    }
    
    /**
     * Add a custom field to the form
     */
    addCustomField(name = '', value = '') {
        const customFieldsEditor = document.getElementById('custom-fields-editor');
        
        const fieldRow = document.createElement('div');
        fieldRow.className = 'custom-field-row';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Field Name';
        nameInput.className = 'field-name-input';
        nameInput.value = name;
        
        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.placeholder = 'Field Value';
        valueInput.className = 'field-value-input';
        valueInput.value = value;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', () => {
            fieldRow.remove();
        });
        
        fieldRow.appendChild(nameInput);
        fieldRow.appendChild(valueInput);
        fieldRow.appendChild(deleteBtn);
        
        customFieldsEditor.appendChild(fieldRow);
    }
    
    /**
     * Save member data
     */
    async saveMember() {
        const form = document.getElementById('member-form');
        const memberId = document.getElementById('member-id').value;
        
        // Gather form data
        const memberData = {
            first_name: document.getElementById('first-name').value,
            last_name: document.getElementById('last-name').value,
            gender: document.getElementById('gender').value,
            biography: document.getElementById('biography').value,
            custom_fields: []
        };
        
        // Handle dates
        const birthDate = document.getElementById('birth-date').value;
        const deathDate = document.getElementById('death-date').value;
        
        if (birthDate) {
            memberData.birth_date = birthDate;
        }
        
        if (deathDate) {
            memberData.death_date = deathDate;
        }
        
        // Gather custom fields
        const fieldRows = document.querySelectorAll('#custom-fields-editor .custom-field-row');
        fieldRows.forEach(row => {
            const fieldName = row.querySelector('.field-name-input').value.trim();
            const fieldValue = row.querySelector('.field-value-input').value.trim();
            
            if (fieldName) {
                memberData.custom_fields.push({
                    field_name: fieldName,
                    field_value: fieldValue
                });
            }
        });
        
        try {
            let member;
            
            // Update or create
            if (memberId) {
                member = await api.updateMember(memberId, memberData);
            } else {
                member = await api.createMember(memberData);
                this.currentMemberId = member.id;
            }
            
            // Hide modal
            document.getElementById('member-modal').classList.add('hidden');
            
            // Refresh profile
            this.loadProfile(member.id);
            
            // Refresh tree visualization
            if (window.familyTree) {
                window.familyTree.loadData();
                window.updateMemberSelector();
            }
        } catch (error) {
            console.error('Error saving member:', error);
            alert(`Error saving member: ${error.message}`);
        }
    }
    
    /**
     * Delete a member
     */
    async deleteMember() {
        if (!this.currentMemberId) return;
        
        if (!confirm('Are you sure you want to delete this family member? This action cannot be undone.')) {
            return;
        }
        
        try {
            await api.deleteMember(this.currentMemberId);
            
            // Close profile
            this.closeProfile();
            
            // Refresh tree visualization
            if (window.familyTree) {
                window.familyTree.loadData();
                window.updateMemberSelector();
            }
            
            alert('Family member deleted successfully.');
        } catch (error) {
            console.error('Error deleting member:', error);
            alert(`Error deleting member: ${error.message}`);
        }
    }
    
    /**
     * Upload media
     */
    async uploadMedia() {
        const form = document.getElementById('media-form');
        const personId = document.getElementById('media-person-id').value;
        const fileInput = document.getElementById('media-file');
        
        if (!fileInput.files || !fileInput.files[0]) {
            alert('Please select a file to upload.');
            return;
        }
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('title', document.getElementById('media-title').value);
        formData.append('description', document.getElementById('media-description').value);
        
        try {
            await api.uploadMedia(personId, formData);
            
            // Hide modal
            document.getElementById('media-modal').classList.add('hidden');
            
            // Refresh profile
            this.loadProfile(personId);
        } catch (error) {
            console.error('Error uploading media:', error);
            alert(`Error uploading media: ${error.message}`);
        }
    }
    
    /**
     * Delete media
     */
    async deleteMedia(mediaId) {
        if (!this.currentMemberId || !mediaId) return;
        
        if (!confirm('Are you sure you want to delete this media?')) {
            return;
        }
        
        try {
            await api.deleteMedia(this.currentMemberId, mediaId);
            
            // Refresh profile
            this.loadProfile(this.currentMemberId);
        } catch (error) {
            console.error('Error deleting media:', error);
            alert(`Error deleting media: ${error.message}`);
        }
    }
    
    /**
     * Close profile
     */
    closeProfile() {
        this.profileContainer.classList.add('hidden');
        this.currentMemberId = null;
    }
    
    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}