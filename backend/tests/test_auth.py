def test_login_success(client):
    res = client.post('/api/auth/login', json={
        'email_or_username': 'admin@bugflow.io',
        'password': 'password123'
    })
    assert res.status_code == 200
    assert 'access_token' in res.json
    assert res.json['user']['role'] == 'Admin'

def test_login_invalid_password(client):
    res = client.post('/api/auth/login', json={
        'email_or_username': 'admin@bugflow.io',
        'password': 'wrongpassword'
    })
    assert res.status_code == 401

def test_register_user(client):
    res = client.post('/api/auth/register', json={
        'email': 'newdev@bugflow.io',
        'username': 'newdev',
        'password': 'password123',
        'full_name': 'New Dev',
        'role': 'Developer'
    })
    assert res.status_code == 201
    assert res.json['user']['username'] == 'newdev'
