import uuid
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.project import Project
from app.models.issue import Issue

def verify_end_to_end_defect_flow():
    app = create_app('development')
    with app.app_context():
        print("--- Testing End-to-End Defect Creation & Retrieval for All Roles ---")
        
        roles = ['Admin', 'Developer', 'Tester', 'Project Manager', 'Reporter']
        tokens = {}
        
        with app.test_client() as client:
            # 1. Register & Login users for all 5 roles
            for role in roles:
                suffix = uuid.uuid4().hex[:6]
                email = f"defect_user_{role.lower().replace(' ', '_')}_{suffix}@bugflow.com"
                username = f"duser_{role.lower().replace(' ', '_')}_{suffix}"
                
                reg_res = client.post('/api/auth/register', json={
                    'email': email,
                    'username': username,
                    'password': 'password123',
                    'full_name': f'Defect Tester {role}',
                    'role': role,
                    'department': 'QA'
                })
                assert reg_res.status_code == 201, f"Registration failed for {role}: {reg_res.get_json()}"
                
                login_res = client.post('/api/auth/login', json={
                    'email_or_username': email,
                    'password': 'password123'
                })
                assert login_res.status_code == 200, f"Login failed for {role}: {login_res.get_json()}"
                tokens[role] = login_res.get_json()['access_token']
                
            # 2. Create Project as Admin
            admin_headers = {'Authorization': f"Bearer {tokens['Admin']}"}
            proj_res = client.post('/api/projects', headers=admin_headers, json={
                'name': 'End-To-End Defect Testing Project',
                'key': f'E2E{uuid.uuid4().hex[:4]}',
                'description': 'Testing defect lifecycle'
            })
            assert proj_res.status_code == 201
            project_id = proj_res.get_json()['project']['id']
            print(f"  [OK] Created Project ID: {project_id}")

            # 3. Create Defect for EVERY role
            created_issue_ids = []
            for role in roles:
                headers = {'Authorization': f"Bearer {tokens[role]}"}
                payload = {
                    'project_id': project_id,
                    'title': f'Defect reported by role {role}',
                    'description': f'Detailed steps and error description for role {role}',
                    'severity': 'High',
                    'priority': 'Critical',
                    'environment': 'Staging',
                    'category': 'UI/UX',
                    'module': 'Authentication'
                }
                
                create_res = client.post('/api/issues', headers=headers, json=payload)
                print(f"Creating Defect as [{role}]: HTTP {create_res.status_code}")
                assert create_res.status_code == 201, f"Defect creation failed for {role}: {create_res.get_json()}"
                
                issue = create_res.get_json()['issue']
                assert issue['id'] is not None
                assert issue['title'] == f'Defect reported by role {role}'
                assert issue['project_id'] == project_id
                created_issue_ids.append((role, issue['id']))
                print(f"  [OK] Saved Defect Key: {issue['issue_key']}")

            # 4. Verify GET /api/issues returns all issues
            get_res = client.get('/api/issues', headers=admin_headers)
            assert get_res.status_code == 200
            issues_list = get_res.get_json()['issues']
            print(f"  [OK] Total Defects Retrieved via API: {len(issues_list)}")

            # 5. Verify GET /api/issues?reporter_id=... for Reporter
            reporter_headers = {'Authorization': f"Bearer {tokens['Reporter']}"}
            rep_user = User.query.filter_by(role='Reporter').order_by(User.id.desc()).first()
            my_res = client.get(f'/api/issues?reporter_id={rep_user.id}', headers=reporter_headers)
            assert my_res.status_code == 200
            my_issues = my_res.get_json()['issues']
            assert len(my_issues) >= 1
            print(f"  [OK] Reporter Filtered Defects Count: {len(my_issues)}")

            print("\nALL DEFECT CREATION & RETRIEVAL TESTS PASSED PERFECTLY!")

if __name__ == '__main__':
    verify_end_to_end_defect_flow()
