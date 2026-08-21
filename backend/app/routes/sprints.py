from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User, ActivityLog
from app.models.project import Project
from app.models.issue import Issue
from app.models.sprint import Sprint, VALID_SPRINT_STATUSES
from app.services.ai_service import get_gemini_client, clean_json_response

sprints_bp = Blueprint('sprints', __name__, url_prefix='/api/sprints')

@sprints_bp.route('', methods=['GET'])
@jwt_required()
def get_sprints():
    project_id = request.args.get('project_id', type=int)
    status_filter = request.args.get('status', '').strip()

    query = Sprint.query

    if project_id:
        query = query.filter_by(project_id=project_id)
    if status_filter:
        query = query.filter_by(status=status_filter)

    sprints = query.order_by(Sprint.start_date.desc()).all()
    return jsonify({
        'count': len(sprints),
        'sprints': [s.to_dict(include_issues=False) for s in sprints]
    }), 200

@sprints_bp.route('/<int:sprint_id>', methods=['GET'])
@jwt_required()
def get_sprint(sprint_id):
    sprint = db.session.get(Sprint, sprint_id)
    if not sprint:
        return jsonify({'error': 'Sprint not found'}), 404

    data = sprint.to_dict(include_issues=True)

    # Compute Burndown chart data points based on real sprint dates and issue progress
    start_dt = sprint.start_date
    end_dt = sprint.end_date
    total_defects = len(sprint.issues)

    burndown_points = []
    if start_dt and end_dt and total_defects > 0:
        total_days = max((end_dt - start_dt).days, 1)
        completed_issues = [i for i in sprint.issues if i.status in ['Resolved', 'Verified', 'Closed']]
        
        for day_idx in range(total_days + 1):
            curr_date = start_dt.date()
            # Calculate how many defects were completed by this date
            done_by_date = sum(1 for i in completed_issues if i.updated_at.date() <= curr_date) if hasattr(start_dt, 'date') else len(completed_issues)
            remaining = max(total_defects - done_by_date, 0)
            target = max(round(total_defects * (1 - (day_idx / total_days)), 1), 0)
            
            burndown_points.append({
                'day': f"Day {day_idx + 1}",
                'date': curr_date.isoformat() if hasattr(curr_date, 'isoformat') else str(curr_date),
                'actual_remaining': remaining,
                'target_remaining': target
            })

    data['burndown'] = burndown_points
    return jsonify({'sprint': data}), 200

@sprints_bp.route('', methods=['POST'])
@jwt_required()
def create_sprint():
    user_id = int(get_jwt_identity())
    current_user = db.session.get(User, user_id)
    if current_user and current_user.role == 'Reporter':
        return jsonify({'error': 'Forbidden: Reporters cannot create or manage sprints.'}), 403

    data = request.get_json() or {}

    project_id = data.get('project_id')
    name = data.get('name', '').strip()
    goal = data.get('goal', '').strip()
    start_date_str = data.get('start_date', '').strip()
    end_date_str = data.get('end_date', '').strip()
    status = data.get('status', 'Planned').strip()

    if not project_id or not name or not start_date_str or not end_date_str:
        return jsonify({'error': 'Missing required fields: project_id, name, start_date, end_date'}), 400

    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    try:
        start_date = datetime.fromisoformat(start_date_str.replace('Z', ''))
        end_date = datetime.fromisoformat(end_date_str.replace('Z', ''))
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DD)'}), 400

    if end_date < start_date:
        return jsonify({'error': 'End date cannot be earlier than start date'}), 400

    if status not in VALID_SPRINT_STATUSES:
        status = 'Planned'

    # Enforce max 1 active sprint per project rule
    if status == 'Active':
        active_existing = Sprint.query.filter_by(project_id=project_id, status='Active').first()
        if active_existing:
            return jsonify({'error': f'Project already has an active sprint: "{active_existing.name}". Complete or edit existing active sprint first.'}), 400

    sprint = Sprint(
        project_id=project_id,
        name=name,
        goal=goal,
        start_date=start_date,
        end_date=end_date,
        status=status,
        created_by_id=user_id
    )

    db.session.add(sprint)
    db.session.commit()

    # Assign initial issue IDs if provided
    issue_ids = data.get('issue_ids', [])
    if issue_ids and isinstance(issue_ids, list):
        issues_to_assign = Issue.query.filter(Issue.id.in_(issue_ids), Issue.project_id == project_id).all()
        for i in issues_to_assign:
            i.sprint_id = sprint.id
        db.session.commit()

    log = ActivityLog(
        user_id=user_id,
        action='CREATE_SPRINT',
        entity_type='Sprint',
        entity_id=sprint.id,
        details=f'Created sprint "{sprint.name}" for project {project.key}'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'Sprint created successfully',
        'sprint': sprint.to_dict(include_issues=True)
    }), 201

@sprints_bp.route('/<int:sprint_id>', methods=['PUT'])
@jwt_required()
def update_sprint(sprint_id):
    user_id = int(get_jwt_identity())
    sprint = db.session.get(Sprint, sprint_id)
    if not sprint:
        return jsonify({'error': 'Sprint not found'}), 404

    data = request.get_json() or {}

    if 'name' in data and data['name'].strip():
        sprint.name = data['name'].strip()
    if 'goal' in data:
        sprint.goal = data['goal'].strip()

    if 'start_date' in data and data['start_date'].strip():
        try:
            sprint.start_date = datetime.fromisoformat(data['start_date'].strip().replace('Z', ''))
        except ValueError:
            return jsonify({'error': 'Invalid start_date format'}), 400

    if 'end_date' in data and data['end_date'].strip():
        try:
            sprint.end_date = datetime.fromisoformat(data['end_date'].strip().replace('Z', ''))
        except ValueError:
            return jsonify({'error': 'Invalid end_date format'}), 400

    if sprint.end_date < sprint.start_date:
        return jsonify({'error': 'End date cannot be before start date'}), 400

    if 'status' in data and data['status'].strip() in VALID_SPRINT_STATUSES:
        new_status = data['status'].strip()
        if new_status == 'Active' and sprint.status != 'Active':
            active_existing = Sprint.query.filter_by(project_id=sprint.project_id, status='Active').first()
            if active_existing and active_existing.id != sprint.id:
                return jsonify({'error': f'Project already has an active sprint: "{active_existing.name}"'}), 400
        sprint.status = new_status

    db.session.commit()

    log = ActivityLog(
        user_id=user_id,
        action='UPDATE_SPRINT',
        entity_type='Sprint',
        entity_id=sprint.id,
        details=f'Updated sprint "{sprint.name}"'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'Sprint updated successfully',
        'sprint': sprint.to_dict(include_issues=True)
    }), 200

@sprints_bp.route('/<int:sprint_id>/start', methods=['POST'])
@jwt_required()
def start_sprint(sprint_id):
    user_id = int(get_jwt_identity())
    sprint = db.session.get(Sprint, sprint_id)
    if not sprint:
        return jsonify({'error': 'Sprint not found'}), 404

    active_existing = Sprint.query.filter_by(project_id=sprint.project_id, status='Active').first()
    if active_existing and active_existing.id != sprint.id:
        return jsonify({'error': f'Project already has active sprint: "{active_existing.name}"'}), 400

    sprint.status = 'Active'
    db.session.commit()

    log = ActivityLog(
        user_id=user_id,
        action='START_SPRINT',
        entity_type='Sprint',
        entity_id=sprint.id,
        details=f'Started sprint "{sprint.name}"'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': f'Sprint "{sprint.name}" is now Active',
        'sprint': sprint.to_dict(include_issues=True)
    }), 200

@sprints_bp.route('/<int:sprint_id>/complete', methods=['POST'])
@jwt_required()
def complete_sprint(sprint_id):
    user_id = int(get_jwt_identity())
    sprint = db.session.get(Sprint, sprint_id)
    if not sprint:
        return jsonify({'error': 'Sprint not found'}), 404

    sprint.status = 'Completed'
    db.session.commit()

    log = ActivityLog(
        user_id=user_id,
        action='COMPLETE_SPRINT',
        entity_type='Sprint',
        entity_id=sprint.id,
        details=f'Completed sprint "{sprint.name}"'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': f'Sprint "{sprint.name}" completed successfully',
        'sprint': sprint.to_dict(include_issues=True)
    }), 200

@sprints_bp.route('/<int:sprint_id>/defects', methods=['POST'])
@jwt_required()
def assign_defects(sprint_id):
    user_id = int(get_jwt_identity())
    sprint = db.session.get(Sprint, sprint_id)
    if not sprint:
        return jsonify({'error': 'Sprint not found'}), 404

    data = request.get_json() or {}
    issue_ids = data.get('issue_ids', [])
    if not isinstance(issue_ids, list):
        return jsonify({'error': 'issue_ids must be a list of integers'}), 400

    issues = Issue.query.filter(Issue.id.in_(issue_ids), Issue.project_id == sprint.project_id).all()
    for i in issues:
        i.sprint_id = sprint.id

    db.session.commit()

    return jsonify({
        'message': f'Assigned {len(issues)} defects to sprint "{sprint.name}"',
        'sprint': sprint.to_dict(include_issues=True)
    }), 200

@sprints_bp.route('/<int:sprint_id>/defects/<int:issue_id>', methods=['DELETE'])
@jwt_required()
def remove_defect(sprint_id, issue_id):
    sprint = db.session.get(Sprint, sprint_id)
    if not sprint:
        return jsonify({'error': 'Sprint not found'}), 404

    issue = db.session.get(Issue, issue_id)
    if not issue or issue.sprint_id != sprint.id:
        return jsonify({'error': 'Defect not found in this sprint'}), 404

    issue.sprint_id = None
    db.session.commit()

    return jsonify({
        'message': f'Removed defect {issue.issue_key} from sprint back to backlog',
        'sprint': sprint.to_dict(include_issues=True)
    }), 200

@sprints_bp.route('/<int:sprint_id>', methods=['DELETE'])
@jwt_required()
def delete_sprint(sprint_id):
    user_id = int(get_jwt_identity())
    sprint = db.session.get(Sprint, sprint_id)
    if not sprint:
        return jsonify({'error': 'Sprint not found'}), 404

    # Unassign defects back to backlog
    for i in sprint.issues:
        i.sprint_id = None

    sprint_name = sprint.name
    db.session.delete(sprint)
    db.session.commit()

    log = ActivityLog(
        user_id=user_id,
        action='DELETE_SPRINT',
        entity_type='Sprint',
        entity_id=sprint_id,
        details=f'Deleted sprint "{sprint_name}"'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': f'Sprint "{sprint_name}" deleted successfully'}), 200

@sprints_bp.route('/<int:sprint_id>/ai-advisor', methods=['POST'])
@jwt_required()
def get_ai_advisor(sprint_id):
    sprint = db.session.get(Sprint, sprint_id)
    if not sprint:
        return jsonify({'error': 'Sprint not found'}), 404

    client = get_gemini_client()
    sprint_dict = sprint.to_dict(include_issues=True)
    
    critical_count = sum(1 for i in sprint.issues if i.severity == 'Critical' and i.status not in ['Resolved', 'Closed'])
    remaining_count = sprint_dict['remaining_defects']

    if not client:
        return jsonify({
            'summary': f'Sprint "{sprint.name}" is currently {sprint.status} with {sprint_dict["progress_percentage"]}% completion.',
            'risk_alerts': [
                f"Attention: {critical_count} critical defects remain unresolved in sprint queue." if critical_count > 0 else "No critical open defect bottlenecks detected.",
                f"{remaining_count} total defects remain to be completed before {sprint_dict['end_date'] or 'sprint end'}."
            ],
            'recommendations': [
                "Prioritize High and Critical severity defects in active developer queues.",
                "Review bugs stuck in 'In Progress' for over 48 hours."
            ]
        }), 200

    prompt = f"""
You are an Agile Delivery Lead & Scrum Master AI Advisor analyzing sprint execution risks.

Sprint Details:
- Name: {sprint.name}
- Goal: {sprint.goal}
- Status: {sprint.status}
- Progress: {sprint_dict['progress_percentage']}%
- Total Defects: {sprint_dict['total_defects']}
- Completed Defects: {sprint_dict['completed_defects']}
- Remaining Defects: {sprint_dict['remaining_defects']}
- Critical Open Defects: {critical_count}

Defect List in Sprint:
{json.dumps([{ 'key': i.issue_key, 'title': i.title, 'status': i.status, 'severity': i.severity, 'priority': i.priority, 'assignee': i.assignee.full_name if i.assignee else 'Unassigned' } for i in sprint.issues])}

Return strictly a JSON object:
{{
  "summary": "Concise 2-sentence executive summary of sprint status and trajectory.",
  "risk_alerts": [
    "Specific risk alert 1 regarding open critical bugs or deadline",
    "Specific risk alert 2 regarding developer workload or stuck issues"
  ],
  "recommendations": [
    "Actionable recommendation 1 for team lead",
    "Actionable recommendation 2 for backlog prioritization"
  ]
}}
"""
    try:
        from google.genai import types
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        res = clean_json_response(response.text)
        if res.get('summary'):
            return jsonify(res), 200
    except Exception as e:
        print(f"Gemini AI Sprint Advisor error: {e}")

    return jsonify({
        'summary': f'Sprint "{sprint.name}" is {sprint_dict["progress_percentage"]}% complete with {remaining_count} defects remaining.',
        'risk_alerts': [f"{critical_count} critical defects need immediate developer attention."],
        'recommendations': ["Focus sprint capacity on resolving open Critical & High priority defects."]
    }), 200
