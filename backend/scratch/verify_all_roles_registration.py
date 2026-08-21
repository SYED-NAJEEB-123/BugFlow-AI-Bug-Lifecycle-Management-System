import uuid
from app import create_app
from app.extensions import db
from app.models.user import User, VALID_ROLES

def verify_registration_for_all_roles():
    app = create_app('development')
    with app.app_context():
        roles_to_test = ['Admin', 'Developer', 'Tester', 'Project Manager', 'Reporter']
        
        # Ensure all 5 roles are supported in VALID_ROLES
        for r in roles_to_test:
            assert r in VALID_ROLES, f"Role {r} is missing from VALID_ROLES!"

        with app.test_client() as client:
            print("--- Testing Registration for All 5 Supported Roles ---")
            for role in roles_to_test:
                suffix = uuid.uuid4().hex[:6]
                email = f"test_{role.lower().replace(' ', '_')}_{suffix}@bugflow.com"
                username = f"user_{role.lower().replace(' ', '_')}_{suffix}"
                
                payload = {
                    'email': email,
                    'username': username,
                    'password': 'password123',
                    'full_name': f'Test {role} User',
                    'role': role,
                    'department': 'Engineering',
                    'phone': '+1555000000',
                    'skills': 'Python, React'
                }
                
                res = client.post('/api/auth/register', json=payload)
                print(f"Registering Role [{role}]: HTTP {res.status_code}")
                assert res.status_code == 201, f"Registration failed for role {role}: {res.get_json()}"
                
                data = res.get_json()
                assert data['user']['role'] == role, f"Role mismatch: expected {role}, got {data['user']['role']}"
                assert 'access_token' in data
                
                # Verify login works using newly registered credentials
                login_res = client.post('/api/auth/login', json={
                    'email_or_username': email,
                    'password': 'password123'
                })
                assert login_res.status_code == 200, f"Login failed for newly registered {role}: {login_res.get_json()}"
                print(f"  [OK] Login Verified for Role [{role}]")

            print("\nALL 5 ROLES REGISTERED AND AUTHENTICATED SUCCESSFULLY!")

if __name__ == '__main__':
    verify_registration_for_all_roles()
