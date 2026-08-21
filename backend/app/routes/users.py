from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User, ActivityLog, VALID_ROLES
from app.utils.decorators import role_required

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('', methods=['GET'])
@jwt_required()
def get_users():
    role_filter = request.args.get('role')
    query = User.query
    if role_filter and role_filter in VALID_ROLES:
        query = query.filter_by(role=role_filter)
        
    users = query.order_by(User.created_at.desc()).all()
    return jsonify({
        'count': len(users),
        'users': [u.to_dict() for u in users]
    }), 200

@users_bp.route('/<int:user_id>/role', methods=['PUT'])
@jwt_required()
@role_required(['Admin'])
def update_user_role(user_id):
    user = User.query.get(user_id)
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
    user = User.query.get(user_id)
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
