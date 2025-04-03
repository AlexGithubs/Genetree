# Genetree

# 🌳 Family Tree Application with Customizable Profiles

## 🧭 Project Overview
An interactive web application to build and explore family trees with rich, customizable member profiles. Add relationships, media, and personal stories. The app focuses on clarity, modularity, and usability.

---

## 🚀 Features

### 👤 Member Management
- Add, edit, and delete members
- Profiles include:
  - **Basic Info**: Name, gender, birth date, death date
  - **Extended Info**: Biography, notes, and custom fields (e.g., hobbies)
  - **Media Uploads**: Photos and videos

### 🔗 Relationship Management
- Define and edit relationships:
  - Parent–Child  
  - Sibling  
  - Spouse  
  - Custom/Non-traditional  
- Multiple relationships per person supported

### 🧬 Family Tree Visualization
- Clean, interactive visual layout
- Expand/collapse branches
- Click on members to view full profile
- Distinct generation levels and relationship indicators

### 🎨 UI/UX
- Responsive design (mobile/tablet/desktop)
- Form-based editing
- Color-coded or icon-labeled relationship types

---

## 🛠️ Backend – Flask API

### Endpoints
```http
POST /members           # Add a new member
GET /members/<id>       # Get member profile
PUT /members/<id>       # Edit a member
DELETE /members/<id>    # Delete a member
POST /relationships     # Define a new relationship
GET /family_tree        # Get entire tree as JSON
