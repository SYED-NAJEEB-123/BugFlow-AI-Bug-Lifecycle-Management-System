from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User, ActivityLog
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.issue import Issue, DefectResolutionKnowledge
from app.extensions import db

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('', methods=['GET'])
@jwt_required()
def get_analytics():
    """
    Get Real-Time Advanced Analytics & Dashboard Metrics
    ---
    tags:
      - Analytics
    security:
      - Bearer: []
    parameters:
      - name: project_id
        in: query
        type: integer
        required: false
        description: Optional project ID to filter analytics metrics
    responses:
      200:
        description: Real-time analytics breakdown
      401:
        description: Unauthorized token
    """
    user_id = int(get_jwt_identity())
    current_user = db.session.get(User, user_id)
    project_id = request.args.get('project_id', type=int)

    # Base Queries
    total_projects = Project.query.count()
    total_users = User.query.count()
    developer_count = User.query.filter(User.role.in_(['Developer', 'DEVELOPER'])).count()

    # Real Sprint Counts
    sprint_query = Sprint.query
    if project_id:
        sprint_query = sprint_query.filter_by(project_id=project_id)
    total_sprints = sprint_query.count()
    active_sprints = sprint_query.filter_by(status='Active').count()
    completed_sprints = sprint_query.filter_by(status='Completed').count()

    # Issue Query with Role-Based Scope Consideration
    query = Issue.query
    if project_id:
        query = query.filter_by(project_id=project_id)

    if current_user and current_user.role == 'Reporter':
        query = query.filter_by(reporter_id=user_id)
    elif current_user and current_user.role == 'Developer':
        # Developers see assigned defects or project defects
        pass

    total_defects = query.count()
    open_defects = query.filter(Issue.status.in_(['Reported', 'Assigned', 'In Progress', 'In Review', 'Reopened'])).count()
    resolved_defects = query.filter_by(status='Resolved').count()
    closed_defects = query.filter(Issue.status.in_(['Verified', 'Closed'])).count()
    critical_defects = query.filter_by(severity='Critical').count()

    # Calculate real resolution rate
    total_fixed = resolved_defects + closed_defects
    resolution_rate = round((total_fixed / max(total_defects, 1)) * 100, 1) if total_defects > 0 else 0.0

    # Calculate dynamic avg resolution hours from actual DB timestamps
    resolved_issues = query.filter(Issue.status.in_(['Resolved', 'Verified', 'Closed'])).all()
    if resolved_issues:
        total_hours = sum(
            max(0.0, (i.updated_at - i.created_at).total_seconds() / 3600.0)
            for i in resolved_issues if i.updated_at and i.created_at
        )
        avg_resolution_hours = round(total_hours / len(resolved_issues), 1)
    else:
        avg_resolution_hours = 0.0

    # Severity Breakdown
    severities = ['Critical', 'High', 'Medium', 'Low']
    severity_breakdown = []
    for sev in severities:
        cnt = query.filter_by(severity=sev).count()
        severity_breakdown.append({'name': sev, 'value': cnt})

    # Category Breakdown
    categories = ['UI/UX', 'API', 'Authentication', 'Database', 'Performance', 'Security', 'Payment', 'General']
    category_breakdown = []
    for cat in categories:
        cnt = query.filter_by(category=cat).count()
        if cnt > 0 or total_defects == 0:
            category_breakdown.append({'name': cat, 'count': cnt})

    # Status Breakdown
    statuses = ['Reported', 'Assigned', 'In Progress', 'In Review', 'Resolved', 'Verified', 'Closed', 'Reopened']
    status_breakdown = []
    for st in statuses:
        cnt = query.filter_by(status=st).count()
        status_breakdown.append({'name': st, 'count': cnt})

    # Developer Workload
    devs = User.query.filter(User.role.in_(['Developer', 'DEVELOPER'])).all()
    workload = []
    for d in devs:
        cnt = query.filter_by(assignee_id=d.id).filter(Issue.status.in_(['Assigned', 'In Progress', 'In Review'])).count()
        workload.append({
            'developer_id': d.id,
            'name': d.full_name,
            'avatar_url': d.avatar_url,
            'active_defects': cnt
        })

    # Real Defect Trends (Past 7 Days Timeline)
    today = datetime.utcnow().date()
    defect_trends = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime('%b %d')
        # Created on day
        created_count = query.filter(db.func.date(Issue.created_at) == day).count()
        resolved_count = query.filter(db.func.date(Issue.updated_at) == day).filter(Issue.status.in_(['Resolved', 'Verified', 'Closed'])).count()
        defect_trends.append({
            'date': day_str,
            'created': created_count,
            'resolved': resolved_count
        })

    # Open vs Resolved Comparison
    open_vs_resolved = [
        {'name': 'Open Backlog', 'count': open_defects},
        {'name': 'Resolved / Closed', 'count': total_fixed}
    ]

    # Real Recent Projects (Limit 5)
    recent_projects_query = Project.query.order_by(Project.created_at.desc()).limit(5).all()
    recent_projects = [p.to_dict() for p in recent_projects_query]

    # Real Recent Issues (Limit 5)
    recent_issues_query = query.order_by(Issue.created_at.desc()).limit(5).all()
    recent_issues = [i.to_dict() for i in recent_issues_query]

    # Real Recent Activity Logs (Limit 10)
    recent_activity_query = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(10).all()
    recent_activity = [a.to_dict() for a in recent_activity_query]

    knowledge_count = DefectResolutionKnowledge.query.count()

    return jsonify({
        'overview': {
            'total_projects': total_projects,
            'total_users': total_users,
            'developer_count': developer_count,
            'total_defects': total_defects,
            'open_defects': open_defects,
            'resolved_defects': resolved_defects,
            'closed_defects': closed_defects,
            'critical_defects': critical_defects,
            'resolution_rate': resolution_rate,
            'total_sprints': total_sprints,
            'active_sprints': active_sprints,
            'completed_sprints': completed_sprints,
            'avg_resolution_hours': avg_resolution_hours,
            'knowledge_base_articles': knowledge_count
        },
        'recent_projects': recent_projects,
        'recent_issues': recent_issues,
        'recent_activity': recent_activity,
        'severity_breakdown': severity_breakdown,
        'category_breakdown': category_breakdown,
        'status_breakdown': status_breakdown,
        'developer_workload': workload,
        'defect_trends': defect_trends,
        'open_vs_resolved': open_vs_resolved
    }), 200
