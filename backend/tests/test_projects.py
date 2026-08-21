def test_get_projects(client, admin_headers):
    res = client.get('/api/projects', headers=admin_headers)
    assert res.status_code == 200
    assert 'projects' in res.json
    assert res.json['count'] >= 0

def test_create_project(client, admin_headers):
    res = client.post('/api/projects', headers=admin_headers, json={
        'name': 'Test Integration Suite',
        'key': 'TIS',
        'description': 'Integration testing project'
    })
    assert res.status_code == 201
    assert res.json['project']['key'] == 'TIS'
