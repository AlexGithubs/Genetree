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
        console.log("DEBUG: Loading profile for member ID:", memberId);
        
        if (!memberId) {
            console.error("ERROR: Attempted to load profile with invalid ID:", memberId);
            alert("Invalid member ID. Cannot load profile.");
            return;
        }
        
        try {
            // Clear any existing profile data
            document.getElementById('profile-name').textContent = "Loading...";
            document.getElementById('profile-dates').textContent = "";
            document.getElementById('profile-biography').textContent = "";
            
            // Clear profile image while loading
            const profileImage = document.getElementById('profile-image');
            if (profileImage) {
                profileImage.src = '';
                profileImage.classList.remove('loaded');
            }
            
            // Load member data from API
            const member = await api.getMember(memberId);
            console.log("DEBUG: Member data loaded:", member);
            
            // Store current member ID
            this.currentMemberId = memberId;
            
            // Display member profile data
            this.displayProfile(member);
            
            // Load relationships
            this.loadRelationships(memberId);
            
            // Show the profile container
            this.profileContainer.classList.remove('hidden');
            
            // After profile is loaded, also load media categories
            if (window.mediaCategoryManager) {
                window.mediaCategoryManager.loadCategories(memberId);
            }
            
            // Load timeline events for this member
            if (window.timelineManager) {
                window.timelineManager.loadEvents(memberId);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            alert(`Error loading profile: ${error.message || 'Unknown error'}`);
        }
    }
    
    /**
     * Display profile data in the UI
     */
    displayProfile(member) {
        console.log("DEBUG: Displaying profile for member:", member.id);
        
        if (!member) return;
        
        // Set member ID for later reference
        document.getElementById('profile-name').textContent = `${member.first_name} ${member.last_name}`;
        
        // Format dates if available
        let datesText = '';
        if (member.birth_date) {
            datesText += `Born: ${this.formatDate(member.birth_date)}`;
        }
        if (member.death_date) {
            datesText += datesText ? ' | ' : '';
            datesText += `Died: ${this.formatDate(member.death_date)}`;
        }
        document.getElementById('profile-dates').textContent = datesText;
        
        // Set biography
        document.getElementById('profile-biography').textContent = member.biography || 'No biography provided.';
        
        // Check if there's a saved profile photo ID in localStorage
        let savedProfilePhotoId = localStorage.getItem(`profilePhoto_${member.id}`);
        
        // Call displayProfilePhoto with the member and the saved profile photo ID
        this.displayProfilePhoto(member.id, member.media || []);
        
        // Display media
        this.displayMedia(member.media || []);
    }
    
    /**
     * Display media gallery
     */
    displayMedia(mediaArray) {
        console.log("DEBUG: displayMedia called with", mediaArray ? mediaArray.length : 0, "items");
        
        // Log first item to see structure
        if (mediaArray && mediaArray.length > 0) {
            console.log("DEBUG: First media item:", JSON.stringify(mediaArray[0]));
        }
        
        const photosContainer = document.getElementById('photos-container');
        const videosContainer = document.getElementById('videos-container');
        
        if (!photosContainer || !videosContainer) {
            console.error("ERROR: Could not find media containers");
            return;
        }
        
        // Clear containers
        photosContainer.innerHTML = '';
        videosContainer.innerHTML = '';
        
        if (!mediaArray || !Array.isArray(mediaArray)) {
            console.log("DEBUG: No media array provided");
            photosContainer.innerHTML = '<p>No photos added.</p>';
            videosContainer.innerHTML = '<p>No videos added.</p>';
            return;
        }
        
        // Filter out items without file_path
        const validMedia = mediaArray.filter(media => media && media.file_path);
        console.log("DEBUG: Valid media items with file_path:", validMedia.length);
        
        // Create a map to de-duplicate media by file_path
        const uniqueMedia = new Map();
        
        // First pass: Index by file_path to eliminate exact duplicates
        validMedia.forEach(media => {
            if (media.file_path && !uniqueMedia.has(media.file_path)) {
                uniqueMedia.set(media.file_path, media);
            }
        });
        
        console.log(`DEBUG: De-duplicated to ${uniqueMedia.size} unique media items`);
        
        // Group media by type - check both media_type and type properties
        const photos = Array.from(uniqueMedia.values()).filter(media => 
            media.media_type === 'photo' || media.type === 'photo'
        );
        
        const videos = Array.from(uniqueMedia.values()).filter(media => 
            media.media_type === 'video' || media.type === 'video'
        );
        
        console.log(`DEBUG: Displaying ${photos.length} photos and ${videos.length} videos`);
        
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
    }
    
    /**
     * Create media element (photo or video)
     */
    createMediaElement(media, type) {
        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item';
        mediaElement.title = media.title || '';
        // Add data attribute for media ID to enable deletion
        mediaElement.dataset.mediaId = media.id;
        
        // Create media controls
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'media-controls';
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'media-control-btn delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteMedia(media.id);
        });
        
        controlsDiv.appendChild(deleteBtn);
        
        // Add "Set as Profile Photo" button for photos
        if (type === 'photo') {
            const setAsProfileBtn = document.createElement('button');
            setAsProfileBtn.className = 'media-control-btn set-profile-btn';
            setAsProfileBtn.innerHTML = '<i class="fas fa-user"></i>';
            setAsProfileBtn.title = 'Set as Profile Photo';
            setAsProfileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setAsProfilePhoto(media);
            });
            
            controlsDiv.appendChild(setAsProfileBtn);
        }
        
        // Create media content
        if (type === 'photo') {
            const img = document.createElement('img');
            
            // Fix file path - use direct path to uploads folder
            const photoUrl = `/uploads/${media.file_path}`;
            console.log("DEBUG: Loading photo from:", photoUrl);
            
            img.src = photoUrl;
            img.alt = media.title || 'Photo';
            img.addEventListener('error', () => {
                console.error(`ERROR: Failed to load image: ${media.file_path}`);
                // Use a data URI for placeholder to avoid additional HTTP requests
                img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22150%22%20height%3D%22150%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20150%20150%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_178%20text%20%7B%20fill%3A%23999%3Bfont-weight%3Anormal%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A10pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_178%22%3E%3Crect%20width%3D%22150%22%20height%3D%22150%22%20fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2255.609375%22%20y%3D%2280%22%3EImage%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';
                img.classList.add('error');
            });
            mediaElement.appendChild(img);
        } else {
            const video = document.createElement('video');
            
            // Fix file path - use direct path to uploads folder
            const videoUrl = `/uploads/${media.file_path}`;
            console.log("DEBUG: Loading video from:", videoUrl);
            
            video.src = videoUrl;
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
        
        mediaElement.appendChild(controlsDiv);
        return mediaElement;
    }
    
    /**
     * Set a photo as the profile photo
     */
    setAsProfilePhoto(photo) {
        if (!photo || !photo.file_path) {
            console.error("ERROR: Invalid photo for profile picture");
            alert("This photo cannot be used as a profile picture.");
            return;
        }
        
        if (!this.currentMemberId) {
            console.error("ERROR: No current member ID when setting profile photo");
            alert("Please select a member first.");
            return;
        }
        
        console.log(`DEBUG: Setting photo ${photo.id} as profile picture`);
        
        const profileImage = document.getElementById('profile-image');
        const placeholder = document.querySelector('.profile-photo-placeholder');
        
        if (!profileImage) {
            console.error("ERROR: Profile image element not found");
            alert("Could not update profile photo due to a technical issue.");
            return;
        }
        
        // Remove any existing listeners
        profileImage.onload = null;
        profileImage.onerror = null;
        
        // Function to handle image loading errors
        const handleImageError = () => {
            console.error("ERROR: Profile image failed to load");
            
            // Remove the event listeners to prevent multiple calls
            profileImage.removeEventListener('error', handleImageError);
            profileImage.removeEventListener('load', handleImageLoad);
            
            // Clear the image source and show placeholder
            profileImage.src = '';
            profileImage.classList.remove('loaded');
            
            if (placeholder) {
                placeholder.style.display = 'flex';
                placeholder.style.opacity = '1';
                placeholder.style.visibility = 'visible';
            }
            
            // Remove from localStorage if it fails
            localStorage.removeItem(`profilePhoto_${this.currentMemberId}`);
            
            // Show error message
            alert("Failed to load the selected image as profile photo. Please try another image.");
        };
        
        // Function to handle successful image load
        const handleImageLoad = () => {
            console.log("DEBUG: Profile image loaded successfully");
            
            // Remove the event listeners to prevent multiple calls
            profileImage.removeEventListener('error', handleImageError);
            profileImage.removeEventListener('load', handleImageLoad);
            
            // Update the UI
            profileImage.classList.add('loaded');
            
            if (placeholder) {
                placeholder.style.opacity = '0';
                placeholder.style.visibility = 'hidden';
            }
            
            // Store this as the selected profile photo ID in localStorage
            localStorage.setItem(`profilePhoto_${this.currentMemberId}`, photo.id);
            
            // Show success message
            alert("Profile photo updated successfully!");
        };
        
        // Add event handlers
        profileImage.addEventListener('error', handleImageError);
        profileImage.addEventListener('load', handleImageLoad);
        
        // Set the profile image src with cache busting
        // Use consistent path format
        const photoUrl = `/uploads/${photo.file_path}`;
        const cacheBuster = new Date().getTime();
        const finalUrl = `${photoUrl}?t=${cacheBuster}`;
        
        try {
            console.log("DEBUG: Loading profile photo from:", finalUrl);
            profileImage.src = finalUrl;
        } catch (error) {
            console.error("ERROR: Exception when setting image src:", error);
            handleImageError();
        }
    }
    
    /**
     * Load relationships for a member
     */
    async loadRelationships(memberId) {
        const currentMemberId = parseInt(memberId, 10);
        if (isNaN(currentMemberId)) {
            console.error("Invalid memberId:", memberId);
            return;
        }

        try {
            const relationships = await api.getPersonRelationships(currentMemberId);
            const container = document.getElementById('relationships-container');
            container.innerHTML = '';

            // Group relationships by type
            const relationshipsByType = {
                parents: [],
                children: [],
                spouses: [],
                siblings: [],
                other: []
            };

            // Create a Map to track unique people by ID
            const uniquePeopleMap = new Map();

            // First pass - just determine relationship types and store unique people
            for (const rel of relationships) {
                const otherId = rel.person1_id === currentMemberId ? rel.person2_id : rel.person1_id;

                // Determine relationship type FROM PERSPECTIVE of current member
                let relType = rel.relationship_type;
                if (rel.relationship_type === 'parent-child') {
                    relType = (rel.person1_id === currentMemberId) ? 'child' : 'parent';
                } else if (rel.relationship_type === 'child-parent') {
                    relType = (rel.person1_id === currentMemberId) ? 'parent' : 'child';
                }

                // Create a unique key based on person ID and relationship type for this view
                const viewKey = `${otherId}-${relType}`;
                if (uniquePeopleMap.has(viewKey)) continue;

                // Fetch person details and store with the original relationship ID
                     try {
                         const otherPerson = await api.getMember(otherId);
                    uniquePeopleMap.set(viewKey, {
                        type: relType,
                        person: otherPerson,
                        originalRelId: rel.id // Store the original relationship ID here
                    });
                } catch (error) {
                    console.error(`Failed to load related person ${otherId}:`, error);
                }
            }

            // Second pass - categorize by relationship type
            for (const [key, info] of uniquePeopleMap.entries()) {
                switch (info.type) {
                    case 'parent': relationshipsByType.parents.push(info); break;
                    case 'child': relationshipsByType.children.push(info); break;
                    case 'spouse': relationshipsByType.spouses.push(info); break;
                    case 'sibling': relationshipsByType.siblings.push(info); break;
                    default: relationshipsByType.other.push(info); break;
                }
            }

            // Display relationships
             const totalRelationships = Object.values(relationshipsByType).reduce((sum, arr) => sum + arr.length, 0);
            if (totalRelationships === 0) {
                container.innerHTML = '<p>No relationships defined.</p>';
                return;
            }

            // Create sections for each relationship type
            if (relationshipsByType.parents.length > 0) {
                this.addRelationshipSection(container, 'Parents', relationshipsByType.parents);
            }
            if (relationshipsByType.children.length > 0) {
                this.addRelationshipSection(container, 'Children', relationshipsByType.children);
            }
            if (relationshipsByType.spouses.length > 0) {
                this.addRelationshipSection(container, 'Spouses', relationshipsByType.spouses);
            }
            if (relationshipsByType.siblings.length > 0) {
                this.addRelationshipSection(container, 'Siblings', relationshipsByType.siblings);
            }
            if (relationshipsByType.other.length > 0) {
                 this.addRelationshipSection(container, 'Other Relationships', relationshipsByType.other);
             }
        } catch (error) {
            console.error('Error loading relationships:', error);
            container.innerHTML = '<p>Error loading relationships.</p>';
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
        
        relationships.forEach(relInfo => {
            // relInfo structure: { type: 'parent', person: PersonObject, originalRelId: 123 }
            if (!relInfo || !relInfo.person) { 
                console.warn(`Skipping relationship display due to missing data for section "${title}"`);
                return;
            }
            const relItem = document.createElement('div');
            relItem.className = 'relationship-item';
            relItem.dataset.relationshipId = relInfo.originalRelId; // Store original ID
            
            const personLink = document.createElement('a');
            personLink.href = '#';
            const firstName = relInfo.person.first_name || 'Unknown';
            const lastName = relInfo.person.last_name || '';
            personLink.textContent = `${firstName} ${lastName}`.trim();
            personLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.profilesManager.loadProfile(relInfo.person.id);
            });
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-relationship-btn';
            deleteBtn.innerHTML = '&times;'; // Simple 'x' character
            deleteBtn.title = 'Delete Relationship';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering link click
                this.handleDeleteRelationship(relInfo.originalRelId, relItem);
            });
            
            relItem.appendChild(personLink);
            relItem.appendChild(deleteBtn); // Add delete button
            section.appendChild(relItem);
        });
        
        container.appendChild(section);
    }
    
    /**
     * Handle the deletion of a relationship
     */
    async handleDeleteRelationship(relationshipId, elementToRemove) {
        console.log(`Attempting to delete relationship ID: ${relationshipId}`);
        if (!relationshipId) {
            console.error("Cannot delete relationship: Missing ID");
            alert("Could not delete relationship: Missing ID.");
            return;
        }

        if (confirm('Are you sure you want to delete this relationship?')) {
            try {
                await api.deleteRelationship(relationshipId);
                console.log(`Successfully deleted relationship ${relationshipId}`);
                
                // Remove the item visually
                elementToRemove.remove();
                
                // Refresh the tree visualization
                if (window.familyTree) {
                    console.log("DEBUG: Clearing family tree cache after relationship deletion");
                    window.familyTree.clearCache();
                    window.familyTree.loadData(); 
                }
                
                // Optionally: Re-fetch and re-render the relationships list for the current profile
                // This ensures counts/sections update if the list becomes empty
                // if (this.currentMemberId) {
                //    this.loadRelationships(this.currentMemberId);
                // }
                alert('Relationship deleted successfully.');

            } catch (error) {
                console.error(`Error deleting relationship ${relationshipId}:`, error);
                alert(`Failed to delete relationship: ${error.message}`);
            }
        }
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
        const mediaType = type || 'all';
        const mediaFile = document.getElementById('media-file');
        
        if (mediaType === 'photo') {
            // Common photo formats
            mediaFile.accept = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.heic';
            
            // Update size info for photos
            const sizeInfo = document.getElementById('file-size-info');
            if (sizeInfo) {
                sizeInfo.textContent = 'Maximum file size: 8MB for photos';
            }
        } else {
            // Common photo and video formats
            mediaFile.accept = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.heic,.mp4,.webm,.mov,.avi,.mkv,.mpeg,.mpg';
            
            // Update size info for all media
            const sizeInfo = document.getElementById('file-size-info');
            if (sizeInfo) {
                sizeInfo.textContent = 'Maximum file size: 8MB for photos, 50MB for videos';
            }
        }
        
        // Add file change event listener to validate file size
        if (mediaFile) {
            mediaFile.onchange = function() {
                const file = this.files[0];
                if (!file) return;
                
                const sizeMB = Math.round((file.size / (1024 * 1024)) * 10) / 10;
                const fileExtension = file.name.split('.').pop().toLowerCase();
                
                // Check if it's a video file
                const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mpeg', 'mpg'].includes(fileExtension);
                const maxSize = isVideo ? 50 : 8; // 50MB for videos, 8MB for photos
                
                // Check if file is too large
                if (sizeMB > maxSize) {
                    alert(`This file is too large (${sizeMB}MB). Maximum size for ${isVideo ? 'videos' : 'photos'} is ${maxSize}MB.`);
                    this.value = ''; // Clear the file input
                } else {
                    // Show selected file size
                    const sizeInfo = document.getElementById('file-size-info');
                    if (sizeInfo) {
                        sizeInfo.textContent = `Selected file: ${file.name} (${sizeMB}MB)`;
                    }
                }
            };
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
        const memberId = document.getElementById('member-id').value;
        const form = document.getElementById('member-form');
        const submitButton = form.querySelector('button[type="submit"]');

        // Prevent double submission
        if (submitButton.disabled) {
            console.log("DEBUG: Save member already in progress, blocking.");
            return; 
        }

        // Disable button immediately 
        submitButton.disabled = true;
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = memberId ? 'Saving...' : 'Adding...';

        try { 
        const memberData = {
            first_name: document.getElementById('first-name').value,
            last_name: document.getElementById('last-name').value,
            gender: document.getElementById('gender').value,
                birth_date: document.getElementById('birth-date').value || null,
                death_date: document.getElementById('death-date').value || null,
            biography: document.getElementById('biography').value,
                custom_fields: [] // Initialize as empty array
            };

            // Gather custom fields directly
        const fieldRows = document.querySelectorAll('#custom-fields-editor .custom-field-row');
        fieldRows.forEach(row => {
                const fieldNameInput = row.querySelector('.field-name-input');
                const fieldValueInput = row.querySelector('.field-value-input');
            
                if (fieldNameInput && fieldValueInput) {
                    const fieldName = fieldNameInput.value.trim();
                    const fieldValue = fieldValueInput.value.trim();
            if (fieldName) {
                memberData.custom_fields.push({
                    field_name: fieldName,
                    field_value: fieldValue
                });
                    }
                }
            });
            
            // Basic validation
            if (!memberData.first_name || !memberData.last_name) {
                alert('First name and Last name are required.');
                // No return here, finally block will handle button re-enable
                throw new Error("Validation failed: Missing required fields."); // Throw error to trigger finally
            }
            
            console.log("DEBUG: Saving member data:", memberData);
            
            let member;
            // Update or create
            if (memberId) {
                member = await api.updateMember(memberId, memberData);
            } else {
                member = await api.createMember(memberData);
                this.currentMemberId = member.id;
            }
            
            // If successful:
            // Hide modal
            document.getElementById('member-modal').classList.add('hidden');
            
            // Refresh profile
            this.loadProfile(member.id);
            
            // Refresh tree visualization
            if (window.familyTree) {
                console.log("DEBUG: Clearing family tree cache after member save");
                window.familyTree.clearCache();
                window.familyTree.loadData();
                window.updateMemberSelector();
            }

        } catch (error) {
            // Log error unless it's just the validation error we threw
            if (error.message !== "Validation failed: Missing required fields.") {
            console.error('Error saving member:', error);
            alert(`Error saving member: ${error.message}`);
            }
        } finally {
            // Re-enable button regardless of success, validation failure, or error
            console.log("DEBUG: Re-enabling save button.");
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText; // Restore original text
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
                console.log("DEBUG: Clearing family tree cache after member deletion");
                window.familyTree.clearCache();
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
        const mediaType = document.getElementById('media-type').value;
        
        if (!fileInput.files || !fileInput.files[0]) {
            alert('Please select a file to upload.');
            return;
        }
        
        const file = fileInput.files[0];
        
        // Check file size - 8MB limit for photos, 50MB for videos
        const maxSize = mediaType === 'video' ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
        if (file.size > maxSize) {
            const sizeInMB = Math.round(file.size / (1024 * 1024));
            const limitInMB = Math.round(maxSize / (1024 * 1024));
            alert(`File is too large (${sizeInMB}MB). Maximum size is ${limitInMB}MB.`);
            return;
        }
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', document.getElementById('media-title').value);
        formData.append('description', document.getElementById('media-description').value);
        formData.append('media_type', mediaType);
        
        try {
            // Show loading indicator
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Uploading...';
            }
            
            // Upload media
            const response = await fetch(`/api/members/${personId}/media`, {
                method: 'POST',
                body: formData
            });
            
            // Check if response is OK
            if (!response.ok) {
                let errorMessage = `Upload failed with status: ${response.status}`;
                
                // Try to get error details
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (parseError) {
                    // If we can't parse JSON, try to get text
                    try {
                        const errorText = await response.text();
                        if (errorText && errorText.length < 100) {
                            errorMessage = errorText;
                        }
                    } catch (textError) {
                        // Ignore text parsing error
                    }
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('Media uploaded successfully:', data);
            
            // Hide modal
            document.getElementById('media-modal').classList.add('hidden');
            
            // Reset form and button
            form.reset();
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Upload';
            }
            
            // Show success message
            alert('Media uploaded successfully!');
            
            // Refresh profile
            this.loadProfile(personId);
        } catch (error) {
            console.error('Error uploading media:', error);
            
            // Reset button
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Upload';
            }
            
            // Show error message
            let errorMessage = error.message || 'Unknown error occurred';
            if (errorMessage.includes('413')) {
                errorMessage = 'File is too large for the server to process. Please try a smaller file.';
            }
            
            alert(`Error uploading media: ${errorMessage}`);
        }
    }
    
    /**
     * Delete media
     */
    deleteMedia(id, containerSelector = '.category-content.active .media-items') {
        if (!this.currentMemberId) {
            console.error('No current member selected');
            return Promise.reject('No current member selected');
        }
        
        console.log(`DEBUG: Deleting media with ID: ${id}`);
        
        if (!id) {
            console.error('No media ID provided');
            return Promise.reject('No media ID provided');
        }
        
        // Check if this media is set as the profile photo
        const profilePhotoId = localStorage.getItem(`profilePhoto_${this.currentMemberId}`);
        const isProfilePhoto = profilePhotoId === id.toString();
        
        // Confirmation dialog
        if (!confirm(isProfilePhoto 
            ? 'This is your current profile photo. Are you sure you want to delete it?' 
            : 'Are you sure you want to delete this media?')) {
            return Promise.resolve(false);
        }
        
        return fetch(`/api/members/${this.currentMemberId}/media/${id}`, {
            method: 'DELETE',
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete media');
                }
                return response.json();
            })
            .then(data => {
                console.log('Media deleted successfully:', data);
                
                // Remove the media from the DOM
                const container = document.querySelector(containerSelector);
                if (container) {
                    const mediaElement = container.querySelector(`[data-media-id="${id}"]`);
                    if (mediaElement) {
                        mediaElement.remove();
                    }
                }
                
                // If this was the profile photo, remove it from localStorage and reset the profile photo
                if (isProfilePhoto) {
                    console.log('DEBUG: Deleted media was the profile photo, resetting profile photo');
                    localStorage.removeItem(`profilePhoto_${this.currentMemberId}`);
                    
                    // Find the first available photo to set as profile, or use placeholder
                    this.fetchMedia(this.currentMemberId)
                        .then(media => {
                            const photos = media.filter(item => item.type === 'photo');
                            if (photos.length > 0) {
                                console.log('DEBUG: Setting new profile photo after deletion');
                                this.setAsProfilePhoto(photos[0]);
                            } else {
                                // No photos available, clear the profile image
                                console.log('DEBUG: No photos available, clearing profile image');
                                const profileImage = document.getElementById('profile-image');
                                const placeholder = document.querySelector('.profile-photo-placeholder');
                                
                                if (profileImage) {
                                    profileImage.src = '';
                                    profileImage.classList.remove('loaded');
                                }
                                
                                if (placeholder) {
                                    placeholder.style.display = 'flex';
                                    placeholder.style.opacity = '1';
                                    placeholder.style.visibility = 'visible';
                                }
                            }
                        })
                        .catch(err => {
                            console.error('Error fetching media after deleting profile photo:', err);
                        });
                }
                
                return true;
            })
            .catch(error => {
                console.error('Error deleting media:', error);
                alert('Failed to delete media. Please try again.');
                return false;
            });
    }
    
    /**
     * Close profile view
     */
    closeProfile() {
        console.log("DEBUG: Closing profile");
        
        // Check if profile is in fullscreen mode first
        if (this.profileContainer.classList.contains('fullscreen')) {
            console.log("DEBUG: Profile is in fullscreen mode, restoring tree container");
            // Make sure tree is visible when closing from fullscreen
            const treeContainer = document.getElementById('tree-container');
            if (treeContainer) {
                treeContainer.classList.remove('hidden');
            }
            this.profileContainer.classList.remove('fullscreen');
            
            // Reset fullscreen button text
            const fullscreenBtn = document.getElementById('toggle-fullscreen-btn');
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
                fullscreenBtn.title = 'View in fullscreen mode';
                console.log("DEBUG: Reset fullscreen button text");
            }
        }
        
        // Add a little delay to ensure transitions complete
        setTimeout(() => {
        this.profileContainer.classList.add('hidden');
        }, 50);
        
        // Reset current member ID
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
    
    /**
     * Display profile photo
     */
    displayProfilePhoto(memberId, media) {
        console.log(`DEBUG: Displaying profile photo for member ${memberId}`);
        
        if (!memberId) {
            console.error("ERROR: No member ID provided to displayProfilePhoto");
            return;
        }
        
        const profileImage = document.getElementById('profile-image');
        const placeholder = document.querySelector('.profile-photo-placeholder');
        
        if (!profileImage || !placeholder) {
            console.error("ERROR: Profile image or placeholder elements not found");
            return;
        }
        
        // Reset image and show placeholder initially
        profileImage.onload = null;
        profileImage.onerror = null;
        profileImage.src = '';
        profileImage.classList.remove('loaded');
        placeholder.style.display = 'flex';
        placeholder.style.opacity = '1';
        placeholder.style.visibility = 'visible';
        
        // If no media provided, try to fetch it
        if (!media || !Array.isArray(media)) {
            console.log("DEBUG: No media provided, fetching media");
            this.fetchMedia(memberId)
                .then(fetchedMedia => {
                    this.displayProfilePhoto(memberId, fetchedMedia);
                })
                .catch(error => {
                    console.error("ERROR: Failed to fetch media for profile photo:", error);
                });
            return;
        }
        
        // Find photos in the media array
        const photos = media.filter(item => 
            (item.media_type === 'photo' || item.type === 'photo') && item.file_path
        );
        console.log(`DEBUG: Found ${photos.length} photos for member ${memberId}`);
        
        if (photos.length === 0) {
            console.log("DEBUG: No photos available for profile");
            localStorage.removeItem(`profilePhoto_${memberId}`);
            return; // Keep placeholder visible
        }
        
        // Check if there's a saved profile photo ID
        const savedProfilePhotoId = localStorage.getItem(`profilePhoto_${memberId}`);
        let photoToUse = null;
        
        if (savedProfilePhotoId) {
            console.log(`DEBUG: Found saved profile photo ID: ${savedProfilePhotoId}`);
            // Find the saved photo in the media array
            photoToUse = photos.find(photo => photo.id && photo.id.toString() === savedProfilePhotoId.toString());
            
            if (!photoToUse) {
                console.log("DEBUG: Saved profile photo not found in media, might have been deleted");
                localStorage.removeItem(`profilePhoto_${memberId}`);
            }
        }
        
        // If no saved photo or it wasn't found, use the most recent photo
        if (!photoToUse && photos.length > 0) {
            console.log("DEBUG: Using most recent photo as profile photo");
            // Sort photos by created_at date (most recent first)
            const sortedPhotos = photos.sort((a, b) => 
                new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
            photoToUse = sortedPhotos[0];
        }
        
        if (photoToUse && photoToUse.file_path) {
            console.log(`DEBUG: Setting profile photo from file: ${photoToUse.file_path}`);
            
            const handleSuccess = () => {
                console.log("DEBUG: Profile photo loaded successfully");
                profileImage.classList.add('loaded');
                placeholder.style.opacity = '0';
                placeholder.style.visibility = 'hidden';
                
                // Store this photo ID in localStorage if it's not already saved
                if (!savedProfilePhotoId || savedProfilePhotoId !== photoToUse.id.toString()) {
                    localStorage.setItem(`profilePhoto_${memberId}`, photoToUse.id);
                    console.log(`DEBUG: Saved new profile photo ID: ${photoToUse.id}`);
                }
                
                // Remove the event listeners to prevent multiple calls
                profileImage.removeEventListener('load', handleSuccess);
                profileImage.removeEventListener('error', handleError);
            };
            
            const handleError = () => {
                console.error(`ERROR: Failed to load profile photo from ${photoToUse.file_path}`);
                
                // Remove from localStorage if it exists but fails to load
                if (savedProfilePhotoId && savedProfilePhotoId === photoToUse.id.toString()) {
                    console.log("DEBUG: Removing invalid profile photo ID from localStorage");
                    localStorage.removeItem(`profilePhoto_${memberId}`);
                }
                
                // Try the next photo if available
                const indexOfCurrent = photos.indexOf(photoToUse);
                if (indexOfCurrent !== -1 && indexOfCurrent < photos.length - 1) {
                    console.log("DEBUG: Trying next photo as profile photo");
                    photoToUse = photos[indexOfCurrent + 1];
                    
                    // Remove current listeners and retry with new photo
                    profileImage.removeEventListener('load', handleSuccess);
                    profileImage.removeEventListener('error', handleError);
                    
                    if (photoToUse && photoToUse.file_path) {
                        // Use consistent path format
                        const photoUrl = `/uploads/${photoToUse.file_path}`;
                        const cacheBuster = new Date().getTime();
                        profileImage.src = `${photoUrl}?t=${cacheBuster}`;
                        // Reconnect event listeners for the new attempt
                        profileImage.addEventListener('load', handleSuccess);
                        profileImage.addEventListener('error', handleError);
                        return;
                    }
                }
                
                // If we get here, we've run out of photos to try or the next one doesn't have a file_path
                console.log("DEBUG: No more photos to try, keeping placeholder visible");
                profileImage.src = '';
                profileImage.classList.remove('loaded');
                placeholder.style.display = 'flex';
                placeholder.style.opacity = '1';
                placeholder.style.visibility = 'visible';
                
                // Remove the event listeners to prevent multiple calls
                profileImage.removeEventListener('load', handleSuccess);
                profileImage.removeEventListener('error', handleError);
            };
            
            // Set up event listeners
            profileImage.addEventListener('load', handleSuccess);
            profileImage.addEventListener('error', handleError);
            
            // Set the image src with cache busting
            // Use consistent path format
            const photoUrl = `/uploads/${photoToUse.file_path}`;
            const cacheBuster = new Date().getTime();
            
            try {
                console.log("DEBUG: Loading profile photo from:", `${photoUrl}?t=${cacheBuster}`);
                profileImage.src = `${photoUrl}?t=${cacheBuster}`;
            } catch (error) {
                console.error("ERROR: Exception when setting image src:", error);
                handleError();
            }
        }
    }
    
    /**
     * Fetch media for a member
     */
    fetchMedia(memberId) {
        if (!memberId) {
            console.error('ERROR: No member ID provided to fetchMedia');
            return Promise.resolve([]);
        }
        
        console.log(`DEBUG: Fetching media for member ${memberId}`);
        
        return fetch(`/api/members/${memberId}/media`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`DEBUG: Fetched ${data.length} media items`);
                return data;
            })
            .catch(error => {
                console.error('ERROR: Failed to fetch media:', error);
                // Return empty array instead of rejecting
                return [];
            });
    }
}

// Add a function to get the current member ID
const getCurrentMemberId = () => {
    // Return the current member ID from the ProfilesManager or directly access it
    if (window.profilesManager) {
        return window.profilesManager.currentMemberId;
    } else {
        // For backwards compatibility with older code
        return currentProfile?.id;
    }
};

// Update setupProfilePhotoUpload function
const setupProfilePhotoUpload = () => {
    console.log("DEBUG: Setting up profile photo upload handlers");
    const uploadBtn = document.getElementById('upload-photo-btn');
    
    if (!uploadBtn) {
        console.error("ERROR: Upload photo button not found");
        return;
    }
    
    uploadBtn.addEventListener('click', () => {
        console.log("DEBUG: Upload photo button clicked");
        const memberId = getCurrentMemberId();
        console.log("DEBUG: Current member ID:", memberId);
        
        if (!memberId) {
            console.error("ERROR: No member ID available for upload");
            alert("Please select a profile first before uploading a photo");
            return;
        }
        
        // Show the media modal
        const mediaModal = document.getElementById('media-modal');
        const mediaPersonId = document.getElementById('media-person-id');
        const mediaFile = document.getElementById('media-file');
        
        if (mediaModal && mediaPersonId) {
            mediaPersonId.value = memberId;
            if (mediaFile) {
                // Common photo formats for profile pictures
                mediaFile.accept = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.heic';
            }
            mediaModal.classList.remove('hidden');
            console.log("DEBUG: Media modal opened for member:", memberId);
        } else {
            console.error("ERROR: Media modal or person ID field not found");
        }
    });
};

/**
 * Timeline manager for member events
 */
class TimelineManager {
    constructor() {
        this.events = [];
        this.currentMemberId = null;
        
        // Bind methods
        this.loadEvents = this.loadEvents.bind(this);
        this.saveEvents = this.saveEvents.bind(this);
        this.addEvent = this.addEvent.bind(this);
        this.editEvent = this.editEvent.bind(this);
        this.deleteEvent = this.deleteEvent.bind(this);
        this.renderTimeline = this.renderTimeline.bind(this);
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Add event button
        const addEventBtn = document.getElementById('add-event-btn');
        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => {
                this.showEventModal();
            });
        }
        
        // Listen for fullscreen toggle
        document.addEventListener('click', (e) => {
            if (e.target.id === 'toggle-fullscreen-btn' || e.target.closest('#toggle-fullscreen-btn')) {
                setTimeout(() => {
                    // Wait a moment for fullscreen to apply, then check if we should show timeline
                    const isFullscreen = document.getElementById('profile-container').classList.contains('fullscreen');
                    if (isFullscreen) {
                        console.log("DEBUG: Fullscreen activated, rendering timeline");
                        this.renderTimeline();
                    }
                }, 50);
            }
        });
        
        // Create event modal if it doesn't exist
        this.createEventModal();
    }
    
    /**
     * Create event modal
     */
    createEventModal() {
        // Check if modal already exists
        if (document.getElementById('event-modal')) return;
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'event-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add Life Event</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <form id="event-form">
                    <input type="hidden" id="event-id">
                    <div class="form-group">
                        <label for="event-date">Date: <span class="required">*</span></label>
                        <input type="date" id="event-date" required>
                    </div>
                    <div class="form-group">
                        <label for="event-type">Event Type: <span class="required">*</span></label>
                        <select id="event-type" required>
                            <option value="custom">Custom Event</option>
                            <option value="birth">Birth</option>
                            <option value="death">Death</option>
                            <option value="marriage">Marriage</option>
                            <option value="education">Education</option>
                            <option value="career">Career</option>
                            <option value="relocation">Relocation</option>
                            <option value="achievement">Achievement</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="event-title">Title: <span class="required">*</span></label>
                        <input type="text" id="event-title" placeholder="Event title" required>
                    </div>
                    <div class="form-group">
                        <label for="event-description">Description:</label>
                        <textarea id="event-description" rows="4" placeholder="Optional description"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="accent-btn">Save Event</button>
                        <button type="button" class="cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add event listeners
        const form = modal.querySelector('#event-form');
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.cancel-btn');
        const eventType = modal.querySelector('#event-type');
        const eventTitle = modal.querySelector('#event-title');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEventFromForm();
        });
        
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        // Auto-generate title based on event type
        eventType.addEventListener('change', () => {
            const type = eventType.value;
            if (type !== 'custom' && !eventTitle.value) {
                switch(type) {
                    case 'birth':
                        eventTitle.value = 'Born';
                        break;
                    case 'death':
                        eventTitle.value = 'Passed Away';
                        break;
                    case 'marriage':
                        eventTitle.value = 'Got Married';
                        break;
                    case 'education':
                        eventTitle.value = 'Started Education';
                        break;
                    case 'career':
                        eventTitle.value = 'Career Milestone';
                        break;
                    case 'relocation':
                        eventTitle.value = 'Moved To';
                        break;
                    case 'achievement':
                        eventTitle.value = 'Achievement';
                        break;
                }
            }
        });
    }
    
    /**
     * Show event modal for adding or editing
     */
    showEventModal(event = null) {
        const modal = document.getElementById('event-modal');
        if (!modal) return;
        
        const modalTitle = modal.querySelector('.modal-header h2');
        const eventId = document.getElementById('event-id');
        const eventDate = document.getElementById('event-date');
        const eventType = document.getElementById('event-type');
        const eventTitle = document.getElementById('event-title');
        const eventDesc = document.getElementById('event-description');
        
        // Reset form
        document.getElementById('event-form').reset();
        
        if (event) {
            // Editing existing event
            if (modalTitle) modalTitle.textContent = 'Edit Life Event';
            eventId.value = event.id;
            eventDate.value = event.date;
            eventType.value = event.type;
            eventTitle.value = event.title;
            eventDesc.value = event.description || '';
        } else {
            // Adding new event
            if (modalTitle) modalTitle.textContent = 'Add Life Event';
            eventId.value = '';
            eventDate.value = '';
            eventType.value = 'custom';
            eventTitle.value = '';
            eventDesc.value = '';
            
            // Check if we need to prefill based on profile data
            if (window.profilesManager && window.profilesManager.currentMemberId) {
                const memberId = window.profilesManager.currentMemberId;
                api.getMember(memberId).then(member => {
                    // Check if we already have birth/death events
                    const hasExistingBirth = this.events.some(e => e.type === 'birth');
                    const hasExistingDeath = this.events.some(e => e.type === 'death');
                    
                    // Suggest adding birth date if not already added
                    if (member.birth_date && !hasExistingBirth) {
                        if (confirm(`Add birth date (${new Date(member.birth_date).toLocaleDateString()}) to timeline?`)) {
                            eventDate.value = member.birth_date.split('T')[0];
                            eventType.value = 'birth';
                            eventTitle.value = 'Born';
                        }
                    }
                    // Suggest adding death date if not already added
                    else if (member.death_date && !hasExistingDeath) {
                        if (confirm(`Add death date (${new Date(member.death_date).toLocaleDateString()}) to timeline?`)) {
                            eventDate.value = member.death_date.split('T')[0];
                            eventType.value = 'death';
                            eventTitle.value = 'Passed Away';
                        }
                    }
                });
            }
        }
        
        // Show modal
        modal.classList.remove('hidden');
    }
    
    /**
     * Save event from form data
     */
    saveEventFromForm() {
        const eventId = document.getElementById('event-id').value;
        const eventDate = document.getElementById('event-date').value;
        const eventType = document.getElementById('event-type').value;
        const eventTitle = document.getElementById('event-title').value;
        const eventDesc = document.getElementById('event-description').value;
        
        if (!eventDate || !eventTitle) {
            alert('Please fill in all required fields');
            return;
        }
        
        const eventData = {
            id: eventId || Date.now().toString(),
            date: eventDate,
            type: eventType,
            title: eventTitle,
            description: eventDesc
        };
        
        if (eventId) {
            // Editing existing event
            this.editEvent(eventData);
        } else {
            // Adding new event
            this.addEvent(eventData);
        }
        
        // Hide modal
        document.getElementById('event-modal').classList.add('hidden');
    }
    
    /**
     * Load timeline events for a member
     */
    loadEvents(memberId) {
        if (!memberId) return;
        
        // Store current member ID
        this.currentMemberId = memberId;
        
        // Load from localStorage
        const savedEvents = localStorage.getItem(`timelineEvents_${memberId}`);
        if (savedEvents) {
            try {
                this.events = JSON.parse(savedEvents);
            } catch (e) {
                console.error('Error parsing saved events:', e);
                this.events = [];
            }
        } else {
            this.events = [];
            
            // Get member data to auto-add birth and death dates
            api.getMember(memberId).then(member => {
                let eventsAdded = false;
                
                if (member.birth_date) {
                    this.events.push({
                        id: 'birth_' + Date.now(),
                        date: member.birth_date.split('T')[0],
                        type: 'birth',
                        title: 'Born',
                        description: ''
                    });
                    eventsAdded = true;
                }
                
                if (member.death_date) {
                    this.events.push({
                        id: 'death_' + Date.now(),
                        date: member.death_date.split('T')[0],
                        type: 'death',
                        title: 'Passed Away',
                        description: ''
                    });
                    eventsAdded = true;
                }
                
                if (eventsAdded) {
                    this.saveEvents();
                    this.renderTimeline();
                }
            });
        }
        
        // Initial render
        this.renderTimeline();
    }
    
    /**
     * Save events to localStorage
     */
    saveEvents() {
        if (!this.currentMemberId) return;
        localStorage.setItem(`timelineEvents_${this.currentMemberId}`, JSON.stringify(this.events));
    }
    
    /**
     * Add a new event to the timeline
     */
    addEvent(eventData) {
        this.events.push(eventData);
        this.events.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.saveEvents();
        this.renderTimeline();
    }
    
    /**
     * Edit an existing event
     */
    editEvent(eventData) {
        const index = this.events.findIndex(e => e.id === eventData.id);
        if (index !== -1) {
            this.events[index] = eventData;
            this.events.sort((a, b) => new Date(a.date) - new Date(b.date));
            this.saveEvents();
            this.renderTimeline();
        }
    }
    
    /**
     * Delete an event
     */
    deleteEvent(eventId) {
        const index = this.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            this.events.splice(index, 1);
            this.saveEvents();
            this.renderTimeline();
        }
    }
    
    /**
     * Render timeline events
     */
    renderTimeline() {
        const container = document.getElementById('timeline-events');
        const emptyState = document.getElementById('timeline-empty');
        
        if (!container) return;
        
        // Clear existing events
        container.innerHTML = '';
        
        // Check if we have events
        if (this.events.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        // Hide empty state
        if (emptyState) emptyState.style.display = 'none';
        
        // Sort events by date
        const sortedEvents = [...this.events].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Create event elements
        sortedEvents.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = `timeline-event ${event.type}`;
            eventElement.dataset.id = event.id;
            
            // Format date
            const date = new Date(event.date);
            const formattedDate = date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            eventElement.innerHTML = `
                <div class="event-date">${formattedDate}</div>
                <div class="event-title">${event.title}</div>
                ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                <div class="event-actions">
                    <button class="edit-event-btn">Edit</button>
                    <button class="delete-event-btn">Delete</button>
                </div>
            `;
            
            // Add event listeners
            const editBtn = eventElement.querySelector('.edit-event-btn');
            const deleteBtn = eventElement.querySelector('.delete-event-btn');
            
            editBtn.addEventListener('click', () => {
                this.showEventModal(event);
            });
            
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this event?')) {
                    this.deleteEvent(event.id);
                }
            });
            
            container.appendChild(eventElement);
        });
    }
}

/**
 * Media Category Manager
 */
class MediaCategoryManager {
    constructor() {
        // Each member should have their own categories
        this.categories = null; // Will be initialized per member
        this.defaultCategories = [
            { id: 'photos', name: 'Photos', type: 'media' },
            { id: 'videos', name: 'Videos', type: 'media' },
            { id: 'documents', name: 'Documents', type: 'media' },
            { id: 'notes', name: 'Notes', type: 'text' }
        ];
        this.currentCategory = 'photos';
        this.currentMemberId = null;
        
        // Bind methods to this context
        this.showTextEntryModal = this.showTextEntryModal.bind(this);
        this.saveTextEntry = this.saveTextEntry.bind(this);
        this.saveTextEntries = this.saveTextEntries.bind(this);
        this.loadTextEntries = this.loadTextEntries.bind(this);
        this.toggleFullscreen = this.toggleFullscreen.bind(this);
        this.showManageCategoriesModal = this.showManageCategoriesModal.bind(this);
        this.showAddCategoryModal = this.showAddCategoryModal.bind(this);
        this.addCategory = this.addCategory.bind(this);
        this.switchCategory = this.switchCategory.bind(this);
        this.createTextEntryModal = this.createTextEntryModal.bind(this);
        
        // Initialize UI
        this.initializeTabs();
        this.initializeNotesTab();
        this.createTextEntryModal();
        this.initializeCategoryModal();
        
        console.log("DEBUG: MediaCategoryManager initialized");
    }

    /**
     * Load categories from localStorage for a specific member
     */
    loadCategories(memberId) {
        if (!memberId) {
            console.error('No member ID provided for loading categories');
            return;
        }
        
        console.log(`DEBUG: Loading categories for member ${memberId}`);
        
        // Store current member ID
        this.currentMemberId = memberId;
        
        // Load saved categories from localStorage
        const storageKey = `mediaCategories_${memberId}`;
        const savedCategories = localStorage.getItem(storageKey);
        
        console.log(`DEBUG: Retrieved from localStorage key: ${storageKey}`);
        if (savedCategories) {
            console.log(`DEBUG: Found saved categories in localStorage: ${savedCategories}`);
        } else {
            console.log(`DEBUG: No saved categories found in localStorage for this member`);
        }
        
        // Clear existing custom tabs and containers
        this.clearCustomTabsAndContainers();
        
        // Start with default categories
        this.categories = [...this.defaultCategories];
        console.log(`DEBUG: Initialized with ${this.defaultCategories.length} default categories`);
        
        if (savedCategories) {
            try {
                // Parse saved categories and add them to defaults
                const customCategories = JSON.parse(savedCategories);
                console.log(`DEBUG: Parsed ${customCategories.length} custom categories from localStorage`);
                
                // Only add custom categories (skip default ones)
                let addedCount = 0;
                customCategories.forEach(category => {
                    if (!this.defaultCategories.some(def => def.id === category.id)) {
                        this.categories.push(category);
                        addedCount++;
                        console.log(`DEBUG: Added custom category: ${category.name} (${category.id})`);
                    } else {
                        console.log(`DEBUG: Skipped adding default category: ${category.name} (${category.id})`);
                    }
                });
                
                console.log(`DEBUG: Added ${addedCount} custom categories from localStorage`);
                console.log(`DEBUG: Total categories for member ${memberId}: ${this.categories.length}`);
                
                // Create tabs and containers for custom categories
                this.categories.forEach(category => {
                    // Skip default categories as they already exist
                    if (!this.defaultCategories.some(def => def.id === category.id)) {
                        console.log(`DEBUG: Creating UI elements for custom category: ${category.name} (${category.id})`);
                        this.createCategoryTabAndContainer(category.id, category.name, category.type);
                    }
                });
                
                // Load text entries for all text categories
                this.categories.forEach(category => {
                    if (category.type === 'text' || category.type === 'mixed') {
                        this.loadTextEntries(category.id);
                    }
                });
                
                console.log(`%cSuccessfully loaded ${this.categories.length} total categories for member ${memberId}`, 'color: green; font-weight: bold');
                
            } catch (error) {
                console.error('ERROR: Error loading categories:', error);
                // On error, fall back to default categories
                this.categories = [...this.defaultCategories];
                console.log(`DEBUG: Falling back to ${this.defaultCategories.length} default categories due to error`);
            }
        } else {
            console.log(`DEBUG: No custom categories found, using ${this.defaultCategories.length} default categories`);
        }
        
        // Log all categories for debugging
        console.log(`DEBUG: All categories for member ${memberId}:`, this.categories);
        
        // Set active category
        this.switchCategory('photos');
    }

    /**
     * Create tab and container for category
     */
    createCategoryTabAndContainer(categoryId, categoryName, categoryType) {
        try {
            console.log(`DEBUG: Creating category tab and container for ${categoryName} (${categoryId})`);
            
            // Validate inputs
            if (!categoryId || !categoryName || !categoryType) {
                console.error("ERROR: Missing required parameters for creating category tab/container", {
                    id: categoryId,
                    name: categoryName,
                    type: categoryType
                });
                return false;
            }
            
            // CRITICAL FIX: First ensure the profile has been loaded
            const profileContainer = document.getElementById('profile-container');
            if (!profileContainer || profileContainer.classList.contains('hidden')) {
                console.error("ERROR: Profile container not found or hidden - cannot create category tab");
                return false;
            }
            
            // CRITICAL FIX: Try multiple selectors to find the media gallery
            let mediaGallery = document.querySelector('.media-gallery');
            if (!mediaGallery) {
                mediaGallery = document.querySelector('#media-gallery');
            }
            if (!mediaGallery) {
                mediaGallery = profileContainer.querySelector('.media-gallery');
            }
            if (!mediaGallery) {
                mediaGallery = profileContainer.querySelector('[class*="media"]');
            }
            
            // Last resort: create the media gallery if it doesn't exist
            if (!mediaGallery) {
                console.log("DEBUG: Media gallery not found - creating it");
                
                // Find a suitable container to append to
                const contentArea = profileContainer.querySelector('.profile-content') || 
                                   profileContainer.querySelector('.profile-details') || 
                                   profileContainer;
                
                if (!contentArea) {
                    console.error("ERROR: Could not find a suitable container for the media gallery");
                    return false;
                }
                
                // Create media gallery
                mediaGallery = document.createElement('div');
                mediaGallery.className = 'media-gallery';
                mediaGallery.innerHTML = '<h3>Media Gallery</h3>';
                contentArea.appendChild(mediaGallery);
                console.log("DEBUG: Created new media gallery element");
            }
            
            // Check if tab container exists first, create it if not
            let tabsContainer = mediaGallery.querySelector('.category-tabs');
            if (!tabsContainer) {
                console.log("DEBUG: Category tabs container not found, creating it");
                tabsContainer = document.createElement('div');
                tabsContainer.className = 'category-tabs';
                mediaGallery.prepend(tabsContainer);
                console.log("DEBUG: Created category tabs container");
                
                // Create default tabs if they don't exist
                this.defaultCategories.forEach(cat => {
                    const exists = tabsContainer.querySelector(`.category-tab[data-category="${cat.id}"]`);
                    if (!exists) {
                        const defaultTab = document.createElement('div');
                        defaultTab.className = 'category-tab';
                        defaultTab.setAttribute('data-category', cat.id);
                        defaultTab.textContent = cat.name;
                        tabsContainer.appendChild(defaultTab);
                        
                        // Add event listener
                        defaultTab.addEventListener('click', () => {
                            this.switchCategory(cat.id);
                        });
                        
                        console.log(`DEBUG: Created default tab for ${cat.name}`);
                    }
                });
                
                // Add other necessary tabs if they don't exist
                const addTabExists = tabsContainer.querySelector('.add-tab');
                if (!addTabExists) {
                    const addTab = document.createElement('div');
                    addTab.className = 'category-tab add-tab';
                    addTab.textContent = '+ Add Category';
                    addTab.addEventListener('click', () => {
                        console.log("DEBUG: Add category button clicked");
                        this.showAddCategoryModal();
                    });
                    tabsContainer.appendChild(addTab);
                    console.log("DEBUG: Created add category tab");
                }
                
                const manageTabExists = tabsContainer.querySelector('.manage-tab');
                if (!manageTabExists) {
                    const manageTab = document.createElement('div');
                    manageTab.className = 'category-tab manage-tab';
                    manageTab.innerHTML = '<i class="fas fa-cog"></i> Manage';
                    manageTab.addEventListener('click', () => {
                        console.log("DEBUG: Manage categories button clicked");
                        this.showManageCategoriesModal();
                    });
                    tabsContainer.appendChild(manageTab);
                    console.log("DEBUG: Created manage categories tab");
                }
            }
            
            // Create default category containers if they don't exist
            this.defaultCategories.forEach(cat => {
                const exists = document.getElementById(`${cat.id}-container`);
                if (!exists) {
                    const container = document.createElement('div');
                    container.id = `${cat.id}-container`;
                    container.className = 'category-content';
                    
                    // Add appropriate content based on type
                    if (cat.type === 'media') {
                        container.innerHTML = `
                            <div class="upload-controls">
                                <button class="upload-media-btn">Upload Media</button>
                            </div>
                            <div class="media-items"></div>
                        `;
                        
                        // Add event listener
                        const uploadBtn = container.querySelector('.upload-media-btn');
                        if (uploadBtn) {
                            uploadBtn.addEventListener('click', () => {
                                if (window.profilesManager) {
                                    window.profilesManager.showMediaModal();
                                }
                            });
                        }
                    } else if (cat.type === 'text') {
                        container.innerHTML = `
                            <div class="text-controls">
                                <button class="add-text-btn">Add Text Entry</button>
                            </div>
                            <div class="text-entries">
                                <p>No entries yet. Click the button above to add one.</p>
                            </div>
                        `;
                        
                        // Add event listener
                        const addTextBtn = container.querySelector('.add-text-btn');
                        if (addTextBtn) {
                            addTextBtn.addEventListener('click', () => {
                                this.showTextEntryModal(cat.id);
                            });
                        }
                    }
                    
                    mediaGallery.appendChild(container);
                    console.log(`DEBUG: Created default container for ${cat.name}`);
                }
            });
            
            // Check if tab already exists (prevent duplicates)
            const existingTab = tabsContainer.querySelector(`.category-tab[data-category="${categoryId}"]`);
            if (existingTab) {
                console.log(`DEBUG: Tab for category ${categoryId} already exists, skipping creation`);
                return true;
            }
            
            // Find add tab
            const addTab = tabsContainer.querySelector('.add-tab');
            if (!addTab) {
                // Create add tab if it doesn't exist
                const newAddTab = document.createElement('div');
                newAddTab.className = 'category-tab add-tab';
                newAddTab.textContent = '+ Add Category';
                newAddTab.addEventListener('click', () => {
                    this.showAddCategoryModal();
                });
                tabsContainer.appendChild(newAddTab);
                console.log("DEBUG: Created new add category tab");
            }
            
            // Create the tab element
            const tab = document.createElement('div');
            tab.className = 'category-tab';
            tab.setAttribute('data-category', categoryId);
            tab.setAttribute('data-member-id', this.currentMemberId || ''); // Track which member this belongs to
            tab.textContent = categoryName;
            
            // Insert before add tab (if it exists)
            if (addTab) {
                tabsContainer.insertBefore(tab, addTab);
            } else {
                tabsContainer.appendChild(tab);
            }
            console.log(`DEBUG: Created tab for category ${categoryId}`);
            
            // Check if container already exists
            const existingContainer = document.getElementById(`${categoryId}-container`);
            if (existingContainer) {
                console.log(`DEBUG: Container for category ${categoryId} already exists, skipping creation`);
                return true;
            }
            
            // Create the container element
            const container = document.createElement('div');
            container.id = `${categoryId}-container`;
            container.className = 'category-content';
            container.setAttribute('data-member-id', this.currentMemberId || ''); // Track which member this belongs to
            
            // Add appropriate content based on type
            if (categoryType === 'media' || categoryType === 'mixed') {
                container.innerHTML = `
                    <div class="upload-controls">
                        <button class="upload-media-btn">Upload Media</button>
                    </div>
                    <div class="media-items"></div>
                `;
                
                // Add event listener to upload button
                const uploadBtn = container.querySelector('.upload-media-btn');
                if (uploadBtn) {
                    uploadBtn.addEventListener('click', () => {
                        if (window.profilesManager) {
                            window.profilesManager.showMediaModal();
                        }
                    });
                }
            }
            
            if (categoryType === 'text' || categoryType === 'mixed') {
                // If it's mixed type, add a separator
                if (categoryType === 'mixed') {
                    const separator = document.createElement('hr');
                    container.appendChild(separator);
                }
                
                const textControls = document.createElement('div');
                textControls.className = 'text-controls';
                textControls.innerHTML = `
                    <button class="add-text-btn">Add Text Entry</button>
                `;
                container.appendChild(textControls);
                
                // Add event listener to add text button
                const addTextBtn = textControls.querySelector('.add-text-btn');
                if (addTextBtn) {
                    addTextBtn.addEventListener('click', () => {
                        this.showTextEntryModal(categoryId);
                    });
                }
            }
            
            // Add the container to the DOM
            mediaGallery.appendChild(container);
            console.log(`DEBUG: Created container for category ${categoryId}`);
            
            // Verify the element was added successfully
            const addedContainer = document.getElementById(`${categoryId}-container`);
            if (!addedContainer) {
                console.error(`ERROR: Container for ${categoryId} was not successfully added to DOM`);
                return false;
            }
            
            // Add event listener to tab
            tab.addEventListener('click', () => {
                console.log(`DEBUG: Category tab ${categoryId} clicked`);
                this.switchCategory(categoryId);
            });
            
            console.log(`%cSuccessfully created category tab and container for ${categoryName} (${categoryId})`, 'color: green; font-weight: bold');
            return true;
        } catch (error) {
            console.error(`ERROR: Failed to create category tab and container for ${categoryName}:`, error);
            return false;
        }
    }

    /**
     * Add new category
     */
    addCategory() {
        // Get the form values directly from the DOM
        const categoryNameInput = document.getElementById('category-name');
        const categoryTypeSelect = document.getElementById('category-type');
        
        if (!categoryNameInput || !categoryTypeSelect) {
            console.error("ERROR: Category form elements not found");
            return;
        }
        
        const categoryName = categoryNameInput.value.trim();
        const categoryType = categoryTypeSelect.value;
        
        console.log(`DEBUG: Attempting to add category: ${categoryName} (${categoryType}) for member ${this.currentMemberId}`);
        
        // CRITICAL FIX: Ensure we have currentMemberId from profilesManager if not already set
        if (!this.currentMemberId && window.profilesManager) {
            console.log("DEBUG: Getting member ID from profilesManager");
            this.currentMemberId = window.profilesManager.currentMemberId;
        }
        
        if (!this.currentMemberId) {
            console.error("ERROR: Cannot add category - no member ID set");
            alert("Please select a member before adding categories");
            return;
        }
        
        if (!categoryName) {
            console.error("ERROR: Cannot add category - no name provided");
            alert('Please enter a category name');
            return;
        }
        
        // Generate ID from name (lowercase, replace spaces with dashes)
        const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-');
        console.log(`DEBUG: Generated category ID: ${categoryId}`);
        
        // Verify categories array exists
        if (!this.categories || !Array.isArray(this.categories)) {
            console.error("ERROR: Categories array is not initialized");
            this.categories = [...this.defaultCategories];
            console.log("DEBUG: Initialized categories with defaults");
        }
        
        // Check if ID already exists in current member's categories
        if (this.categories.some(cat => cat.id === categoryId)) {
            console.error(`ERROR: Category ${categoryId} already exists for member ${this.currentMemberId}`);
            alert('A category with this name already exists for this person');
            return;
        }
        
        const newCategory = {
            id: categoryId,
            name: categoryName,
            type: categoryType
        };
        
        console.log(`DEBUG: Adding new category to memory:`, newCategory);
        
        // Add to categories array first
        this.categories.push(newCategory);
        
        // Then save to localStorage
        this.saveCategories();
        
        // Then try to create UI elements
        try {
            console.log(`DEBUG: Creating UI elements for category ${categoryId}`);
            const success = this.createCategoryTabAndContainer(categoryId, categoryName, categoryType);
            
            if (success) {
                console.log(`DEBUG: Category ${categoryName} successfully created and added to UI`);
                
                // Hide modal and reset form
                const modal = document.getElementById('category-modal');
                if (modal) {
                    modal.classList.add('hidden');
                    const form = modal.querySelector('form');
                    if (form) form.reset();
                }
                
                // Switch to new category with a slight delay to ensure DOM updates are complete
                setTimeout(() => {
                    console.log(`DEBUG: Switching to newly created category ${categoryId} after short delay`);
                    this.switchCategory(categoryId);
                }, 100);
                
                // Show success message
                alert(`Category "${categoryName}" added successfully!`);
            } else {
                console.error(`ERROR: Failed to create UI elements for category ${categoryName}`);
                // Alert is handled in the createCategoryTabAndContainer method
            }
        } catch (error) {
            console.error(`ERROR: Exception while creating category UI: ${error.message}`);
            alert(`Error creating category: ${error.message}`);
        }
    }
    
    /**
     * Save categories to localStorage for current member
     */
    saveCategories() {
        if (!this.currentMemberId) {
            console.error('ERROR: Cannot save categories - no member ID set');
            return;
        }
        
        // Only save custom categories (not defaults)
        const customCategories = this.categories.filter(category => 
            !this.defaultCategories.some(def => def.id === category.id)
        );
        
        const storageKey = `mediaCategories_${this.currentMemberId}`;
        console.log(`DEBUG: Saving ${customCategories.length} custom categories to localStorage key: ${storageKey}`);
        console.log('DEBUG: Categories being saved:', JSON.stringify(customCategories));
        
        try {
            // Use a more specific storage format to avoid conflicts
            localStorage.setItem(storageKey, JSON.stringify(customCategories));
            console.log(`%cSaved ${customCategories.length} custom categories to database for member ${this.currentMemberId}`, 'color: green; font-weight: bold');
            
            // For debugging - compare with other members' categories
            const allStorage = { ...localStorage };
            const memberKeys = Object.keys(allStorage).filter(key => key.startsWith('mediaCategories_'));
            console.log(`DEBUG: Found ${memberKeys.length} members with saved categories`);
            
            memberKeys.forEach(key => {
                const memberId = key.replace('mediaCategories_', '');
                if (memberId !== this.currentMemberId) {
                    try {
                        const otherMemberCategories = JSON.parse(localStorage.getItem(key) || '[]');
                        console.log(`DEBUG: Member ${memberId} has ${otherMemberCategories.length} custom categories`);
                    } catch (error) {
                        console.error(`ERROR: Failed to parse categories for member ${memberId}:`, error);
                    }
                }
            });
        } catch (error) {
            console.error('ERROR: Failed to save categories to localStorage:', error);
            alert('Failed to save categories. Your browser storage might be full or restricted.');
        }
    }

    /**
     * Initialize category modal
     */
    initializeCategoryModal() {
        const categoryModal = document.getElementById('category-modal');
        if (!categoryModal) {
            console.error("ERROR: Category modal not found");
            return;
        }
        
        console.log("DEBUG: Initializing category modal");
        
        // Add event listener to form submission
        const categoryForm = document.getElementById('category-form');
        if (categoryForm) {
            // Remove any existing listeners first
            const newForm = categoryForm.cloneNode(true);
            categoryForm.parentNode.replaceChild(newForm, categoryForm);
            
            newForm.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("DEBUG: Category form submitted via form event");
                this.addCategory();
                return false;
            });
            
            // Directly handle the Add Category button
            const addButton = newForm.querySelector('button[type="submit"]');
            if (addButton) {
                addButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("DEBUG: Add Category button clicked directly");
                    this.addCategory();
                    return false;
                });
            }
        } else {
            console.error("ERROR: Category form not found");
        }
        
        // Add event listener to close button
        const closeButton = categoryModal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                console.log("DEBUG: Category modal close button clicked");
                categoryModal.classList.add('hidden');
            });
        }
        
        // Add event listener to cancel button
        const cancelButton = categoryModal.querySelector('.cancel-btn');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                console.log("DEBUG: Category modal cancel button clicked");
                categoryModal.classList.add('hidden');
            });
        }
        
        console.log("%cCategory modal successfully initialized", "color: green; font-weight: bold");
    }
    
    /**
     * Initialize tabs
     */
    initializeTabs() {
        // Add event listeners to category tabs
        const tabs = document.querySelectorAll('.category-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.getAttribute('data-category');
                console.log("DEBUG: Category tab clicked:", category);
                if (category) {
                    this.switchCategory(category);
                }
            });
        });
        
        // Add event listener to add category button
        const addCategoryBtn = document.querySelector('.add-tab');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => {
                console.log("DEBUG: Add category button clicked");
                this.showAddCategoryModal();
            });
        }
        
        // Add event listener to manage categories button
        const manageCategoriesBtn = document.querySelector('.manage-tab');
        if (manageCategoriesBtn) {
            manageCategoriesBtn.addEventListener('click', () => {
                console.log("DEBUG: Manage categories button clicked");
                this.showManageCategoriesModal();
            });
        }
        
        // Add event listener to category form
        const categoryForm = document.getElementById('category-form');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log("DEBUG: Category form submitted");
                this.addCategory();
            });
        }
        
        // Add event listeners to close modals
        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log("DEBUG: Close modal button clicked");
                btn.closest('.modal').classList.add('hidden');
            });
        });
        
        // Add event listener to fullscreen button - using direct global function reference
        const fullscreenBtn = document.getElementById('toggle-fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("DEBUG: Fullscreen button clicked");
                // Call global function directly instead of through this.toggleFullscreen
                window.toggleFullscreen();
            });
        }
    }
    
    /**
     * Initialize Notes tab
     */
    initializeNotesTab() {
        const addTextBtn = document.querySelector('#notes-container .add-text-btn');
        if (addTextBtn) {
            addTextBtn.addEventListener('click', () => {
                this.showTextEntryModal('notes');
            });
        }
    }
    
    /**
     * Create text entry modal
     */
    createTextEntryModal() {
        // Check if modal already exists
        if (document.getElementById('text-entry-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'text-entry-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add Text Entry</h2>
                    <button type="button" class="close-modal">&times;</button>
                </div>
                <form id="text-entry-form">
                    <input type="hidden" id="text-entry-id">
                    <input type="hidden" id="text-entry-category">
                    <div class="form-group">
                        <label for="text-entry-title">Title:</label>
                        <input type="text" id="text-entry-title" placeholder="Entry title">
                    </div>
                    <div class="form-group">
                        <label for="text-entry-content">Content:</label>
                        <textarea id="text-entry-content" rows="6" placeholder="Your text here"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="accent-btn">Save</button>
                        <button type="button" class="cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTextEntry();
        });
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
    
    /**
     * Show modal for adding text entry
     */
    showTextEntryModal(categoryId, entryId = null) {
        const modal = document.getElementById('text-entry-modal');
        if (!modal) return;
        
        document.getElementById('text-entry-category').value = categoryId;
        document.getElementById('text-entry-id').value = entryId || '';
        document.getElementById('text-entry-title').value = '';
        document.getElementById('text-entry-content').value = '';
        
        // If editing, populate with existing content
        if (entryId) {
            const entries = JSON.parse(localStorage.getItem(`textEntries_${this.currentMemberId}_${categoryId}`) || '[]');
            const entry = entries.find(e => e.id === entryId);
            if (entry) {
                document.getElementById('text-entry-title').value = entry.title || '';
                document.getElementById('text-entry-content').value = entry.content || '';
            }
        }
        
        modal.classList.remove('hidden');
    }
    
    /**
     * Save text entry
     */
    saveTextEntry() {
        const categoryId = document.getElementById('text-entry-category').value;
        const entryId = document.getElementById('text-entry-id').value;
        const title = document.getElementById('text-entry-title').value.trim();
        const content = document.getElementById('text-entry-content').value.trim();
        
        if (!content) {
            alert('Please enter some content');
            return;
        }
        
        // Get existing entries
        const entries = JSON.parse(localStorage.getItem(`textEntries_${this.currentMemberId}_${categoryId}`) || '[]');
        
        if (entryId) {
            // Update existing entry
            const index = entries.findIndex(e => e.id === entryId);
            if (index !== -1) {
                entries[index] = {
                    id: entryId,
                    title,
                    content,
                    date: entries[index].date
                };
            }
        } else {
            // Add new entry
            entries.push({
                id: Date.now().toString(),
                title,
                content,
                date: new Date().toISOString()
            });
        }
        
        // Save entries
        this.saveTextEntries(categoryId, entries);
        
        // Hide modal
        document.getElementById('text-entry-modal').classList.add('hidden');
        
        // Reload entries
        this.loadTextEntries(categoryId);
    }
    
    /**
     * Save text entries to localStorage
     */
    saveTextEntries(categoryId, entries) {
        if (!this.currentMemberId) return;
        localStorage.setItem(`textEntries_${this.currentMemberId}_${categoryId}`, JSON.stringify(entries));
    }
    
    /**
     * Load text entries from localStorage
     */
    loadTextEntries(categoryId) {
        if (!this.currentMemberId) return;
        
        const container = document.getElementById(`${categoryId}-container`);
        if (!container) return;
        
        // Get entries div or create it
        let entriesDiv = container.querySelector('.text-entries');
        if (!entriesDiv) {
            entriesDiv = document.createElement('div');
            entriesDiv.className = 'text-entries';
            container.appendChild(entriesDiv);
        }
        
        // Clear existing entries
        entriesDiv.innerHTML = '';
        
        // Load entries from localStorage
        const entries = JSON.parse(localStorage.getItem(`textEntries_${this.currentMemberId}_${categoryId}`) || '[]');
        
        if (entries.length === 0) {
            entriesDiv.innerHTML = '<p>No entries yet. Click the button above to add one.</p>';
            return;
        }
        
        // Sort entries by date (newest first)
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Create entry elements
        entries.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = 'text-entry';
            entryElement.dataset.id = entry.id;
            
            const title = entry.title || 'Untitled';
            const date = new Date(entry.date).toLocaleDateString();
            
            entryElement.innerHTML = `
                <div class="text-entry-header">
                    <h3>${title}</h3>
                    <span class="text-entry-date">${date}</span>
                </div>
                <div class="text-entry-content">${this.formatTextContent(entry.content)}</div>
                <div class="text-entry-actions">
                    <button class="edit-text-btn">Edit</button>
                    <button class="delete-text-btn">Delete</button>
                </div>
            `;
            
            // Add event listeners
            entryElement.querySelector('.edit-text-btn').addEventListener('click', () => {
                this.showTextEntryModal(categoryId, entry.id);
            });
            
            entryElement.querySelector('.delete-text-btn').addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this entry?')) {
                    const updatedEntries = entries.filter(e => e.id !== entry.id);
                    this.saveTextEntries(categoryId, updatedEntries);
                    this.loadTextEntries(categoryId);
                }
            });
            
            entriesDiv.appendChild(entryElement);
        });
    }
    
    /**
     * Format text content for display
     */
    formatTextContent(content) {
        // Convert line breaks to HTML
        content = content.replace(/\n/g, '<br>');
        
        // If content is over 300 characters, truncate and add expand button
        if (content.length > 300) {
            const shortContent = content.substring(0, 300) + '...';
            return `
                <div class="text-content collapsed">
                    <div class="text-preview">${shortContent}</div>
                    <div class="text-full hidden">${content}</div>
                    <button class="expand-text-btn">Read more</button>
                </div>
            `;
        }
        
        return content;
    }
    
    /**
     * Toggle fullscreen mode for profile
     */
    toggleFullscreen() {
        console.log("DEBUG: Global toggleFullscreen called");
        const profileContainer = document.getElementById('profile-container');
        const treeContainer = document.getElementById('tree-container');
        
        if (!profileContainer) {
            console.error("ERROR: Profile container not found");
            return;
        }
        
        // Simple toggle - much more reliable
        if (profileContainer.classList.contains('fullscreen')) {
            // Exit fullscreen
            profileContainer.classList.remove('fullscreen');
            if (treeContainer) treeContainer.classList.remove('hidden');
            
            // Update button text
            const fullscreenBtn = document.getElementById('toggle-fullscreen-btn');
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
                fullscreenBtn.title = 'View in fullscreen mode';
            }
            
            console.log("DEBUG: Exited fullscreen mode");
        } else {
            // Enter fullscreen
            profileContainer.classList.add('fullscreen');
            if (treeContainer) treeContainer.classList.add('hidden');
            
            // Update button text
            const fullscreenBtn = document.getElementById('toggle-fullscreen-btn');
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Fullscreen';
                fullscreenBtn.title = 'Exit fullscreen mode';
            }
            
            // Render timeline if available
            if (window.timelineManager) {
                window.timelineManager.renderTimeline();
            }
            
            console.log("DEBUG: Entered fullscreen mode");
        }
    }
    
    /**
     * Show modal for adding new category
     */
    showAddCategoryModal() {
        // CRITICAL FIX: First ensure we have the currentMemberId 
        if (!this.currentMemberId && window.profilesManager) {
            console.log("DEBUG: Getting member ID from profilesManager");
            this.currentMemberId = window.profilesManager.currentMemberId;
        }
        
        // Check if a member is selected
        if (!this.currentMemberId) {
            console.error("ERROR: Cannot add category - no member selected");
            alert("Please select a member before adding categories");
            return;
        }
        
        console.log(`DEBUG: Current member ID when showing modal: ${this.currentMemberId}`);
        
        const modal = document.getElementById('category-modal');
        if (!modal) {
            console.error("ERROR: Category modal not found");
            return;
        }
        
        console.log(`DEBUG: Showing add category modal for member ${this.currentMemberId}`);
        
        // Reset form
        const form = document.getElementById('category-form');
        if (form) {
            form.reset();
            console.log("DEBUG: Category form reset");
        }
        
        // Add member ID to a hidden field if it exists
        const memberIdField = document.getElementById('category-member-id');
        if (memberIdField) {
            memberIdField.value = this.currentMemberId;
            console.log(`DEBUG: Set member ID in form to ${this.currentMemberId}`);
        }
        
        // Show modal
        modal.classList.remove('hidden');
        console.log("%cCategory modal is now visible", "color: green; font-weight: bold");
        
        // Focus on the category name input
        const nameInput = document.getElementById('category-name');
        if (nameInput) {
            nameInput.focus();
        }
    }
    
    /**
     * Show modal for managing categories
     */
    showManageCategoriesModal() {
        // Implement category management functionality
        alert('Category management coming soon');
    }
    
    /**
     * Switch active category
     */
    switchCategory(categoryId) {
        console.log(`DEBUG: Switching to category ${categoryId}`);
        
        if (!categoryId) {
            console.error("ERROR: Attempted to switch to undefined category");
            return;
        }
        
        if (!this.categories) {
            console.error("ERROR: Categories not initialized yet");
            return;
        }
        
        // Log current categories
        console.log(`DEBUG: Current categories available:`, this.categories.map(c => `${c.name} (${c.id})`));
        
        // Check if category exists in our categories array
        const categoryExists = this.categories.some(c => c.id === categoryId);
        if (!categoryExists) {
            console.error(`ERROR: Attempted to switch to non-existent category: ${categoryId}`);
            // Check if we should fall back to 'photos'
            if (categoryId !== 'photos' && this.categories.some(c => c.id === 'photos')) {
                console.log(`DEBUG: Falling back to 'photos' category`);
                this.switchCategory('photos');
                return;
            }
        }
        
        // Update active tab
        const tabs = document.querySelectorAll('.category-tab');
        if (tabs.length === 0) {
            console.error("ERROR: No category tabs found in DOM");
            return;
        }
        
        console.log(`DEBUG: Found ${tabs.length} category tabs in DOM`);
        
        let tabFound = false;
        tabs.forEach(tab => {
            const tabCategory = tab.getAttribute('data-category');
            console.log(`DEBUG: Checking tab ${tabCategory} against ${categoryId}`);
            if (tabCategory === categoryId) {
                tab.classList.add('active');
                tabFound = true;
                console.log(`DEBUG: Activated tab for category ${categoryId}`);
            } else {
                tab.classList.remove('active');
            }
        });
        
        if (!tabFound) {
            console.error(`ERROR: Tab for category ${categoryId} not found in DOM`);
            console.log("DEBUG: Available tabs in DOM:", Array.from(tabs).map(tab => tab.getAttribute('data-category')));
            
            // Try to create the tab if it's in our categories but not in the DOM
            if (categoryExists) {
                console.log(`DEBUG: Category ${categoryId} exists in data but not in DOM, attempting to create it`);
                const category = this.categories.find(c => c.id === categoryId);
                if (category) {
                    const success = this.createCategoryTabAndContainer(category.id, category.name, category.type);
                    if (success) {
                        console.log(`DEBUG: Successfully created missing tab for ${categoryId}, retrying switch`);
                        // Try switching again now that we've created the tab
                        setTimeout(() => this.switchCategory(categoryId), 50);
                        return;
                    }
                }
            }
        }
        
        // Update active content
        const contents = document.querySelectorAll('.category-content');
        if (contents.length === 0) {
            console.error("ERROR: No category content containers found in DOM");
            return;
        }
        
        console.log(`DEBUG: Found ${contents.length} category content containers in DOM`);
        
        let contentFound = false;
        contents.forEach(content => {
            if (content.id === `${categoryId}-container`) {
                content.classList.add('active');
                contentFound = true;
                console.log(`DEBUG: Activated content for category ${categoryId}`);
            } else {
                content.classList.remove('active');
            }
        });
        
        if (!contentFound) {
            console.error(`ERROR: Content for category ${categoryId} not found in DOM`);
            console.log("DEBUG: Available content containers in DOM:", Array.from(contents).map(content => content.id));
        }
        
        // Update current category
        this.currentCategory = categoryId;
        console.log(`%cSuccessfully switched to category: ${categoryId}`, "color: green; font-weight: bold");
        
        // CRITICAL FIX: Ensure layout is properly applied after switching categories
        const mediaGallery = document.querySelector('.media-gallery');
        if (mediaGallery) {
            // Trigger layout recalculation by accessing offsetHeight and forcing a style update
            mediaGallery.style.display = 'none';
            // Force browser to process the style change
            void mediaGallery.offsetHeight;
            // Restore display
            mediaGallery.style.display = '';
        }
    }
    
    /**
     * Clear custom tabs and containers
     */
    clearCustomTabsAndContainers() {
        console.log("DEBUG: Clearing custom tabs and containers");
        
        // Get default category IDs for safer comparison
        const defaultCategoryIds = this.defaultCategories.map(cat => cat.id);
        console.log(`DEBUG: Default category IDs: ${defaultCategoryIds.join(', ')}`);
        
        // Remove custom tabs with more diagnostic info
        const customTabs = document.querySelectorAll('.category-tab:not([data-category="photos"]):not([data-category="videos"]):not([data-category="documents"]):not([data-category="notes"]):not(.add-tab):not(.manage-tab)');
        console.log(`DEBUG: Found ${customTabs.length} custom tabs to remove`);
        
        customTabs.forEach(tab => {
            const categoryId = tab.getAttribute('data-category');
            console.log(`DEBUG: Removing custom tab for category ${categoryId}`);
            tab.remove();
        });
        
        // Remove custom containers with more diagnostic info
        const customContainers = document.querySelectorAll('.category-content:not(#photos-container):not(#videos-container):not(#documents-container):not(#notes-container)');
        console.log(`DEBUG: Found ${customContainers.length} custom containers to remove`);
        
        customContainers.forEach(container => {
            console.log(`DEBUG: Removing custom container ${container.id}`);
            container.remove();
        });
        
        console.log("DEBUG: Custom tabs and containers cleared");
    }
}

/**
 * Add text entry to a category - updated to use modal
 */
function addTextEntry(categoryId) {
    if (window.mediaCategoryManager) {
        window.mediaCategoryManager.showTextEntryModal(categoryId);
    } else {
        console.error('MediaCategoryManager not available');
    }
}

// Global fullscreen toggle function - expose to window
window.toggleFullscreen = function() {
    console.log("DEBUG: Global toggleFullscreen called");
    const profileContainer = document.getElementById('profile-container');
    const treeContainer = document.getElementById('tree-container');
    
    if (!profileContainer) {
        console.error("ERROR: Profile container not found");
        return;
    }
    
    // Simple toggle - much more reliable
    if (profileContainer.classList.contains('fullscreen')) {
        // Exit fullscreen
        profileContainer.classList.remove('fullscreen');
        if (treeContainer) treeContainer.classList.remove('hidden');
        
        // Update button text
        const fullscreenBtn = document.getElementById('toggle-fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
            fullscreenBtn.title = 'View in fullscreen mode';
        }
        
        console.log("DEBUG: Exited fullscreen mode");
    } else {
        // Enter fullscreen
        profileContainer.classList.add('fullscreen');
        if (treeContainer) treeContainer.classList.add('hidden');
        
        // Update button text
        const fullscreenBtn = document.getElementById('toggle-fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Fullscreen';
            fullscreenBtn.title = 'Exit fullscreen mode';
        }
        
        // Render timeline if available
        if (window.timelineManager) {
            window.timelineManager.renderTimeline();
        }
        
        console.log("DEBUG: Entered fullscreen mode");
    }
};

// Add a direct initialization function for the fullscreen button
function initializeFullscreenButton() {
    console.log("DEBUG: Setting up fullscreen button");
    const fullscreenBtn = document.getElementById('toggle-fullscreen-btn');
    
    // First, remove any existing listeners by cloning the button
    if (fullscreenBtn) {
        const newButton = fullscreenBtn.cloneNode(true);
        fullscreenBtn.parentNode.replaceChild(newButton, fullscreenBtn);
        
        // Add a single click handler to the new button
        newButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation(); // Stop event propagation
            console.log("DEBUG: Fullscreen button clicked with direct handler");
            window.toggleFullscreen();
            return false; // Prevent default and bubbling
        };
        console.log("DEBUG: Fullscreen button initialized with direct handler");
    } else {
        console.error("ERROR: Fullscreen button not found in DOM");
    }
}

// Initialize profiles manager and related functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: DOM loaded, initializing application components");
    
    // Create ProfilesManager instance
    window.profilesManager = new ProfilesManager();
    
    // Create MediaCategoryManager instance 
    window.mediaCategoryManager = new MediaCategoryManager();
    
    // Create TimelineManager instance
    window.timelineManager = new TimelineManager();
    
    // Setup profile photo upload
    setupProfilePhotoUpload();
    
    // Initialize the fullscreen button with the direct handler
    initializeFullscreenButton();
    
    console.log("DEBUG: Application components initialized successfully");
});