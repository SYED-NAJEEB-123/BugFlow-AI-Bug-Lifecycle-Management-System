from datetime import datetime
from app.extensions import db

VALID_SPRINT_STATUSES = ['Planned', 'Active', 'Completed', 'Archived']

class Sprint(db.Model):
    __tablename__ = 'sprints'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    goal = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(30), nullable=False, default='Planned') # Planned, Active, Completed, Archived
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = db.relationship('Project', backref=db.backref('sprints', lazy=True, cascade="all, delete-orphan"))
    created_by = db.relationship('User', foreign_keys=[created_by_id], lazy=True)
    issues = db.relationship('Issue', backref='sprint', lazy=True)

    def to_dict(self, include_issues=False):
        total_defects = len(self.issues)
        completed_defects = sum(1 for i in self.issues if i.status in ['Resolved', 'Verified', 'Closed'])
        progress_pct = round((completed_defects / total_defects * 100), 1) if total_defects > 0 else 0.0

        data = {
            'id': self.id,
            'project_id': self.project_id,
            'project': {
                'id': self.project.id,
                'name': self.project.name,
                'key': self.project.key
            } if self.project else None,
            'name': self.name,
            'goal': self.goal or '',
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'created_by_id': self.created_by_id,
            'created_by': self.created_by.to_dict() if self.created_by else None,
            'total_defects': total_defects,
            'completed_defects': completed_defects,
            'remaining_defects': total_defects - completed_defects,
            'progress_percentage': progress_pct,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if include_issues:
            data['issues'] = [i.to_dict() for i in self.issues]

        return data
