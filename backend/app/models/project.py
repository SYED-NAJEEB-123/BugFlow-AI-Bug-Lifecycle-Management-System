from datetime import datetime
from app.extensions import db

class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    key = db.Column(db.String(10), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='Active')  # Active, Completed, Archived
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    target_end_date = db.Column(db.DateTime, nullable=True)
    progress_percentage = db.Column(db.Float, default=0.0)
    ai_summary = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = db.relationship('User', foreign_keys=[owner_id], backref='owned_projects', lazy=True)
    members = db.relationship('ProjectMember', backref='project', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'key': self.key,
            'description': self.description or '',
            'owner_id': self.owner_id,
            'owner': self.owner.to_dict() if self.owner else None,
            'status': self.status,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'target_end_date': self.target_end_date.isoformat() if self.target_end_date else None,
            'progress_percentage': self.progress_percentage or 0.0,
            'ai_summary': self.ai_summary or '',
            'members_count': len(self.members),
            'members': [m.to_dict() for m in self.members],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ProjectMember(db.Model):
    __tablename__ = 'project_members'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role_in_project = db.Column(db.String(40), default='Member')
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id], lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'role_in_project': self.role_in_project,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None
        }
