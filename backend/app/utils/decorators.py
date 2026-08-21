from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request

def role_required(allowed_roles):
    """
    Decorator to restrict access to users with specific roles.
    `allowed_roles` can be a single role string or a list of role strings.
    """
    if isinstance(allowed_roles, str):
        allowed_roles = [allowed_roles]

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get('role')
            
            if user_role not in allowed_roles:
                return jsonify({
                    'error': 'Forbidden',
                    'message': f'Access denied. Requires one of roles: {", ".join(allowed_roles)}. Your role: {user_role}'
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
