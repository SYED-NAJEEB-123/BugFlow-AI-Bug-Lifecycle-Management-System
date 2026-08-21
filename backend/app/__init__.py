import os
from flask import Flask, jsonify
from app.config import config_by_name
from app.extensions import db, jwt, cors

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
        
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])
    
    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    
    # JWT Custom Handlers
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            'error': 'Invalid Token',
            'message': 'Signature verification failed or token malformed'
        }), 401
        
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            'error': 'Authorization Required',
            'message': 'Request does not contain an access token'
        }), 401
        
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'error': 'Token Expired',
            'message': 'Access token has expired. Please log in again.'
        }), 401

    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.projects import projects_bp
    from app.routes.issues import issues_bp
    from app.routes.sprints import sprints_bp
    from app.routes.ai import ai_bp
    from app.routes.analytics import analytics_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(issues_bp)
    app.register_blueprint(sprints_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(analytics_bp)
    
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'app': 'BugFlow API Engine',
            'version': '1.0.0'
        }), 200

    # Explicitly import all models inside app_context and create tables
    with app.app_context():
        from app.models.user import User, ActivityLog
        from app.models.project import Project, ProjectMember
        from app.models.sprint import Sprint
        from app.models.issue import (
            Issue, IssueComment, IssueHistory, DefectResolutionKnowledge, DefectEmbedding
        )
        db.create_all()

        # Automatic SQLite Column Migration for issues.sprint_id
        try:
            with db.engine.connect() as conn:
                from sqlalchemy import inspect, text
                inspector = inspect(db.engine)
                if 'issues' in inspector.get_table_names():
                    cols = [c['name'] for c in inspector.get_columns('issues')]
                    if 'sprint_id' not in cols:
                        conn.execute(text('ALTER TABLE issues ADD COLUMN sprint_id INTEGER REFERENCES sprints(id)'))
                        conn.commit()
        except Exception as e:
            app.logger.warning(f"Database migration notice: {e}")
        
    return app
