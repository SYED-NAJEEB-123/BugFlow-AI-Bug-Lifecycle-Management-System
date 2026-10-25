from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User, ActivityLog, VALID_ROLES
from app.utils.decorators import role_required

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('', methods=['GET'])
@jwt_required()
def get_users():
    """
    Get Registered Workspace Users
    ---
    tags:
      - Users
    summary: List all registered workspace users with optional role filtering
    security:
      - Bearer: []
    parameters:
      - name: role
        in: query
        type: string
        required: false
        enum: [Admin, Developer, Tester, Project Manager, Reporter]
        description: Optional role filter
    responses:
      200:
        description: List of user objects
      401:
        description: Unauthorized token
    """
    role_filter = request.args.get('role')
    query = User.query
    if role_filter and role_filter in VALID_ROLES:
        query = query.filter_by(role=role_filter)
        
    users = query.order_by(User.created_at.desc()).all()
    return jsonify({
        'count': len(users),
        'users': [u.to_dict() for u in users]
    }), 200

@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_by_id(user_id):
    """
    Get User Details by ID
    ---
    tags:
      - Users
    summary: Retrieve detailed profile for a specific user by ID
    security:
      - Bearer: []
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
        description: ID of target user
    responses:
      200:
        description: User profile details
      401:
        description: Unauthorized token
      404:
        description: User not found
    """
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()}), 200

@users_bp.route('/<int:user_id>/role', methods=['PUT'])
@jwt_required()
@role_required(['Admin'])
def update_user_role(user_id):
    """
    Update User Role & Status (Admin Only)
    ---
    tags:
      - Users
    summary: Modify user role or active account status
    security:
      - Bearer: []
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            role:
              type: string
              enum: [Admin, Developer, Tester, Project Manager, Reporter]
            is_active:
              type: boolean
    responses:
      200:
        description: User role updated successfully
      400:
        description: Invalid role specified
      401:
        description: Unauthorized token
      403:
        description: Forbidden (Admin role required)
      404:
        description: User not found
    """
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json() or {}
    new_role = data.get('role')
    is_active = data.get('is_active')
    
    if new_role:
        if new_role not in VALID_ROLES:
            return jsonify({'error': f'Invalid role. Must be one of: {", ".join(VALID_ROLES)}'}), 400
        user.role = new_role
        
    if is_active is not None:
        user.is_active = bool(is_active)
        
    db.session.commit()
    
    admin_id = get_jwt_identity()
    log = ActivityLog(
        user_id=int(admin_id),
        action='UPDATE_USER_ROLE',
        entity_type='User',
        entity_id=user.id,
        details=f'Updated user {user.username} role to {user.role}, active={user.is_active}'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'message': 'User updated successfully',
        'user': user.to_dict()
    }), 200

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
@role_required(['Admin'])
def deactivate_user(user_id):
    """
    Deactivate User Account (Admin Only)
    ---
    tags:
      - Users
    summary: Deactivate a user account (prevents login)
    security:
      - Bearer: []
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: User account deactivated
      400:
        description: Admin cannot deactivate own account
      401:
        description: Unauthorized token
      403:
        description: Forbidden (Admin role required)
      404:
        description: User not found
    """
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    admin_id = get_jwt_identity()
    if int(admin_id) == user.id:
        return jsonify({'error': 'Admin cannot deactivate their own account'}), 400
        
    user.is_active = False
    db.session.commit()
    
    log = ActivityLog(
        user_id=int(admin_id),
        action='DEACTIVATE_USER',
        entity_type='User',
        entity_id=user.id,
        details=f'Deactivated user {user.username}'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'message': f'User {user.username} has been deactivated'}), 200

@users_bp.route('/developers/skills', methods=['GET'])
@jwt_required()
def get_developer_skills():
    """
    List All Developer Skill Profiles
    ---
    tags:
      - Users
    summary: Retrieve declared skill profiles and workload ratings across developers
    security:
      - Bearer: []
    responses:
      200:
        description: List of developer skill profiles
      401:
        description: Unauthorized token
    """
    from app.models.user import DeveloperSkill
    developers = User.query.filter(User.role.in_(['Developer', 'DEVELOPER'])).all()
    res = []
    for d in developers:
        sk = DeveloperSkill.query.filter_by(user_id=d.id).first()
        dev_dict = d.to_dict()
        dev_dict['skill_profile'] = sk.to_dict() if sk else {
            'user_id': d.id,
            'primary_languages': dev_dict['skills'],
            'frameworks': [],
            'preferred_categories': [],
            'preferred_modules': [],
            'experience_rating': 3
        }
        res.append(dev_dict)
    return jsonify({'developers': res}), 200

@users_bp.route('/developers/<int:target_user_id>/skills', methods=['PUT'])
@jwt_required()
def update_developer_skill_profile(target_user_id):
    """
    Update Developer Skill Profile
    ---
    tags:
      - Users
    summary: Update languages, frameworks, preferred categories, and modules for a developer
    security:
      - Bearer: []
    parameters:
      - name: target_user_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            primary_languages:
              type: string
              example: "Python, JavaScript, SQL"
            frameworks:
              type: string
              example: "React, Flask, Pytest"
            preferred_categories:
              type: string
              example: "Authentication, API, Payment"
            preferred_modules:
              type: string
              example: "Auth, Payment, Frontend"
            experience_rating:
              type: integer
              example: 4
    responses:
      200:
        description: Skill profile updated successfully
      401:
        description: Unauthorized token
      403:
        description: Forbidden (Can only update own profile or requires Admin/PM role)
      404:
        description: User not found
    """
    from app.models.user import DeveloperSkill
    current_id = int(get_jwt_identity())
    current_user = db.session.get(User, current_id)

    if current_user.role not in ['Admin', 'Project Manager'] and current_id != target_user_id:
        return jsonify({'error': 'Forbidden: You can only modify your own skill profile'}), 403

    target_user = db.session.get(User, target_user_id)
    if not target_user:
        return jsonify({'error': 'Developer not found'}), 404

    data = request.get_json() or {}
    sk = DeveloperSkill.query.filter_by(user_id=target_user.id).first()
    if not sk:
        sk = DeveloperSkill(user_id=target_user.id)
        db.session.add(sk)

    if 'primary_languages' in data:
        sk.primary_languages = str(data['primary_languages']).strip()
        target_user.skills = str(data['primary_languages']).strip()
    if 'frameworks' in data:
        sk.frameworks = str(data['frameworks']).strip()
    if 'preferred_categories' in data:
        sk.preferred_categories = str(data['preferred_categories']).strip()
    if 'preferred_modules' in data:
        sk.preferred_modules = str(data['preferred_modules']).strip()
    if 'experience_rating' in data:
        try:
            sk.experience_rating = int(data['experience_rating'])
        except (ValueError, TypeError):
            pass

    db.session.commit()
    return jsonify({
        'message': 'Developer skill profile updated successfully',
        'skill_profile': sk.to_dict(),
        'user': target_user.to_dict()
    }), 200

@users_bp.route('/developers/dashboard', methods=['GET'])
@jwt_required()
def get_developer_dashboard():
    """
    Developer Knowledge & Workload Dashboard
    ---
    tags:
      - Users
    summary: Comprehensive real database workload metrics, completed defect stats, and skill profiles across developers
    security:
      - Bearer: []
    responses:
      200:
        description: Developer workload dashboard metrics
      401:
        description: Unauthorized token
    """
    from app.models.user import DeveloperSkill
    from app.models.issue import Issue

    developers = User.query.filter(User.role.in_(['Developer', 'DEVELOPER', 'Admin', 'Project Manager', 'Tester'])).filter_by(is_active=True).all()
    dev_results = []
    
    total_open_workload = 0
    total_completed_defects = 0

    for d in developers:
        all_assigned = Issue.query.filter_by(assignee_id=d.id).all()
        
        assigned_cnt = sum(1 for i in all_assigned if i.status == 'Assigned')
        in_prog_cnt = sum(1 for i in all_assigned if i.status == 'In Progress')
        in_rev_cnt = sum(1 for i in all_assigned if i.status == 'In Review')
        resolved_cnt = sum(1 for i in all_assigned if i.status == 'Resolved')
        verified_cnt = sum(1 for i in all_assigned if i.status == 'Verified')
        closed_cnt = sum(1 for i in all_assigned if i.status == 'Closed')
        reopened_cnt = sum(1 for i in all_assigned if i.status == 'Reopened')
        reported_cnt = sum(1 for i in all_assigned if i.status == 'Reported')

        open_cnt = assigned_cnt + in_prog_cnt + in_rev_cnt + reopened_cnt
        completed_cnt = resolved_cnt + verified_cnt + closed_cnt
        total_cnt = len(all_assigned)

        high_crit_cnt = sum(1 for i in all_assigned if i.status in ['Assigned', 'In Progress', 'In Review', 'Reopened'] and i.severity in ['High', 'Critical'])

        comp_rate = round((completed_cnt / total_cnt * 100), 1) if total_cnt > 0 else 0.0
        workload_pct = min(open_cnt * 20, 100)

        sk = DeveloperSkill.query.filter_by(user_id=d.id).first()
        sk_dict = sk.to_dict() if sk else {
            'user_id': d.id,
            'primary_languages': [s.strip() for s in (d.skills or '').split(',')] if d.skills else [],
            'frameworks': [],
            'preferred_categories': [],
            'preferred_modules': [],
            'experience_rating': 3
        }

        active_defects = [i.to_dict() for i in all_assigned if i.status in ['Assigned', 'In Progress', 'In Review', 'Reopened']]
        resolved_defects = [i.to_dict() for i in all_assigned if i.status in ['Resolved', 'Verified', 'Closed']]

        total_open_workload += open_cnt
        total_completed_defects += completed_cnt

        dev_results.append({
            'user_id': d.id,
            'username': d.username,
            'full_name': d.full_name,
            'email': d.email,
            'role': d.role,
            'department': d.department or 'Engineering',
            'avatar_url': d.avatar_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={d.username}",
            'assigned_count': assigned_cnt,
            'in_progress_count': in_prog_cnt,
            'in_review_count': in_rev_cnt,
            'resolved_count': resolved_cnt,
            'verified_count': verified_cnt,
            'closed_count': closed_cnt,
            'reopened_count': reopened_cnt,
            'open_workload': open_cnt,
            'completed_count': completed_cnt,
            'total_assigned': total_cnt,
            'high_critical_workload': high_crit_cnt,
            'completion_rate': comp_rate,
            'workload_percentage': workload_pct,
            'is_overloaded': open_cnt >= 5,
            'skill_profile': sk_dict,
            'active_defects': active_defects,
            'resolved_defects': resolved_defects
        })

    # Sort developers by open_workload descending by default
    dev_results.sort(key=lambda x: x['open_workload'], reverse=True)

    return jsonify({
        'developers': dev_results,
        'summary': {
            'total_developers': len(developers),
            'total_open_workload': total_open_workload,
            'total_completed_defects': total_completed_defects,
            'overloaded_developers_count': sum(1 for d in dev_results if d['is_overloaded'])
        }
    }), 200

@users_bp.route('/developers/search-query', methods=['POST'])
@jwt_required()
def search_developer_query():
    """
    Natural Language Developer Query Search
    ---
    tags:
      - Users
    summary: Query developers by workload, skills, category experience, or in-progress status
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            query:
              type: string
              example: "Who is currently overloaded?"
    responses:
      200:
        description: Ranked developer search results
      401:
        description: Unauthorized token
    """
    from app.models.user import DeveloperSkill
    from app.models.issue import Issue

    data = request.get_json() or {}
    query_str = data.get('query', '').strip()
    query_lower = query_str.lower()

    developers = User.query.filter(User.role.in_(['Developer', 'DEVELOPER', 'Admin', 'Project Manager'])).filter_by(is_active=True).all()
    
    dev_stats = []
    for d in developers:
        all_assigned = Issue.query.filter_by(assignee_id=d.id).all()
        open_cnt = sum(1 for i in all_assigned if i.status in ['Assigned', 'In Progress', 'In Review', 'Reopened'])
        in_prog_cnt = sum(1 for i in all_assigned if i.status == 'In Progress')
        completed_cnt = sum(1 for i in all_assigned if i.status in ['Resolved', 'Verified', 'Closed'])
        
        sk = DeveloperSkill.query.filter_by(user_id=d.id).first()
        skills_str = f"{d.skills or ''} {sk.primary_languages if sk else ''} {sk.frameworks if sk else ''} {sk.preferred_categories if sk else ''}".lower()

        # Count resolved category matches
        resolved_categories = [i.category.lower() for i in all_assigned if i.status in ['Resolved', 'Verified', 'Closed'] and i.category]

        dev_stats.append({
            'developer': d.to_dict(),
            'open_workload': open_cnt,
            'in_progress_count': in_prog_cnt,
            'completed_count': completed_cnt,
            'skills_str': skills_str,
            'resolved_categories': resolved_categories,
            'active_defects': [i.to_dict() for i in all_assigned if i.status in ['Assigned', 'In Progress', 'In Review']]
        })

    explanation = ""
    if 'overloaded' in query_lower or 'highest workload' in query_lower or 'most busy' in query_lower:
        dev_stats.sort(key=lambda x: x['open_workload'], reverse=True)
        explanation = "Sorted developers by highest active open workload."
    elif 'lowest workload' in query_lower or 'least busy' in query_lower or 'available' in query_lower:
        dev_stats.sort(key=lambda x: x['open_workload'])
        explanation = "Sorted developers by lowest current workload (highest availability)."
    elif 'in progress' in query_lower or 'in-progress' in query_lower:
        dev_stats.sort(key=lambda x: x['in_progress_count'], reverse=True)
        explanation = "Sorted developers by active in-progress defects."
    elif 'most resolved' in query_lower or 'completed' in query_lower:
        dev_stats.sort(key=lambda x: x['completed_count'], reverse=True)
        explanation = "Sorted developers by total completed/resolved defects."
    else:
        # Search keyword matching in skills or categories
        keywords = [w for w in query_lower.split() if len(w) > 2]
        def score_dev(item):
            score = 0
            for kw in keywords:
                if kw in item['skills_str']:
                    score += 10
                score += item['resolved_categories'].count(kw) * 5
            return score

        dev_stats.sort(key=score_dev, reverse=True)
        explanation = f"Matched developers based on skill keywords and category experience for '{query_str}'."

    results = []
    for item in dev_stats[:10]:
        d = item['developer']
        results.append({
            'id': d['id'],
            'full_name': d['full_name'],
            'username': d['username'],
            'role': d['role'],
            'open_workload': item['open_workload'],
            'in_progress_count': item['in_progress_count'],
            'completed_count': item['completed_count'],
            'skills': d['skills'],
            'active_defects': item['active_defects']
        })

    return jsonify({
        'query': query_str,
        'explanation': explanation,
        'developers': results
    }), 200

@users_bp.route('/developers/knowledge-base', methods=['GET'])
@jwt_required()
def get_developer_knowledge_base():
    """Alias for Developer Knowledge Base Dashboard"""
    return get_developer_dashboard()

@users_bp.route('/developers/workload', methods=['GET'])
@jwt_required()
def get_developer_workload_all():
    """Alias for Developer Workload List"""
    return get_developer_dashboard()

@users_bp.route('/developers/<int:target_user_id>/workload', methods=['GET'])
@jwt_required()
def get_single_developer_workload(target_user_id):
    """
    Get Workload for Specific Developer
    ---
    tags:
      - Users
    summary: Specific developer active workload, defect counts, and workload status
    security:
      - Bearer: []
    """
    from app.models.issue import Issue
    from app.services.assignment_agent_service import AssignmentAgentService

    target_user = db.session.get(User, target_user_id)
    if not target_user:
        return jsonify({'error': 'Developer not found'}), 404

    all_assigned = Issue.query.filter_by(assignee_id=target_user.id).all()
    open_cnt = sum(1 for i in all_assigned if i.status in ['Assigned', 'In Progress', 'In Review', 'Reopened'])
    high_crit_cnt = sum(1 for i in all_assigned if i.status in ['Assigned', 'In Progress', 'In Review', 'Reopened'] and i.severity in ['High', 'Critical'])
    completed_cnt = sum(1 for i in all_assigned if i.status in ['Resolved', 'Verified', 'Closed'])
    
    status = AssignmentAgentService.get_workload_status(open_cnt, high_crit_cnt)

    return jsonify({
        'developer': target_user.to_dict(),
        'open_workload': open_cnt,
        'high_critical_workload': high_crit_cnt,
        'completed_count': completed_cnt,
        'workload_status': status,
        'active_defects': [i.to_dict() for i in all_assigned if i.status in ['Assigned', 'In Progress', 'In Review', 'Reopened']]
    }), 200



