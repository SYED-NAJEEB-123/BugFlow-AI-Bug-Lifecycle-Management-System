from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.extensions import db
from app.models.user import User, ActivityLog
from app.models.project import Project, ProjectMember
from app.utils.decorators import role_required

projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')

def generate_unique_key(name):
    """Generate uppercase 3-5 letter key from project name."""
    words = [w.strip().upper() for w in name.split() if w.strip()]
    if len(words) >= 2:
        candidate = "".join([w[0] for w in words[:4]])
    elif len(words) == 1:
        candidate = words[0][:4]
    else:
        candidate = "PRJ"

    candidate = "".join([c for c in candidate if c.isalnum()])
    if len(candidate) < 2:
        candidate = "PRJ"

    base = candidate
    count = 1
    while Project.query.filter_by(key=candidate).first():
        candidate = f"{base}{count}"
        count += 1

    return candidate

@projects_bp.route('', methods=['GET'])
@jwt_required()
def get_projects():
    """
    Get Projects List
    ---
    tags:
      - Projects
    summary: Retrieve list of active projects with optional search query and status filter
    security:
      - Bearer: []
    parameters:
      - name: q
        in: query
        type: string
        required: false
        description: Search term for project name, key, or description
      - name: status
        in: query
        type: string
        required: false
        enum: [Active, Completed, Archived]
        description: Filter projects by status
    responses:
      200:
        description: List of projects
      401:
        description: Unauthorized token
    """
    search_q = request.args.get('q', '').strip()
    status_filter = request.args.get('status', '').strip()

    query = Project.query

    if search_q:
        search_pattern = f"%{search_q}%"
        query = query.filter(
            (Project.name.ilike(search_pattern)) |
            (Project.key.ilike(search_pattern)) |
            (Project.description.ilike(search_pattern))
        )

    if status_filter:
        query = query.filter_by(status=status_filter)

    projects = query.order_by(Project.updated_at.desc()).all()
    return jsonify({
        'count': len(projects),
        'projects': [p.to_dict() for p in projects]
    }), 200

@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """
    Get Project Details by ID
    ---
    tags:
      - Projects
    summary: Retrieve detailed info for a specific project
    security:
      - Bearer: []
    parameters:
      - name: project_id
        in: path
        type: integer
        required: true
        description: ID of target project
    responses:
      200:
        description: Project detail object
      401:
        description: Unauthorized token
      404:
        description: Project not found
    """
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
        
    return jsonify({'project': project.to_dict()}), 200

@projects_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['Admin', 'Project Manager'])
def create_project():
    """
    Create New Project (Admin / Project Manager)
    ---
    tags:
      - Projects
    summary: Create a new software project workspace
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
              example: BugFlow Core Platform
            key:
              type: string
              example: BUG
            description:
              type: string
              example: Main software defect tracking repository
            status:
              type: string
              enum: [Active, Completed, Archived]
              example: Active
            target_end_date:
              type: string
              example: "2026-12-31"
            member_ids:
              type: array
              items:
                type: integer
              example: [1, 2, 3]
    responses:
      201:
        description: Project created successfully
      400:
        description: Validation error
      401:
        description: Unauthorized token
      403:
        description: Forbidden (Admin / PM role required)
      409:
        description: Project key conflict
    """
    data = request.get_json() or {}
    user_id = int(get_jwt_identity())

    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    key = data.get('key', '').strip().upper()
    status = data.get('status', 'Active')
    target_end_date_str = data.get('target_end_date')
    member_ids = data.get('member_ids', [])

    if not name:
        return jsonify({'error': 'Project name is required'}), 400

    if not key:
        key = generate_unique_key(name)
    elif Project.query.filter_by(key=key).first():
        return jsonify({'error': f'Project key "{key}" is already taken'}), 409

    target_end_date = None
    if target_end_date_str:
        try:
            target_end_date = datetime.fromisoformat(target_end_date_str.replace('Z', ''))
        except ValueError:
            pass

    project = Project(
        name=name,
        key=key,
        description=description,
        owner_id=user_id,
        status=status,
        target_end_date=target_end_date
    )
    db.session.add(project)
    db.session.commit()

    # Add owner as project member
    owner_member = ProjectMember(project_id=project.id, user_id=user_id, role_in_project='Lead')
    db.session.add(owner_member)

    # Add other selected member IDs
    for m_id in member_ids:
        if m_id != user_id and db.session.get(User, m_id):
            pm = ProjectMember(project_id=project.id, user_id=m_id, role_in_project='Member')
            db.session.add(pm)

    db.session.commit()

    log = ActivityLog(
        user_id=user_id,
        action='CREATE_PROJECT',
        entity_type='Project',
        entity_id=project.id,
        details=f'Created project "{name}" ({key})'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'Project created successfully',
        'project': project.to_dict()
    }), 201

@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
@role_required(['Admin', 'Project Manager'])
def update_project(project_id):
    """
    Update Project Details (Admin / Project Manager)
    ---
    tags:
      - Projects
    summary: Modify project name, description, status, or member list
    security:
      - Bearer: []
    parameters:
      - name: project_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
            description:
              type: string
            status:
              type: string
              enum: [Active, Completed, Archived]
            progress_percentage:
              type: number
            target_end_date:
              type: string
            member_ids:
              type: array
              items:
                type: integer
    responses:
      200:
        description: Project updated successfully
      401:
        description: Unauthorized token
      403:
        description: Forbidden (Admin / PM role required)
      404:
        description: Project not found
    """
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    data = request.get_json() or {}
    user_id = int(get_jwt_identity())

    if 'name' in data and data['name'].strip():
        project.name = data['name'].strip()
    if 'description' in data:
        project.description = data['description'].strip()
    if 'status' in data and data['status'] in ['Active', 'Completed', 'Archived']:
        project.status = data['status']
    if 'progress_percentage' in data:
        try:
            project.progress_percentage = float(data['progress_percentage'])
        except (ValueError, TypeError):
            pass
    if 'target_end_date' in data:
        if data['target_end_date']:
            try:
                project.target_end_date = datetime.fromisoformat(data['target_end_date'].replace('Z', ''))
            except ValueError:
                pass
        else:
            project.target_end_date = None

    if 'member_ids' in data and isinstance(data['member_ids'], list):
        # Update members
        ProjectMember.query.filter_by(project_id=project.id).delete()
        for m_id in data['member_ids']:
            if db.session.get(User, m_id):
                pm = ProjectMember(
                    project_id=project.id,
                    user_id=m_id,
                    role_in_project='Lead' if m_id == project.owner_id else 'Member'
                )
                db.session.add(pm)

    db.session.commit()

    log = ActivityLog(
        user_id=user_id,
        action='UPDATE_PROJECT',
        entity_type='Project',
        entity_id=project.id,
        details=f'Updated project "{project.name}"'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'Project updated successfully',
        'project': project.to_dict()
    }), 200

@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_required()
@role_required(['Admin', 'Project Manager'])
def delete_project(project_id):
    """
    Delete Project (Admin / Project Manager)
    ---
    tags:
      - Projects
    summary: Remove project workspace and associated defects
    security:
      - Bearer: []
    parameters:
      - name: project_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Project deleted successfully
      401:
        description: Unauthorized token
      403:
        description: Forbidden (Admin / PM role required)
      404:
        description: Project not found
    """
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    user_id = int(get_jwt_identity())
    name = project.name
    key = project.key

    db.session.delete(project)
    db.session.commit()

    log = ActivityLog(
        user_id=user_id,
        action='DELETE_PROJECT',
        entity_type='Project',
        entity_id=project_id,
        details=f'Deleted project "{name}" ({key})'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': f'Project "{name}" deleted successfully'}), 200

@projects_bp.route('/<int:project_id>/members', methods=['POST'])
@jwt_required()
@role_required(['Admin', 'Project Manager'])
def add_project_member(project_id):
    """
    Add Project Member
    ---
    tags:
      - Projects
    summary: Assign user to a project workspace
    security:
      - Bearer: []
    parameters:
      - name: project_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - user_id
          properties:
            user_id:
              type: integer
            role_in_project:
              type: string
              example: Member
    responses:
      200:
        description: Member added successfully
      400:
        description: Invalid user_id
      401:
        description: Unauthorized token
      404:
        description: Project not found
    """
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    data = request.get_json() or {}
    user_id_to_add = data.get('user_id')
    role_in_project = data.get('role_in_project', 'Member')

    if not user_id_to_add or not db.session.get(User, user_id_to_add):
        return jsonify({'error': 'Valid user_id is required'}), 400

    existing = ProjectMember.query.filter_by(project_id=project_id, user_id=user_id_to_add).first()
    if existing:
        existing.role_in_project = role_in_project
    else:
        member = ProjectMember(project_id=project_id, user_id=user_id_to_add, role_in_project=role_in_project)
        db.session.add(member)

    db.session.commit()
    return jsonify({'message': 'Project member added successfully', 'project': project.to_dict()}), 200

@projects_bp.route('/<int:project_id>/members/<int:user_id_to_remove>', methods=['DELETE'])
@jwt_required()
@role_required(['Admin', 'Project Manager'])
def remove_project_member(project_id, user_id_to_remove):
    """
    Remove Project Member
    ---
    tags:
      - Projects
    summary: Unassign user from project workspace
    security:
      - Bearer: []
    parameters:
      - name: project_id
        in: path
        type: integer
        required: true
      - name: user_id_to_remove
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Member removed from project
      401:
        description: Unauthorized token
      404:
        description: Project member not found
    """
    member = ProjectMember.query.filter_by(project_id=project_id, user_id=user_id_to_remove).first()
    if not member:
        return jsonify({'error': 'Project member not found'}), 404

    db.session.delete(member)
    db.session.commit()
    return jsonify({'message': 'Member removed from project'}), 200
