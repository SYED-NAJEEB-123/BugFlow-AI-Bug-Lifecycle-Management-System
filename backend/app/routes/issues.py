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
        pattern = f"%{search_q}%"
        query = query.filter(
            (Issue.issue_key.ilike(pattern)) |
            (Issue.title.ilike(pattern)) |
            (Issue.description.ilike(pattern)) |
            (Issue.category.ilike(pattern))
        )

    issues = query.order_by(Issue.updated_at.desc()).all()
    return jsonify({
        'count': len(issues),
        'issues': [i.to_dict() for i in issues]
    }), 200

@issues_bp.route('/semantic-search', methods=['POST'])
@jwt_required()
def semantic_search():
    data = request.get_json() or {}
    query_text = data.get('query', '').strip()
    project_id = data.get('project_id')
    sprint_id = data.get('sprint_id')
    status_filter = data.get('status', '').strip()
    severity_filter = data.get('severity', '').strip()
    priority_filter = data.get('priority', '').strip()
    category_filter = data.get('category', '').strip()
    assignee_id = data.get('assignee_id')

    if not query_text:
        return jsonify({'query': '', 'total_matches': 0, 'results': []}), 200

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
    if category_filter:
        query = query.filter_by(category=category_filter)
    if assignee_id:
        query = query.filter_by(assignee_id=assignee_id)

    candidate_issues = query.all()
    ranked_results = EmbeddingService.rank_similar_defects(query_text, candidate_issues)

    return jsonify({
        'query': query_text,
        'total_matches': len(ranked_results),
        'results': ranked_results
    }), 200

@issues_bp.route('/check-duplicates', methods=['POST'])
@jwt_required()
def check_duplicates():
    data = request.get_json() or {}
    project_id = data.get('project_id')
    threshold = data.get('threshold', 30)
    
    query = Issue.query
    if project_id:
        query = query.filter_by(project_id=project_id)
    
    candidate_issues = query.all()
    duplicates = EmbeddingService.check_duplicates(data, candidate_issues, threshold=threshold)

    highest = duplicates[0]['similarity_score'] if duplicates else 0

    return jsonify({
        'is_duplicate_suspected': len(duplicates) > 0,
        'highest_score': highest,
        'duplicates_count': len(duplicates),
        'duplicates': duplicates
    }), 200

@issues_bp.route('/<int:issue_id>', methods=['GET'])
@jwt_required()
def get_issue(issue_id):
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({'error': 'Defect not found'}), 404

    data = issue.to_dict()
    data['history'] = [h.to_dict() for h in issue.history]
    data['comments'] = [c.to_dict() for c in issue.comments]
    data['attachments'] = [a.to_dict() for a in issue.attachments]
    return jsonify({'issue': data}), 200

@issues_bp.route('', methods=['POST'])
@jwt_required()
def create_issue():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    raw_project_id = data.get('project_id')
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()

    if not raw_project_id or str(raw_project_id).strip() in ['', '0', 'null']:
        return jsonify({'error': 'Missing required field: project_id'}), 400

    try:
        project_id = int(raw_project_id)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid project_id. Must be a valid project integer ID.'}), 400

    if not title or not description:
        return jsonify({'error': 'Missing required fields: title and description are required.'}), 400

    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({'error': f'Project with ID {project_id} not found.'}), 404

    # Sanitize optional integer foreign keys: assignee_id & sprint_id
    raw_assignee_id = data.get('assignee_id')
    assignee_id = None
    if raw_assignee_id and str(raw_assignee_id).strip() not in ['', '0', 'null']:
        try:
            assignee_id = int(raw_assignee_id)
        except (ValueError, TypeError):
            assignee_id = None

    raw_sprint_id = data.get('sprint_id')
    sprint_id = None
    if raw_sprint_id and str(raw_sprint_id).strip() not in ['', '0', 'null']:
        try:
            sprint_id = int(raw_sprint_id)
        except (ValueError, TypeError):
            sprint_id = None

    issue_key = generate_issue_key(project)

    severity = data.get('severity', 'Medium')
    if severity not in VALID_SEVERITIES:
        severity = 'Medium'

    priority = data.get('priority', 'Medium')
    if priority not in VALID_PRIORITIES:
        priority = 'Medium'

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
            suggested_fix=data.get('suggested_fix', '').strip(),
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
    user_id = int(get_jwt_identity())
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({'error': 'Defect not found'}), 404

    data = request.get_json() or {}

    current_user = db.session.get(User, user_id)
    if current_user and current_user.role == 'Reporter':
        if issue.reporter_id != user_id:
            return jsonify({'error': 'Forbidden: You can only edit issues reported by yourself.'}), 403
        if issue.status not in ['Reported', 'New', 'Open']:
            return jsonify({'error': 'This issue is currently being processed and can no longer be modified.'}), 403
        # Strip fields Reporter cannot modify
        data.pop('assignee_id', None)
        data.pop('sprint_id', None)
        data.pop('status', None)

    updatable_fields = [
        'title', 'description', 'expected_behavior', 'actual_behavior',
        'steps_to_reproduce', 'suggested_fix', 'root_cause', 'category',
        'module', 'defect_type', 'severity', 'priority', 'environment'
    ]

    try:
        for field in updatable_fields:
            if field in data:
                old_val = getattr(issue, field)
                new_val = data[field]
                if str(old_val) != str(new_val):
                    setattr(issue, field, new_val)
                    hist = IssueHistory(
                        issue_id=issue.id,
                        user_id=user_id,
                        field_changed=field.upper(),
                        old_value=str(old_val),
                        new_value=str(new_val)
                    )
                    db.session.add(hist)

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
        hist = IssueHistory(
            issue_id=issue.id,
            user_id=user_id,
            field_changed='STATUS',
            old_value=old_status,
            new_value=new_status
        )
        db.session.add(hist)

        log = ActivityLog(
            user_id=user_id,
            action='TRANSITION_STATUS',
            entity_type='Issue',
            entity_id=issue.id,
            details=f'Transitioned {issue.issue_key} status from {old_status} to {new_status}'
        )
        db.session.add(log)
        db.session.commit()

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

    return jsonify({
        'success': True,
        'message': 'Defect assigned successfully',
        'issue': issue.to_dict()
    }), 200

@issues_bp.route('/<int:issue_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(issue_id):
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
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)

@issues_bp.route('/<int:issue_id>', methods=['DELETE'])
@jwt_required()
def delete_issue(issue_id):
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

