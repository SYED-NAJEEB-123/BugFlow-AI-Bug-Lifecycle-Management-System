from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db

VALID_ROLES = ['Admin', 'Developer', 'Tester', 'Project Manager', 'Reporter']

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(30), nullable=False, default='Developer')
    department = db.Column(db.String(80), nullable=True, default='Engineering')
    phone = db.Column(db.String(20), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    skills = db.Column(db.String(255), nullable=True, default='')
    theme_preference = db.Column(db.String(20), nullable=False, default='dark')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    activity_logs = db.relationship('ActivityLog', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'full_name': self.full_name,
            'role': self.role,
            'department': self.department or '',
            'phone': self.phone or '',
            'avatar_url': self.avatar_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={self.username}",
            'skills': [s.strip() for s in self.skills.split(',')] if self.skills else [],
            'theme_preference': self.theme_preference or 'dark',
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50), nullable=True)
    entity_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class DeveloperSkill(db.Model):
    __tablename__ = 'developer_skills'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    primary_languages = db.Column(db.String(255), nullable=True, default='')
    frameworks = db.Column(db.String(255), nullable=True, default='')
    preferred_categories = db.Column(db.String(255), nullable=True, default='')
    preferred_modules = db.Column(db.String(255), nullable=True, default='')
    experience_rating = db.Column(db.Integer, default=3)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('developer_skill', uselist=False, lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'primary_languages': [l.strip() for l in self.primary_languages.split(',')] if self.primary_languages else [],
            'frameworks': [f.strip() for f in self.frameworks.split(',')] if self.frameworks else [],
            'preferred_categories': [c.strip() for c in self.preferred_categories.split(',')] if self.preferred_categories else [],
            'preferred_modules': [m.strip() for m in self.preferred_modules.split(',')] if self.preferred_modules else [],
            'experience_rating': self.experience_rating,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class AgentDecision(db.Model):
    __tablename__ = 'agent_decisions'

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.id', ondelete='CASCADE'), nullable=True)
    action_type = db.Column(db.String(50), nullable=False)
    confidence_score = db.Column(db.Integer, default=0)
    extracted_info_json = db.Column(db.Text, nullable=True)
    duplicate_check_json = db.Column(db.Text, nullable=True)
    selected_developer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    assignment_score = db.Column(db.Integer, default=0)
    reasoning = db.Column(db.Text, nullable=True)
    is_override = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    selected_developer = db.relationship('User', foreign_keys=[selected_developer_id])

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'issue_id': self.issue_id,
            'action_type': self.action_type,
            'confidence_score': self.confidence_score,
            'extracted_info': json.loads(self.extracted_info_json) if self.extracted_info_json else {},
            'duplicate_check': json.loads(self.duplicate_check_json) if self.duplicate_check_json else {},
            'selected_developer_id': self.selected_developer_id,
            'selected_developer': self.selected_developer.to_dict() if self.selected_developer else None,
            'assignment_score': self.assignment_score,
            'reasoning': self.reasoning,
            'is_override': self.is_override,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

