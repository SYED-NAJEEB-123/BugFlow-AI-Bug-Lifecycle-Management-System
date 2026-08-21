import uuid
from app import create_app
from app.models.user import User
from app.models.project import Project
from app.models.issue import Issue

def verify_assigned_status_workflow():
    app = create_app('development')
    with app.app_context():
        print("--- Testing Assigned Status Transition & Kanban Workflow ---")
        
        with app.test_client() as client:
            # 1. Register Admin & Developer
            admin_res = client.post('/api/auth/register', json={
                'email': f"kanban_admin_{uuid.uuid4().hex[:4]}@bugflow.com",
                'username': f"kadmin_{uuid.uuid4().hex[:4]}",
                'password': 'password123',
                'full_name': 'Kanban Admin',
                'role': 'Admin'
            })
            admin_token = admin_res.get_json()['access_token']
            admin_headers = {'Authorization': f'Bearer {admin_token}'}

            dev_res = client.post('/api/auth/register', json={
                'email': f"kanban_dev_{uuid.uuid4().hex[:4]}@bugflow.com",
                'username': f"kdev_{uuid.uuid4().hex[:4]}",
                'password': 'password123',
                'full_name': 'Kanban Developer',
                'role': 'Developer'
            })
            dev_user = dev_res.get_json()['user']

            # 2. Create Project
            proj_res = client.post('/api/projects', headers=admin_headers, json={
                'name': 'Kanban Assigned Test Project',
                'key': f'KNB{uuid.uuid4().hex[:3]}',
                'description': 'Kanban testing'
            })
            project_id = proj_res.get_json()['project']['id']

            # 3. Create Issue (starts in Reported)
            create_res = client.post('/api/issues', headers=admin_headers, json={
                'project_id': project_id,
                'title': 'Test defect for Kanban Assigned column',
                'description': 'Verify defect transitions to Assigned status upon developer assignment',
                'severity': 'High',
                'priority': 'High'
            })
            assert create_res.status_code == 201
            issue = create_res.get_json()['issue']
            issue_id = issue['id']
            assert issue['status'] == 'Reported'
            assert issue['assignee'] is None
            print(f"  [OK] Step 1: Created Defect {issue['issue_key']} in Status: [{issue['status']}]")

            # 4. Assign Developer via PUT /api/issues/<id>/assign
            assign_res = client.put(f'/api/issues/{issue_id}/assign', headers=admin_headers, json={
                'assignee_id': dev_user['id']
            })
            assert assign_res.status_code == 200
            updated_issue = assign_res.get_json()['issue']
            assert updated_issue['assignee_id'] == dev_user['id']
            assert updated_issue['status'] == 'Assigned'
            print(f"  [OK] Step 2: Assigned Developer -> Status automatically became: [{updated_issue['status']}]")

            # 5. Verify GET /api/issues returns status 'Assigned'
            list_res = client.get(f'/api/issues?project_id={project_id}', headers=admin_headers)
            fetched_issue = next(i for i in list_res.get_json()['issues'] if i['id'] == issue_id)
            assert fetched_issue['status'] == 'Assigned'
            print(f"  [OK] Step 3: Verified GET API returns Status: [{fetched_issue['status']}] for Kanban Board")

            # 6. Verify Full Workflow Continuity
            statuses = ['In Progress', 'In Review', 'Resolved', 'Verified', 'Closed']
            for next_st in statuses:
                trans_res = client.put(f'/api/issues/{issue_id}/status', headers=admin_headers, json={
                    'status': next_st
                })
                assert trans_res.status_code == 200
                st_issue = trans_res.get_json()['issue']
                assert st_issue['status'] == next_st
                print(f"  [OK] Workflow Continuation -> Transitioned to [{next_st}]")

            print("\nALL KANBAN ASSIGNED STATUS WORKFLOW VERIFICATIONS PASSED!")

if __name__ == '__main__':
    verify_assigned_status_workflow()
