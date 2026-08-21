import pytest
from app import create_app
from app.extensions import db
from app.models.user import User

@pytest.fixture
def app():
    app = create_app('testing')
    app.config.update({
        'TESTING': True,
        'JWT_SECRET_KEY': 'test-secret-key-123'
    })

    with app.app_context():
        db.create_all()
        
        # Seed test admin account in in-memory testing DB
        admin = User(
            email='admin@bugflow.io',
            username='admin',
            full_name='Test Admin',
            role='Admin'
        )
        admin.set_password('password123')
        db.session.add(admin)
        db.session.commit()

        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def admin_headers(client):
    res = client.post('/api/auth/login', json={
        'email_or_username': 'admin@bugflow.io',
        'password': 'password123'
    })
    token = res.json.get('access_token')
    return {'Authorization': f'Bearer {token}'}
