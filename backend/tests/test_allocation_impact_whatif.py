import pytest
import json
from app.extensions import db
from app.models.user import User, DeveloperSkill
from app.models.issue import Issue
from app.models.project import Project

@pytest.fixture
def auth_headers(client, app):
    with app.app_context():
        admin = User.query.filter_by(email='admin@bugflow.ai').first()
        if not admin:
            admin = User(username='admin_test', email='admin@bugflow.ai', role='Admin', full_name='Admin User', is_active=True)
            admin.set_password('password123')
            db.session.add(admin)
            db.session.commit()

        proj = Project.query.first()
        if not proj:
            proj = Project(name="Test Allocation Project", key="ALLOC", description="Project for allocation tests", owner_id=admin.id)
            db.session.add(proj)
            db.session.commit()
            
        res = client.post('/api/auth/login', json={
            'email': 'admin@bugflow.ai',
            'password': 'password123'
        })
        token = res.get_json()['access_token']
        return {'Authorization': f'Bearer {token}'}

def test_developer_allocation_agent_recommendation(client, auth_headers, app):
    """Test AI Developer Allocation Agent scoring and recommendation"""
    response = client.post('/api/ai/recommend-developer', json={
        'title': 'SQL Injection vulnerability in AuthController',
        'description': 'Unsanitized input in login query allows authentication bypass',
        'category': 'Authentication',
        'module': 'AuthController',
        'severity': 'Critical',
        'priority': 'High'
    }, headers=auth_headers)

    assert response.status_code == 200
    data = response.get_json()
    assert 'best_candidate' in data
    assert 'rankings' in data
    assert len(data['rankings']) > 0

    best = data['best_candidate']
    assert 'score' in best
    assert 'breakdown' in best
    assert 'workload_status' in best
    assert best['workload_status'] in ['LOW', 'MEDIUM', 'HIGH', 'OVERLOADED']

def test_developer_allocation_auto_assign(client, auth_headers, app):
    """Test automatic developer allocation for an existing defect"""
    with app.app_context():
        admin = User.query.filter_by(email='admin@bugflow.ai').first()
        proj = Project.query.first()
        if not proj:
            proj = Project(name="Test Allocation Project 2", key="ALLOC2", description="Project for allocation tests", owner_id=admin.id)
            db.session.add(proj)
            db.session.commit()

        issue = Issue(
            project_id=proj.id,
            reporter_id=admin.id,
            issue_key=f"{proj.key}-TESTALLOC",
            title="Database Connection Timeout on Heavy Load",
            description="Connection pool runs out of resources during peak API load",
            category="Database",
            severity="High",
            priority="High",
            status="Reported"
        )
        db.session.add(issue)
        db.session.commit()
        issue_id = issue.id

    response = client.post('/api/ai/allocate-developer', json={
        'issue_id': issue_id
    }, headers=auth_headers)

    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['assigned_developer'] is not None
    assert 'allocation_score' in data

def test_impact_analysis_agent(client, auth_headers, app):
    """Test Defect Impact Analysis Agent risk scoring & metrics"""
    response = client.post('/api/ai/impact-analysis', json={
        'title': 'Payment Gateway Timeout on Checkout',
        'description': 'Stripe webhook fails to respond causing double charge',
        'category': 'Payment',
        'module': 'PaymentService',
        'severity': 'Critical',
        'priority': 'Critical'
    }, headers=auth_headers)

    assert response.status_code == 200
    data = response.get_json()
    assert 'calculated_metrics' in data
    assert 'risk_score' in data['calculated_metrics']
    assert 'risk_level' in data['calculated_metrics']
    assert data['calculated_metrics']['risk_level'] in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    assert 'database_facts' in data
    assert 'ai_inferences' in data

def test_team_load_balance_endpoint(client, auth_headers, app):
    """Test team-wide developer load balancing endpoint"""
    response = client.post('/api/ai/load-balance', json={}, headers=auth_headers)

    assert response.status_code == 200
    data = response.get_json()
    assert 'developer_count' in data
    assert 'overloaded_count' in data
    assert 'team_load_balance' in data
    assert isinstance(data['team_load_balance'], list)

def test_what_if_assignment_simulation(client, auth_headers, app):
    """Test What-If Load Balance Assignment simulation endpoint"""
    with app.app_context():
        dev = User.query.filter(User.role.in_(['Developer', 'DEVELOPER'])).first()
        if not dev:
            dev = User.query.first()
        dev_id = dev.id if dev else 1

    response = client.post('/api/ai/what-if-assignment', json={
        'target_developer_id': dev_id,
        'defect_data': {
            'title': 'Memory Leak in Analytics Pipeline',
            'severity': 'High',
            'priority': 'High'
        }
    }, headers=auth_headers)

    assert response.status_code == 200
    data = response.get_json()
    assert 'current_load' in data or 'pre_assignment' in data
    assert 'simulated_post_load' in data or 'post_assignment' in data

def test_developer_workload_api(client, auth_headers, app):
    """Test developer workload dashboard API"""
    response = client.get('/api/users/developers/dashboard', headers=auth_headers)

    assert response.status_code == 200
    data = response.get_json()
    assert 'developers' in data
    assert 'summary' in data
    assert len(data['developers']) > 0
