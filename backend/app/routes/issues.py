import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User, ActivityLog
from app.models.project import Project
from app.models.issue import (
    Issue, IssueAttachment, IssueComment, IssueHistory, 
    DefectResolutionKnowledge, VALID_STATUSES, VALID_SEVERITIES, VALID_PRIORITIES
)
from app.services.embedding_service import EmbeddingService
from app.utils.decorators import role_required

issues_bp = Blueprint('issues', __name__, url_prefix='/api/issues')

def generate_issue_key(project):
    """Generate key like BUG-101 based on project key."""
    prefix = project.key if project else "BUG"
    count = Issue.query.filter_by(project_id=project.id).count() + 1
    key = f"{prefix}-{count:03d}"
    while Issue.query.filter_by(issue_key=key).first():
        count += 1
        key = f"{prefix}-{count:03d}"
    return key

@issues_bp.route('', methods=['GET'])
@jwt_required()
def get_issues():
    """
    List Defects / Issues
    ---
    tags:
      - Defects
    summary: Search and filter workspace defects with keyword and role-based filtering
    security:
      - Bearer: []
    parameters:
      - name: project_id
        in: query
        type: integer
      - name: sprint_id
        in: query
        type: integer
      - name: status
        in: query
        type: string
      - name: severity
        in: query
        type: string
      - name: priority
        in: query
        type: string
      - name: assignee_id
        in: query
        type: integer
      - name: reporter_id
        in: query
        type: integer
      - name: q
        in: query
        type: string
        description: Keyword search across title and description
    responses:
      200:
        description: List of matching defect objects
      401:
        description: Unauthorized token
    """
    project_id = request.args.get('project_id', type=int)
    sprint_id = request.args.get('sprint_id', type=int)
    status_filter = request.args.get('status', '').strip()
    severity_filter = request.args.get('severity', '').strip()
    priority_filter = request.args.get('priority', '').strip()
    assignee_id = request.args.get('assignee_id', type=int)
    reporter_id = request.args.get('reporter_id', type=int)
    search_q = request.args.get('q', '').strip()

    query = Issue.query

    if project_id:
        query = query.filter_by(project_id=project_id)
    if sprint_id:
        query = query.filter_by(sprint_id=sprint_id)
    if status_filter:
        query = query.filter_by(status=status_filter)
    if severity_filter:
        query = query.filter_by(severity=severity_filter)
    if priority_filter:
        query = query.filter_by(priority=priority_filter)
    if assignee_id:
        query = query.filter_by(assignee_id=assignee_id)
    if reporter_id:
        query = query.filter_by(reporter_id=reporter_id)

    if search_q:
        search_pattern = f"%{search_q}%"
        query = query.filter(
            (Issue.title.ilike(search_pattern)) |
            (Issue.description.ilike(search_pattern)) |
            (Issue.issue_key.ilike(search_pattern))
        )

    # Role-based restriction: Reporters only see their own reported issues
    user_id = int(get_jwt_identity())
    current_user = db.session.get(User, user_id)
    if current_user and current_user.role == 'Reporter':
        query = query.filter_by(reporter_id=user_id)

    issues = query.order_by(Issue.created_at.desc()).all()
    return jsonify({
        'count': len(issues),
        'issues': [i.to_dict() for i in issues]
    }), 200

@issues_bp.route('/<int:issue_id>', methods=['GET'])
@jwt_required()
def get_issue(issue_id):
    """
    Get Defect Details by ID
    ---
    tags:
      - Defects
    summary: Retrieve detailed defect report, history, attachments, and comments
    security:
      - Bearer: []
    parameters:
      - name: issue_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Defect detail object
      401:
        description: Unauthorized token
      404:
        description: Defect not found
    """
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({'error': 'Defect not found'}), 404

    # Role-based check
    user_id = int(get_jwt_identity())
    current_user = db.session.get(User, user_id)
    if current_user and current_user.role == 'Reporter' and issue.reporter_id != user_id:
        return jsonify({'error': 'Forbidden: You can only view defects reported by yourself.'}), 403

    data = issue.to_dict()
    data['attachments'] = [a.to_dict() for a in issue.attachments]
    data['comments'] = [c.to_dict() for c in issue.comments]
    data['history'] = [h.to_dict() for h in issue.history]

    return jsonify({'issue': data}), 200

@issues_bp.route('', methods=['POST'])
@jwt_required()
def create_issue():
    """
    Create Defect Report
    ---
    tags:
      - Defects
    summary: Report a new software bug in a project
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - project_id
            - title
            - description
          properties:
            project_id:
              type: integer
            title:
              type: string
            description:
              type: string
            severity:
              type: string
              enum: [Low, Medium, High, Critical]
            priority:
              type: string
              enum: [Low, Medium, High, Critical, Urgent]
            category:
              type: string
            module:
              type: string
            environment:
              type: string
            assignee_id:
              type: integer
            sprint_id:
              type: integer
            steps_to_reproduce:
              type: string
            expected_behavior:
              type: string
            actual_behavior:
              type: string
    responses:
      201:
        description: Defect reported successfully
      400:
        description: Missing required fields or invalid payload
      401:
        description: Unauthorized token
      404:
        description: Project not found
    """
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    project_id = data.get('project_id')
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()

    if not project_id or not title or not description:
        return jsonify({'error': 'Missing required fields: project_id, title, description'}), 400

    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    severity = data.get('severity', 'Medium')
    if severity not in VALID_SEVERITIES:
        severity = 'Medium'

    priority = data.get('priority', 'Medium')
    if priority not in VALID_PRIORITIES:
        priority = 'Medium'

    raw_assignee = data.get('assignee_id')
    assignee_id = int(raw_assignee) if raw_assignee and str(raw_assignee).strip() not in ['', '0', 'null'] else None

    raw_sprint = data.get('sprint_id')
    sprint_id = int(raw_sprint) if raw_sprint and str(raw_sprint).strip() not in ['', '0', 'null'] else None

    issue_key = generate_issue_key(project)

    try:
        issue = Issue(
            issue_key=issue_key,
            project_id=project_id,
            sprint_id=sprint_id,
            title=title,
            description=description,
            expected_behavior=data.get('expected_behavior', '').strip(),
            actual_behavior=data.get('actual_behavior', '').strip(),
            steps_to_reproduce=data.get('steps_to_reproduce', '').strip(),
            category=data.get('category', 'General').strip() or 'General',
            module=data.get('module', 'General').strip() or 'General',
            defect_type=data.get('defect_type', 'Functional Defect').strip() or 'Functional Defect',
            severity=severity,
            priority=priority,
            status=data.get('status', '').strip() or ('Assigned' if assignee_id else 'Reported'),
            environment=data.get('environment', 'Development').strip() or 'Development',
            reporter_id=user_id,
            assignee_id=assignee_id,
            ai_enhanced=bool(data.get('ai_enhanced', False)),
            vision_analyzed=bool(data.get('vision_analyzed', False))
        )

        db.session.add(issue)
        db.session.commit()

        # Record history log
        hist = IssueHistory(
            issue_id=issue.id,
            user_id=user_id,
            field_changed='STATUS',
            old_value=None,
            new_value=issue.status
        )
        db.session.add(hist)

        log = ActivityLog(
            user_id=user_id,
            action='CREATE_DEFECT',
            entity_type='Issue',
            entity_id=issue.id,
            details=f'Created defect {issue.issue_key}: "{issue.title}"'
        )
        db.session.add(log)
        db.session.commit()

        # Sync vector embedding for RAG & similarity search
        EmbeddingService.sync_defect_embedding(issue)

        return jsonify({
            'success': True,
            'message': 'Issue created successfully',
            'issue': issue.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to create defect in database: {e}")
        return jsonify({
            'success': False,
            'error': f"Failed to save defect to database: {str(e)}"
        }), 500

@issues_bp.route('/<int:issue_id>', methods=['PUT'])
@jwt_required()
def update_issue(issue_id):
    """
    Update Defect Details
    ---
    tags:
      - Defects
    summary: Modify defect fields, severity, priority, or root cause details
    security:
      - Bearer: []
    parameters:
      - name: issue_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            title:
              type: string
            description:
              type: string
            severity:
              type: string
            priority:
              type: string
            category:
              type: string
            module:
              type: string
            assignee_id:
              type: integer
            sprint_id:
              type: integer
            root_cause:
              type: string
            suggested_fix:
              type: string
    responses:
      200:
        description: Defect updated successfully
      401:
        description: Unauthorized token
      403:
        description: Action forbidden by role
      404:
        description: Defect not found
    """
    user_id = int(get_jwt_identity())
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({'error': 'Defect not found'}), 404

    current_user = db.session.get(User, user_id)
    if current_user and current_user.role == 'Reporter':
        if issue.reporter_id != user_id:
            return jsonify({'error': 'Forbidden: You cannot modify defects reported by other users.'}), 403
        if issue.status not in ['Reported', 'New', 'Open']:
            return jsonify({'error': 'Forbidden: This issue is currently being processed and can no longer be modified.'}), 403

    data = request.get_json() or {}

    try:
        if 'title' in data and data['title'].strip():
            issue.title = data['title'].strip()
        if 'description' in data and data['description'].strip():
            issue.description = data['description'].strip()
        if 'expected_behavior' in data:
            issue.expected_behavior = data['expected_behavior'].strip()
        if 'actual_behavior' in data:
            issue.actual_behavior = data['actual_behavior'].strip()
        if 'steps_to_reproduce' in data:
            issue.steps_to_reproduce = data['steps_to_reproduce'].strip()
        if 'root_cause' in data:
            issue.root_cause = data['root_cause'].strip()
        if 'suggested_fix' in data:
            issue.suggested_fix = data['suggested_fix'].strip()

        if 'severity' in data and data['severity'] in VALID_SEVERITIES:
            issue.severity = data['severity']
        if 'priority' in data and data['priority'] in VALID_PRIORITIES:
            issue.priority = data['priority']
        if 'category' in data and data['category'].strip():
            issue.category = data['category'].strip()
        if 'module' in data and data['module'].strip():
            issue.module = data['module'].strip()

        if 'assignee_id' in data:
            old_assignee = issue.assignee_id
            raw_new = data['assignee_id']
            new_assignee = int(raw_new) if raw_new and str(raw_new).strip() not in ['', '0', 'null'] else None
            if old_assignee != new_assignee:
                issue.assignee_id = new_assignee
                hist = IssueHistory(
                    issue_id=issue.id,
                    user_id=user_id,
                    field_changed='ASSIGNEE',
                    old_value=str(old_assignee),
                    new_value=str(new_assignee)
                )
                db.session.add(hist)
                if new_assignee and issue.status in ['Reported', 'New', 'Open']:
                    old_st = issue.status
                    issue.status = 'Assigned'
                    hist_st = IssueHistory(
                        issue_id=issue.id,
                        user_id=user_id,
                        field_changed='STATUS',
                        old_value=str(old_st),
                        new_value='Assigned'
                    )
                    db.session.add(hist_st)

        if 'sprint_id' in data:
            old_sprint = issue.sprint_id
            raw_sp = data['sprint_id']
            new_sprint = int(raw_sp) if raw_sp and str(raw_sp).strip() not in ['', '0', 'null'] else None
            if old_sprint != new_sprint:
                issue.sprint_id = new_sprint
                hist = IssueHistory(
                    issue_id=issue.id,
                    user_id=user_id,
                    field_changed='SPRINT',
                    old_value=str(old_sprint),
                    new_value=str(new_sprint)
                )
                db.session.add(hist)

        db.session.commit()

        log = ActivityLog(
            user_id=user_id,
            action='UPDATE_DEFECT',
            entity_type='Issue',
            entity_id=issue.id,
            details=f'Updated defect {issue.issue_key}'
        )
        db.session.add(log)
        db.session.commit()

        # Update vector embedding
        EmbeddingService.sync_defect_embedding(issue)

        return jsonify({
            'success': True,
            'message': 'Defect updated successfully',
            'issue': issue.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f"Failed to update defect in database: {str(e)}"
        }), 500

@issues_bp.route('/<int:issue_id>/status', methods=['PUT'])
@jwt_required()
def transition_status(issue_id):
    """
    Transition Defect Workflow Status
    ---
    tags:
      - Defects
    summary: Transition defect through workflow state machine (Reported -> Assigned -> In Progress -> In Review -> Resolved -> Verified -> Closed)
    security:
      - Bearer: []
    parameters:
      - name: issue_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - status
          properties:
            status:
              type: string
              enum: [Reported, Assigned, In Progress, In Review, Resolved, Verified, Closed, Reopened]
            root_cause:
              type: string
            resolution_summary:
              type: string
    responses:
      200:
        description: Status transitioned successfully
      400:
        description: Invalid status
      401:
        description: Unauthorized token
      403:
        description: Forbidden (Reporters cannot change workflow status)
      404:
        description: Defect not found
    """
    user_id = int(get_jwt_identity())
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({'error': 'Defect not found'}), 404

    current_user = db.session.get(User, user_id)
    if current_user and current_user.role == 'Reporter':
        return jsonify({'error': 'Forbidden: Reporters cannot change workflow status.'}), 403

    data = request.get_json() or {}
    new_status = data.get('status', '').strip()

    if new_status not in VALID_STATUSES:
        return jsonify({'error': f'Invalid status. Must be one of: {", ".join(VALID_STATUSES)}'}), 400

    old_status = issue.status
    if old_status == new_status:
        return jsonify({'message': 'Status unchanged', 'issue': issue.to_dict()}), 200

    try:
        issue.status = new_status
        if 'root_cause' in data and data['root_cause']:
            issue.root_cause = data['root_cause'].strip()
        if 'resolution_summary' in data and data['resolution_summary']:
            issue.suggested_fix = data['resolution_summary'].strip()

        hist = IssueHistory(
            issue_id=issue.id,
            user_id=user_id,
            field_changed='STATUS',
            old_value=old_status,
            new_value=new_status
        )
        db.session.add(hist)

        # Capture DefectResolutionKnowledge when resolved or closed
        if new_status in ['Resolved', 'Closed'] and (issue.root_cause or issue.suggested_fix):
            know = DefectResolutionKnowledge(
                issue_id=issue.id,
                issue_key=issue.issue_key,
                title=issue.title,
                category=issue.category,
                root_cause=issue.root_cause,
                resolution_summary=issue.suggested_fix
            )
            db.session.add(know)

        log = ActivityLog(
            user_id=user_id,
            action='TRANSITION_STATUS',
            entity_type='Issue',
            entity_id=issue.id,
            details=f'Transitioned {issue.issue_key} status from {old_status} to {new_status}'
        )
        db.session.add(log)
        db.session.commit()

        # Sync vector embedding
        EmbeddingService.sync_defect_embedding(issue)

        return jsonify({
            'success': True,
            'message': f'Status changed to {new_status}',
            'issue': issue.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Status transition failed: {str(e)}"}), 500

@issues_bp.route('/<int:issue_id>/assign', methods=['PUT'])
@jwt_required()
def assign_issue(issue_id):
    """
    Assign Developer to Defect
    ---
    tags:
      - Defects
    summary: Assign or reassign developer to a defect
    security:
      - Bearer: []
    parameters:
      - name: issue_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            assignee_id:
              type: integer
    responses:
      200:
        description: Defect assigned successfully
      401:
        description: Unauthorized token
      403:
        description: Forbidden (Reporters cannot assign developers)
      404:
        description: Defect not found
    """
    user_id = int(get_jwt_identity())
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({'error': 'Defect not found'}), 404

    current_user = db.session.get(User, user_id)
    if current_user and current_user.role == 'Reporter':
        return jsonify({'error': 'Forbidden: Reporters cannot assign developers.'}), 403

    data = request.get_json() or {}
    raw_assignee = data.get('assignee_id')
    new_assignee = int(raw_assignee) if raw_assignee and str(raw_assignee).strip() not in ['', '0', 'null'] else None

    old_assignee = issue.assignee_id
    if old_assignee != new_assignee:
        issue.assignee_id = new_assignee
        hist = IssueHistory(
            issue_id=issue.id,
            user_id=user_id,
            field_changed='ASSIGNEE',
            old_value=str(old_assignee),
            new_value=str(new_assignee)
        )
        db.session.add(hist)

        if new_assignee and issue.status in ['Reported', 'New', 'Open']:
            old_st = issue.status
            issue.status = 'Assigned'
            hist_st = IssueHistory(
                issue_id=issue.id,
                user_id=user_id,
                field_changed='STATUS',
                old_value=str(old_st),
                new_value='Assigned'
            )
            db.session.add(hist_st)

        log = ActivityLog(
            user_id=user_id,
            action='ASSIGN_DEFECT',
            entity_type='Issue',
            entity_id=issue.id,
            details=f'Assigned defect {issue.issue_key} to user_id {new_assignee}'
        )
        db.session.add(log)
        db.session.commit()

        EmbeddingService.sync_defect_embedding(issue)

    return jsonify({
        'success': True,
        'message': 'Defect assigned successfully',
        'issue': issue.to_dict()
    }), 200

@issues_bp.route('/<int:issue_id>/comments', methods=['GET'])
@jwt_required()
def get_comments(issue_id):
    """
    Get Defect Discussion Comments
    ---
    tags:
      - Defects
    summary: List all discussion notes & comments posted on a defect
    security:
      - Bearer: []
    parameters:
      - name: issue_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: List of discussion comments
      401:
        description: Unauthorized token
      404:
        description: Defect not found
    """
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({'error': 'Defect not found'}), 404
    comments = IssueComment.query.filter_by(issue_id=issue.id).order_by(IssueComment.created_at.asc()).all()
    return jsonify({
        'comments': [c.to_dict() for c in comments]
    }), 200

@issues_bp.route('/<int:issue_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(issue_id):
    """
    Add Defect Discussion Comment
    ---
    tags:
      - Defects
    summary: Post technical comment or note on a defect
    security:
      - Bearer: []
    parameters:
      - name: issue_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - content
          properties:
            content:
              type: string
            is_ai_generated:
              type: boolean
    responses:
      201:
        description: Comment posted successfully
      400:
        description: Empty content
      401:
        description: Unauthorized token
      404:
        description: Defect not found
    """
    user_id = int(get_jwt_identity())
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({'error': 'Defect not found'}), 404

    data = request.get_json() or {}
    content = data.get('content', '').strip()
    is_ai_generated = bool(data.get('is_ai_generated', False))

    if not content:
        return jsonify({'error': 'Comment content cannot be empty'}), 400

    comment = IssueComment(
        issue_id=issue.id,
        user_id=user_id,
        content=content,
        is_ai_generated=is_ai_generated
    )
    db.session.add(comment)

    log = ActivityLog(
        user_id=user_id,
        action='ADD_COMMENT',
        entity_type='Issue',
        entity_id=issue.id,
        details=f'Added comment on defect {issue.issue_key}'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'Comment added successfully',
        'comment': comment.to_dict()
    }), 201

@issues_bp.route('/<int:issue_id>/attachments', methods=['POST'])
@jwt_required()
def upload_attachment(issue_id):
    """
    Upload File Attachment
    ---
    tags:
      - Defects
    summary: Upload log file or screenshot attachment for a defect
    security:
      - Bearer: []
    parameters:
      - name: issue_id
        in: path
        type: integer
        required: true
      - in: formData
        name: file
        type: file
        required: true
        description: Attachment file (PNG, JPG, PDF, TXT, LOG)
    responses:
      201:
        description: Attachment uploaded successfully
      400:
        description: No file uploaded or extension disallowed
      401:
        description: Unauthorized token
      404:
        description: Defect not found
    """
    user_id = int(get_jwt_identity())
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({'error': 'Defect not found'}), 404

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    original_filename = secure_filename(file.filename)
    extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''

    if extension not in current_app.config['ALLOWED_EXTENSIONS']:
        return jsonify({'error': f'File extension .{extension} is not allowed'}), 400

    unique_filename = f"{uuid.uuid4().hex}_{original_filename}"
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, unique_filename)

    file.save(file_path)

    attachment = IssueAttachment(
        issue_id=issue.id,
        filename=original_filename,
        file_path=unique_filename,
        file_type=file.content_type,
        uploaded_by_id=user_id
    )
    db.session.add(attachment)

    log = ActivityLog(
        user_id=user_id,
        action='UPLOAD_ATTACHMENT',
        entity_type='Issue',
        entity_id=issue.id,
        details=f'Uploaded attachment {original_filename} on defect {issue.issue_key}'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'Attachment uploaded successfully',
        'attachment': attachment.to_dict()
    }), 201

@issues_bp.route('/attachments/<filename>', methods=['GET'])
def get_attachment_file(filename):
    """
    Download / View File Attachment
    ---
    tags:
      - Defects
    summary: Stream attachment file by filename
    parameters:
      - name: filename
        in: path
        type: string
        required: true
    responses:
      200:
        description: File stream
      404:
        description: File not found
    """
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)

@issues_bp.route('/<int:issue_id>', methods=['DELETE'])
@jwt_required()
def delete_issue(issue_id):
    """
    Delete Defect Report
    ---
    tags:
      - Defects
    summary: Delete defect record if authorized
    security:
      - Bearer: []
    parameters:
      - name: issue_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Defect deleted successfully
      401:
        description: Unauthorized token
      403:
        description: Action forbidden
      404:
        description: Defect not found
    """
    user_id = int(get_jwt_identity())
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({'error': 'Defect not found'}), 404

    current_user = db.session.get(User, user_id)
    if current_user and current_user.role == 'Reporter':
        if issue.reporter_id != user_id:
            return jsonify({'error': 'Forbidden: You cannot delete defects reported by other users.'}), 403
        if issue.status not in ['Reported', 'New', 'Open']:
            return jsonify({'error': 'Forbidden: This issue is currently being processed and can no longer be modified.'}), 403

    db.session.delete(issue)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Defect deleted successfully'}), 200

@issues_bp.route('/semantic-search', methods=['POST'])
@jwt_required()
def semantic_search_issues():
    """
    Semantic Defect Vector Search
    ---
    tags:
      - Defects
    summary: Natural language semantic vector search across title, description, and knowledge base
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - query
          properties:
            query:
              type: string
              example: "authentication login button timeout"
            project_id:
              type: integer
    responses:
      200:
        description: List of semantically matched defects
      400:
        description: Query parameter required
      401:
        description: Unauthorized token
    """
    data = request.get_json() or {}
    query_str = data.get('query', '').strip()
    project_id = data.get('project_id')

    if not query_str:
        return jsonify({'error': 'Query string is required'}), 400

    candidate_query = Issue.query
    if project_id:
        candidate_query = candidate_query.filter_by(project_id=project_id)
    candidate_issues = candidate_query.all()

    results = EmbeddingService.rank_similar_defects(query_str, candidate_issues, top_k=10)
    return jsonify({
        'count': len(results),
        'total_matches': len(results),
        'results': results,
        'similar_defects': results
    }), 200

@issues_bp.route('/check-duplicates', methods=['POST'])
@jwt_required()
def check_duplicates_endpoint():
    """
    Check Duplicate Defects Pre-Submission
    ---
    tags:
      - Defects
    summary: Check candidate title and description against database defects to prevent duplicate filing
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - title
            - description
          properties:
            title:
              type: string
            description:
              type: string
            project_id:
              type: integer
            threshold:
              type: integer
              example: 30
    responses:
      200:
        description: Duplicate inspection results
      400:
        description: Title and description required
      401:
        description: Unauthorized token
    """
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    project_id = data.get('project_id')
    threshold = data.get('threshold', 30)

    if not title or not description:
        return jsonify({'error': 'Title and description are required'}), 400

    candidate_query = Issue.query
    if project_id:
        candidate_query = candidate_query.filter_by(project_id=project_id)
    candidate_issues = candidate_query.all()

    duplicates = EmbeddingService.check_duplicates(data, candidate_issues, threshold=threshold)
    highest_score = duplicates[0]['similarity_score'] if duplicates else 0

    return jsonify({
        'is_duplicate_suspected': len(duplicates) > 0,
        'highest_score': highest_score,
        'duplicate_candidates': duplicates,
        'count': len(duplicates)
    }), 200
