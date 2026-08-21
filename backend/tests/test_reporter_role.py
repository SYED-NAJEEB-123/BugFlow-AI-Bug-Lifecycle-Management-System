import pytest
from app.models.user import User
from app.models.issue import Issue

def test_reporter_registration_login_and_permissions(client, admin_headers):
    # 1. Register new Reporter user
    reg_res = client.post('/api/auth/register', json={
        'email': 'reporter_test@bugflow.com',
        'username': 'reporter_unit',
        'password': 'password123',
        'full_name': 'Unit Test Reporter',
        'role': 'Reporter',
        'department': 'Quality Control'
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.get_json()
    assert reg_data['user']['role'] == 'Reporter'

    # 2. Login as Reporter
    login_res = client.post('/api/auth/login', json={
        'email_or_username': 'reporter_test@bugflow.com',
        'password': 'password123'
    })
    assert login_res.status_code == 200
    reporter_token = login_res.get_json()['access_token']
    reporter_headers = {'Authorization': f'Bearer {reporter_token}'}

    # 3. Create project as Admin
    proj_res = client.post('/api/projects', headers=admin_headers, json={
        'name': 'Reporter Test Project',
        'key': 'RPT',
        'description': 'Project for testing reporter role capabilities'
    })
    assert proj_res.status_code == 201
    project_id = proj_res.get_json()['project']['id']

    # 4. Create issue as Reporter
    create_res = client.post('/api/issues', headers=reporter_headers, json={
        'project_id': project_id,
        'title': 'Reporter reported defect title',
        'description': 'Detailed bug description by reporter',
        'severity': 'High',
        'priority': 'Medium',
        'environment': 'Staging'
    })
    assert create_res.status_code == 201
    issue_data = create_res.get_json()['issue']
    issue_id = issue_data['id']
    assert issue_data['reporter']['email'] == 'reporter_test@bugflow.com'

    # 5. Edit issue while status is Reported (Allowed)
    edit_res = client.put(f'/api/issues/{issue_id}', headers=reporter_headers, json={
        'title': 'Reporter reported defect title - UPDATED',
        'description': 'Updated bug description by reporter'
    })
    assert edit_res.status_code == 200
    assert edit_res.get_json()['issue']['title'] == 'Reporter reported defect title - UPDATED'

    # 6. Admin transitions issue to In Progress
    trans_res = client.put(f'/api/issues/{issue_id}/status', headers=admin_headers, json={
        'status': 'In Progress'
    })
    assert trans_res.status_code == 200

    # 7. Reporter attempts to edit issue while in In Progress (Forbidden)
    restricted_res = client.put(f'/api/issues/{issue_id}', headers=reporter_headers, json={
        'title': 'Attempting illegal update'
    })
    assert restricted_res.status_code == 403
    assert 'This issue is currently being processed and can no longer be modified.' in restricted_res.get_json()['error']

    # 8. Reporter attempts to create Sprint (Forbidden)
    sprint_res = client.post('/api/sprints', headers=reporter_headers, json={
        'project_id': project_id,
        'name': 'Illegal Sprint'
    })
    assert sprint_res.status_code == 403
