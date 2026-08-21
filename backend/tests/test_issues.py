def test_create_and_transition_issue(client, admin_headers):
    # Create project first
    p_res = client.post('/api/projects', headers=admin_headers, json={
        'name': 'Defect Testing Suite',
        'key': 'DTS',
        'description': 'Project created for defect state machine verification'
    })
    assert p_res.status_code == 201
    project_id = p_res.json['project']['id']

    # Create defect
    i_res = client.post('/api/issues', headers=admin_headers, json={
        'project_id': project_id,
        'title': 'Test Defect Lifecycle State Machine',
        'description': 'Verifying state transition from Reported to Resolved',
        'severity': 'High',
        'priority': 'High'
    })
    assert i_res.status_code == 201
    issue_id = i_res.json['issue']['id']
    assert i_res.json['issue']['status'] == 'Reported'

    # Transition status to In Progress
    st_res = client.put(f'/api/issues/{issue_id}/status', headers=admin_headers, json={
        'status': 'In Progress'
    })
    assert st_res.status_code == 200
    assert st_res.json['issue']['status'] == 'In Progress'

    # Transition status to Resolved
    res_res = client.put(f'/api/issues/{issue_id}/status', headers=admin_headers, json={
        'status': 'Resolved',
        'root_cause': 'Unit test verified fix',
        'resolution_summary': 'Resolved via test suite assertion'
    })
    assert res_res.status_code == 200
    assert res_res.json['issue']['status'] == 'Resolved'
