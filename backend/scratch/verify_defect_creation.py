from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.project import Project
from app.models.issue import Issue

def test_defect_creation_end_to_end():
    app = create_app('development')
    with app.app_context():
        # Ensure an admin user exists
        admin = User.query.filter_by(email='admin@bugflow.com').first()
        if not admin:
            admin = User(
                username='admin_test',
                email='admin@bugflow.com',
                full_name='Test Admin',
                role='Admin'
            )
            admin.set_password('password123')
            db.session.add(admin)
            db.session.commit()

        # Ensure a project exists
        project = Project.query.filter_by(key='PRJTEST').first()
        if not project:
            project = Project(
                name='Defect Persistence Test Project',
                key='PRJTEST',
                description='Verification project for defect persistence',
                owner_id=admin.id
            )
            db.session.add(project)
            db.session.commit()

        with app.test_client() as client:
            # Login with email_or_username key
            login_res = client.post('/api/auth/login', json={
                'email_or_username': 'admin@bugflow.com',
                'password': 'password123'
            })
            assert login_res.status_code == 200, f"Login failed: {login_res.get_json()}"
            token = login_res.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}

            # Test 1: Submit defect with unassigned optional fields (assignee_id='', sprint_id='')
            payload_unassigned = {
                'project_id': project.id,
                'title': 'End to End Defect Creation Verification Test',
                'description': 'Testing that defect creation properly sanitizes empty integer fields and commits cleanly to SQLite.',
                'severity': 'Critical',
                'priority': 'High',
                'environment': 'Staging',
                'category': 'Database',
                'assignee_id': '',
                'sprint_id': ''
            }

            res1 = client.post('/api/issues', headers=headers, json=payload_unassigned)
            print("Create Defect Response Status:", res1.status_code)
            print("Create Defect Response JSON:", res1.get_json())

            assert res1.status_code == 201, f"Defect creation failed: {res1.get_json()}"
            res_data = res1.get_json()
            assert res_data.get('success') is True
            created_issue = res_data['issue']
            issue_id = created_issue['id']

            # Test 2: Verify defect exists in SQLite database
            db_issue = db.session.get(Issue, issue_id)
            assert db_issue is not None, "Defect was not found in SQLite database!"
            assert db_issue.title == 'End to End Defect Creation Verification Test'
            assert db_issue.assignee_id is None
            assert db_issue.sprint_id is None
            print("SUCCESS: Defect verified in SQLite database with ID:", db_issue.id, "Key:", db_issue.issue_key)

if __name__ == '__main__':
    test_defect_creation_end_to_end()
