from app.routes.auth import auth_bp
from app.routes.users import users_bp
from app.routes.projects import projects_bp
from app.routes.issues import issues_bp
from app.routes.ai import ai_bp
from app.routes.analytics import analytics_bp

__all__ = ['auth_bp', 'users_bp', 'projects_bp', 'issues_bp', 'ai_bp', 'analytics_bp']
