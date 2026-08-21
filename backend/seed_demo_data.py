import os
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.issue import Issue, IssueComment, DefectResolutionKnowledge

def seed_demo():
    app = create_app('development')
    with app.app_context():
        db.create_all()
        
        if User.query.first():
            print("Database already contains data. Skipping demo seed.")
            return

        demo_users = [
            {
                'email': 'admin@bugflow.io',
                'username': 'admin',
                'password': 'password123',
                'full_name': 'Sarah Connor (Admin)',
                'role': 'Admin',
                'department': 'Executive & IT Operations'
            },
            {
                'email': 'developer@bugflow.io',
                'username': 'developer',
                'password': 'password123',
                'full_name': 'Alex Rivera (Dev)',
                'role': 'Developer',
                'department': 'Core Engineering'
            },
            {
                'email': 'tester@bugflow.io',
                'username': 'tester',
                'password': 'password123',
                'full_name': 'Elena Rostova (QA)',
                'role': 'Tester',
                'department': 'Quality Assurance'
            },
            {
                'email': 'manager@bugflow.io',
                'username': 'manager',
                'password': 'password123',
                'full_name': 'Marcus Vance (PM)',
                'role': 'Project Manager',
                'department': 'Product Strategy'
            }
        ]

        for u_data in demo_users:
            user = User(
                email=u_data['email'],
                username=u_data['username'],
                full_name=u_data['full_name'],
                role=u_data['role'],
                department=u_data['department']
            )
            user.set_password(u_data['password'])
            db.session.add(user)
        db.session.commit()
        print("Successfully seeded demo users!")

if __name__ == '__main__':
    seed_demo()
