from datetime import datetime
from app.extensions import db

VALID_STATUSES = [
    'Reported',
    'Assigned',
    'In Progress',
    'In Review',
    'Resolved',
    'Verified',
    'Closed',
    'Reopened'
]

VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical']
VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical', 'Urgent']

VALID_CATEGORIES = ['UI/UX', 'API', 'Authentication', 'Database', 'Performance', 'Security', 'Payment', 'General']
VALID_DEFECT_TYPES = ['Functional Defect', 'UI Bug', 'Security Vulnerability', 'Performance Issue', 'Crash / Exception', 'Compatibility']

class Issue(db.Model):
    __tablename__ = 'issues'

    id = db.Column(db.Integer, primary_key=True)
    issue_key = db.Column(db.String(20), unique=True, nullable=False, index=True) # e.g. BUG-101
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    sprint_id = db.Column(db.Integer, db.ForeignKey('sprints.id', ondelete='SET NULL'), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    expected_behavior = db.Column(db.Text, nullable=True)
    actual_behavior = db.Column(db.Text, nullable=True)
    steps_to_reproduce = db.Column(db.Text, nullable=True)
    root_cause = db.Column(db.Text, nullable=True)
    suggested_fix = db.Column(db.Text, nullable=True)
    
    category = db.Column(db.String(50), default='General')
    module = db.Column(db.String(80), nullable=True, default='General')
    defect_type = db.Column(db.String(50), default='Functional Defect')
    
    severity = db.Column(db.String(20), default='Medium') # Low, Medium, High, Critical
    priority = db.Column(db.String(20), default='Medium') # Low, Medium, High, Critical
    status = db.Column(db.String(30), default='Reported') # Reported, Assigned, In Progress, In Review, Resolved, Verified, Closed, Reopened
    environment = db.Column(db.String(50), default='Development')

    reporter_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    ai_enhanced = db.Column(db.Boolean, default=False)
    vision_analyzed = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = db.relationship('Project', backref=db.backref('issues', lazy=True, cascade="all, delete-orphan"))
    reporter = db.relationship('User', foreign_keys=[reporter_id], backref='reported_issues', lazy=True)
    assignee = db.relationship('User', foreign_keys=[assignee_id], backref='assigned_issues', lazy=True)

    attachments = db.relationship('IssueAttachment', backref='issue', lazy=True, cascade="all, delete-orphan")
    comments = db.relationship('IssueComment', backref='issue', lazy=True, cascade="all, delete-orphan")
    history = db.relationship('IssueHistory', backref='issue', lazy=True, cascade="all, delete-orphan")
    embedding = db.relationship('DefectEmbedding', backref='issue', uselist=False, lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'issue_key': self.issue_key,
            'project_id': self.project_id,
            'project': {
                'id': self.project.id,
                'name': self.project.name,
                'key': self.project.key
            } if self.project else None,
            'sprint_id': self.sprint_id,
            'sprint': {
                'id': self.sprint.id,
                'name': self.sprint.name,
                'status': self.sprint.status
            } if self.sprint else None,
            'title': self.title,
            'description': self.description,
            'expected_behavior': self.expected_behavior or '',
            'actual_behavior': self.actual_behavior or '',
            'steps_to_reproduce': self.steps_to_reproduce or '',
            'root_cause': self.root_cause or '',
            'suggested_fix': self.suggested_fix or '',
            'category': self.category or 'General',
            'module': self.module or 'General',
            'defect_type': self.defect_type or 'Functional Defect',
            'severity': self.severity,
            'priority': self.priority,
            'status': self.status,
            'environment': self.environment or 'Development',
            'reporter_id': self.reporter_id,
            'reporter': self.reporter.to_dict() if self.reporter else None,
            'assignee_id': self.assignee_id,
            'assignee': self.assignee.to_dict() if self.assignee else None,
            'ai_enhanced': self.ai_enhanced,
            'vision_analyzed': self.vision_analyzed,
            'comments_count': len(self.comments),
            'attachments_count': len(self.attachments),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class DefectEmbedding(db.Model):
    __tablename__ = 'defect_embeddings'

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.id', ondelete='CASCADE'), nullable=False, unique=True)
    embedding_json = db.Column(db.Text, nullable=False)
    text_content = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class IssueAttachment(db.Model):
    __tablename__ = 'issue_attachments'

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=True)
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    uploaded_by = db.relationship('User', foreign_keys=[uploaded_by_id], lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'issue_id': self.issue_id,
            'filename': self.filename,
            'file_path': self.file_path,
            'file_type': self.file_type,
            'uploaded_by': self.uploaded_by.to_dict() if self.uploaded_by else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class IssueComment(db.Model):
    __tablename__ = 'issue_comments'

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_ai_generated = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id], lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'issue_id': self.issue_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'content': self.content,
            'is_ai_generated': self.is_ai_generated,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class IssueHistory(db.Model):
    __tablename__ = 'issue_history'

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    field_changed = db.Column(db.String(50), nullable=False)
    old_value = db.Column(db.String(255), nullable=True)
    new_value = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id], lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'issue_id': self.issue_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'field_changed': self.field_changed,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class DefectResolutionKnowledge(db.Model):
    __tablename__ = 'defect_resolution_knowledge'

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.id'), nullable=False)
    issue_key = db.Column(db.String(20), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=True)
    root_cause = db.Column(db.Text, nullable=True)
    resolution_summary = db.Column(db.Text, nullable=True)
    code_fix_snippet = db.Column(db.Text, nullable=True)
    resolved_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'issue_id': self.issue_id,
            'issue_key': self.issue_key,
            'title': self.title,
            'category': self.category,
            'root_cause': self.root_cause,
            'resolution_summary': self.resolution_summary,
            'code_fix_snippet': self.code_fix_snippet,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }
