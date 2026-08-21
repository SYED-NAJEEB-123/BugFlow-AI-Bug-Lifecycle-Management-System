import pytest
from app.models.sprint import Sprint
from app.models.issue import Issue

def test_sprint_crud_and_defect_assignment(client, admin_headers):
    # 1. Create project first
    proj_res = client.post('/api/projects', headers=admin_headers, json={
        'name': 'Sprint Platform',
        'key': 'SPT',
        'description': 'Sprint management test project'
    })
    assert proj_res.status_code == 201
    project_id = proj_res.get_json()['project']['id']

    # 2. Create Sprint
    sprint_res = client.post('/api/sprints', headers=admin_headers, json={
        'project_id': project_id,
        'name': 'Sprint 1',
        'goal': 'Implement core authentication & issue persistence',
        'start_date': '2026-08-01T00:00:00Z',
        'end_date': '2026-08-14T00:00:00Z'
    })
    assert sprint_res.status_code == 201
    sprint = sprint_res.get_json()['sprint']
    sprint_id = sprint['id']
    assert sprint['name'] == 'Sprint 1'
    assert sprint['status'] == 'Planned'

    # 3. Start Sprint
    start_res = client.post(f'/api/sprints/{sprint_id}/start', headers=admin_headers)
    assert start_res.status_code == 200
    assert start_res.get_json()['sprint']['status'] == 'Active'

    # 4. Create Issue and assign to sprint
    issue_res = client.post('/api/issues', headers=admin_headers, json={
        'project_id': project_id,
        'sprint_id': sprint_id,
        'title': 'Sprint defect assignment test',
        'description': 'Verify defect assigns cleanly to active sprint',
        'severity': 'Medium'
    })
    assert issue_res.status_code == 201
    issue_id = issue_res.get_json()['issue']['id']

    # 5. Fetch sprint detail & verify burndown metrics
    detail_res = client.get(f'/api/sprints/{sprint_id}', headers=admin_headers)
    assert detail_res.status_code == 200
    s_detail = detail_res.get_json()['sprint']
    assert s_detail['total_defects'] == 1
    assert s_detail['completed_defects'] == 0
    assert s_detail['progress_percentage'] == 0.0

    # 6. Complete defect and verify sprint progress update
    status_res = client.put(f'/api/issues/{issue_id}/status', headers=admin_headers, json={
        'status': 'Resolved'
    })
    assert status_res.status_code == 200

    detail_res2 = client.get(f'/api/sprints/{sprint_id}', headers=admin_headers)
    s_detail2 = detail_res2.get_json()['sprint']
    assert s_detail2['completed_defects'] == 1
    assert s_detail2['progress_percentage'] == 100.0

    # 7. Complete Sprint
    complete_res = client.post(f'/api/sprints/{sprint_id}/complete', headers=admin_headers)
    assert complete_res.status_code == 200
    assert complete_res.get_json()['sprint']['status'] == 'Completed'

def test_semantic_search_and_duplicate_check(client, admin_headers):
    # 1. Create project & defect
    proj_res = client.post('/api/projects', headers=admin_headers, json={
        'name': 'Auth Portal',
        'key': 'ATH',
        'description': 'SSO Authentication Portal'
    })
    assert proj_res.status_code == 201
    project_id = proj_res.get_json()['project']['id']

    client.post('/api/issues', headers=admin_headers, json={
        'project_id': project_id,
        'title': 'Login button does not respond after entering valid credentials',
        'description': 'User clicks Sign In and nothing happens. Token generation fails silently.',
        'severity': 'High',
        'category': 'Authentication'
    })

    # 2. Semantic Search with natural language query
    search_res = client.post('/api/issues/semantic-search', headers=admin_headers, json={
        'query': 'authentication button not working',
        'project_id': project_id
    })
    assert search_res.status_code == 200
    search_data = search_res.get_json()
    assert search_data['total_matches'] >= 1
    assert search_data['results'][0]['similarity_score'] > 0

    # 3. Duplicate Detection Check before submission
    dup_res = client.post('/api/issues/check-duplicates', headers=admin_headers, json={
        'project_id': project_id,
        'threshold': 30,
        'title': 'Authentication login button fails to submit',
        'description': 'Clicking sign-in does not navigate or complete authentication.'
    })
    assert dup_res.status_code == 200
    dup_data = dup_res.get_json()
    assert dup_data['is_duplicate_suspected'] is True
    assert dup_data['highest_score'] >= 50
