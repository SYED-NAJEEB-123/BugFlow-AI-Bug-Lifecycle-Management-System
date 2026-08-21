from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from app.extensions import db
from app.models.user import User, ActivityLog, VALID_ROLES

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    
    email = data.get('email', '').strip().lower()
    username = data.get('username', '').strip().lower()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    role = data.get('role', 'Developer').strip()
    department = data.get('department', 'Engineering').strip()
    phone = data.get('phone', '').strip()
    skills = data.get('skills', '').strip()
    
    # Validations
    if not email or not username or not password or not full_name:
        return jsonify({'error': 'Missing required fields: email, username, password, full_name'}), 400
        
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400

    if role not in VALID_ROLES:
        return jsonify({'error': f'Invalid role. Must be one of: {", ".join(VALID_ROLES)}'}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists'}), 409
        
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username is already taken'}), 409
        
    user = User(
        email=email,
        username=username,
        full_name=full_name,
        role=role,
        department=department,
        phone=phone,
        skills=skills
    )
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    # Log activity
    log = ActivityLog(
        user_id=user.id,
        action='REGISTER',
        entity_type='User',
        entity_id=user.id,
        details=f'Registered new account with role {role}'
    )
    db.session.add(log)
    db.session.commit()
    
    # Create tokens with claims
    additional_claims = {
        'role': user.role,
        'username': user.username,
        'email': user.email
    }
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)
    
    return jsonify({
        'message': 'Registration successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    
    identifier = data.get('email_or_username', '').strip().lower()
    if not identifier:
        identifier = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not identifier or not password:
        return jsonify({'error': 'Please provide email/username and password'}), 400
        
    user = User.query.filter(
        (User.email == identifier) | (User.username == identifier)
    ).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email/username or password'}), 401
        
    if not user.is_active:
        return jsonify({'error': 'User account has been deactivated'}), 403
        
    additional_claims = {
        'role': user.role,
        'username': user.username,
        'email': user.email
    }
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)
    
    # Log activity
    log = ActivityLog(
        user_id=user.id,
        action='LOGIN',
        entity_type='User',
        entity_id=user.id,
        details='Successful user login'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 404
        
    return jsonify({'user': user.to_dict()}), 200

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json() or {}
    
    if 'full_name' in data and data['full_name'].strip():
        user.full_name = data['full_name'].strip()
    if 'department' in data:
        user.department = data['department'].strip()
    if 'phone' in data:
        user.phone = data['phone'].strip()
    if 'skills' in data:
        if isinstance(data['skills'], list):
            user.skills = ', '.join(data['skills'])
        else:
            user.skills = str(data['skills']).strip()
    if 'theme_preference' in data and data['theme_preference'] in ['default', 'dark', 'light', 'blue', 'purple', 'emerald']:
        user.theme_preference = data['theme_preference']
    if 'avatar_url' in data:
        user.avatar_url = data['avatar_url']
        
    db.session.commit()
    
    log = ActivityLog(
        user_id=user.id,
        action='UPDATE_PROFILE',
        entity_type='User',
        entity_id=user.id,
        details='Updated user profile information'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': user.to_dict()
    }), 200

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json() or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Please provide current and new passwords'}), 400
        
    if not user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400
        
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400
        
    user.set_password(new_password)
    db.session.commit()
    
    log = ActivityLog(
        user_id=user.id,
        action='CHANGE_PASSWORD',
        entity_type='User',
        entity_id=user.id,
        details='Changed user password'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200
