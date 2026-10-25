import re
import json
from app.extensions import db
from app.models.user import User
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.issue import Issue
from app.services.knowledge_base_service import KnowledgeBaseService
from app.services.rag_service import RAGService
from app.services.ai_service import get_gemini_client, clean_json_response

SYSTEM_ROUTE_MAP = {
    'Report Issue': {'path': '/issues', 'action': 'open_create_issue_modal', 'label': 'Open Report Issue'},
    'Issues List': {'path': '/issues', 'action': 'navigate', 'label': 'Open Issues List'},
    'Projects': {'path': '/projects', 'action': 'navigate', 'label': 'Open Projects'},
    'Analytics': {'path': '/analytics', 'action': 'navigate', 'label': 'Open Analytics'},
    'Developer Intelligence': {'path': '/developer-intelligence', 'action': 'navigate', 'label': 'Open Developer Intelligence'},
    'Sprints': {'path': '/sprints', 'action': 'navigate', 'label': 'Open Sprints'},
    'Knowledge Base': {'path': '/knowledge-base', 'action': 'navigate', 'label': 'Open Knowledge Base'},
    'Profile': {'path': '/profile', 'action': 'navigate', 'label': 'Open Profile'},
    'Settings': {'path': '/settings', 'action': 'navigate', 'label': 'Open Settings'}
}

ROLE_CAPABILITIES = {
    'Admin': "Admins have full access across the platform: managing users, changing user roles, creating/deleting projects, managing sprints, and configuring system settings.",
    'Project Manager': "Project Managers can create projects, create and manage sprints, assign defects to developers, and review project analytics.",
    'Developer': "Developers can view assigned defects, update defect status (In Progress, In Review, Resolved), view RAG resolution recommendations, post technical comments, and search the Knowledge Base.",
    'Tester': "Testers can report new defects, run vision analysis on screenshots, verify resolved defects, and reopen defects if issues persist.",
    'Reporter': "Reporters can file bug reports, track defects reported by themselves, and view resolution progress."
}

class ChatbotService:
    @staticmethod
    def process_chat_message(user_message, current_user, conversation_history=None):
        """
        Process incoming chatbot message, perform intent recognition & DB retrieval,
        enforce RBAC, and generate structured response with optional navigation action.
        """
        msg_clean = user_message.strip()
        msg_lower = msg_clean.lower()

        retrieved_data = {}
        nav_action = None
        rag_references = []

        # 1. Navigation Intent Matching
        if any(w in msg_lower for w in ['where can i create', 'how do i create a defect', 'how to report a bug', 'report issue']):
            nav_action = SYSTEM_ROUTE_MAP['Report Issue']
        elif any(w in msg_lower for w in ['developer intelligence', 'developer workload', 'load balancer', 'who is overloaded']):
            nav_action = SYSTEM_ROUTE_MAP['Developer Intelligence']
        elif any(w in msg_lower for w in ['analytics', 'where can i see analytics', 'view analytics']):
            nav_action = SYSTEM_ROUTE_MAP['Analytics']
        elif any(w in msg_lower for w in ['projects', 'where can i manage projects', 'view projects']):
            nav_action = SYSTEM_ROUTE_MAP['Projects']
        elif any(w in msg_lower for w in ['sprints', 'where can i manage sprints', 'view sprints']):
            nav_action = SYSTEM_ROUTE_MAP['Sprints']
        elif any(w in msg_lower for w in ['knowledge base', 'resolution history', 'search resolutions']):
            nav_action = SYSTEM_ROUTE_MAP['Knowledge Base']

        # 2. Key/ID Lookup Intent (e.g. DEF-102, BUG-001)
        issue_key_match = re.search(r'([a-zA-Z]+-\d+)', msg_clean)
        if issue_key_match:
            key_query = issue_key_match.group(1).upper()
            issue = Issue.query.filter(Issue.issue_key.ilike(key_query)).first()
            if issue:
                # RBAC Check
                if current_user.role == 'Reporter' and issue.reporter_id != current_user.id:
                    retrieved_data['issue_lookup'] = "Access Denied: You can only view details of defects reported by yourself."
                else:
                    retrieved_data['issue_lookup'] = issue.to_dict()
                    rag_references.append({
                        'issue_key': issue.issue_key,
                        'title': issue.title,
                        'status': issue.status,
                        'severity': issue.severity
                    })

        # 3. Workload / Developer Intelligence Query
        if 'who is overloaded' in msg_lower or 'overloaded developers' in msg_lower:
            from app.services.assignment_agent_service import AssignmentAgentService
            devs = User.query.filter(User.role.in_(['Developer', 'DEVELOPER', 'Admin', 'Project Manager'])).filter_by(is_active=True).all()
            overloaded = []
            for d in devs:
                active_cnt = Issue.query.filter_by(assignee_id=d.id).filter(Issue.status.in_(['Assigned', 'In Progress', 'In Review', 'Reopened'])).count()
                high_crit_cnt = Issue.query.filter_by(assignee_id=d.id).filter(Issue.status.in_(['Assigned', 'In Progress', 'In Review', 'Reopened']), Issue.severity.in_(['High', 'Critical'])).count()
                st = AssignmentAgentService.get_workload_status(active_cnt, high_crit_cnt)
                if st == 'OVERLOADED' or active_cnt >= 5:
                    overloaded.append({'developer': d.full_name, 'active_workload': active_cnt, 'high_critical': high_crit_cnt})
            retrieved_data['overloaded_developers'] = overloaded

        elif 'lowest workload' in msg_lower or 'least busy' in msg_lower or 'highest availability' in msg_lower:
            devs = User.query.filter(User.role.in_(['Developer', 'DEVELOPER'])).all()
            workload_summary = []
            for d in devs:
                cnt = Issue.query.filter_by(assignee_id=d.id).filter(Issue.status.in_(['Assigned', 'In Progress', 'In Review', 'Reopened'])).count()
                workload_summary.append({'developer': d.full_name, 'active_workload': cnt})
            workload_summary.sort(key=lambda x: x['active_workload'])
            retrieved_data['developer_workload'] = workload_summary

        elif 'highest number of assigned' in msg_lower or 'highest workload' in msg_lower or 'most assigned' in msg_lower:
            devs = User.query.filter(User.role.in_(['Developer', 'DEVELOPER'])).all()
            workload_summary = []
            for d in devs:
                cnt = Issue.query.filter_by(assignee_id=d.id).filter(Issue.status.in_(['Assigned', 'In Progress', 'In Review', 'Reopened'])).count()
                workload_summary.append({'developer': d.full_name, 'active_workload': cnt})
            workload_summary.sort(key=lambda x: x['active_workload'], reverse=True)
            retrieved_data['developer_workload'] = workload_summary

        elif 'assigned to me' in msg_lower or 'my defects' in msg_lower or 'my bugs' in msg_lower:
            my_issues = Issue.query.filter_by(assignee_id=current_user.id).filter(Issue.status.in_(['Assigned', 'In Progress', 'In Review', 'Reopened'])).all()
            retrieved_data['user_assigned_defects'] = [i.to_dict() for i in my_issues]

        # 4. Severity & Defect Count Query
        if 'high severity' in msg_lower or 'critical defects' in msg_lower or 'critical bugs' in msg_lower:
            high_sev_query = Issue.query.filter(Issue.severity.in_(['High', 'Critical'])).filter(Issue.status.notin_(['Closed', 'Verified']))
            if current_user.role == 'Reporter':
                high_sev_query = high_sev_query.filter_by(reporter_id=current_user.id)
            high_sev_issues = high_sev_query.limit(10).all()
            retrieved_data['high_severity_defects'] = [i.to_dict() for i in high_sev_issues]

        elif 'how many open' in msg_lower or 'total open defects' in msg_lower or 'open defect count' in msg_lower:
            open_count = Issue.query.filter(Issue.status.in_(['Reported', 'Assigned', 'In Progress', 'In Review', 'Reopened'])).count()
            retrieved_data['open_defects_count'] = open_count

        # 5. Role Permission Query
        for role_name in ROLE_CAPABILITIES:
            if f"what can a {role_name.lower()}" in msg_lower or f"what can an {role_name.lower()}" in msg_lower or f"{role_name.lower()} do" in msg_lower:
                retrieved_data['role_info'] = ROLE_CAPABILITIES[role_name]

        # 6. Knowledge / Resolution Query
        if any(w in msg_lower for w in ['similar payment', 'previous resolution', 'investigate for', 'root cause', 'how to fix']):
            kb_res = KnowledgeBaseService.search_knowledge_base(msg_clean, top_k=3)
            retrieved_data['knowledge_base'] = kb_res['results']
            for item in kb_res['results']:
                rag_references.append({
                    'issue_key': item['issue_key'],
                    'title': item['title'],
                    'root_cause': item['root_cause'],
                    'suggested_fix': item['suggested_fix']
                })

        # 7. Gemini Generation with Grounded Context
        client = get_gemini_client()
        if not client:
            return ChatbotService._fallback_chat_response(msg_clean, current_user, retrieved_data, nav_action, rag_references)

        prompt = f"""
You are BugFlow AI Assistant, an intelligent, polite, and technical AI assistant inside the BugFlow AI Bug Lifecycle Management System.

User Context:
- Name: {current_user.full_name}
- Role: {current_user.role}
- Department: {current_user.department or 'Engineering'}

User Question: "{msg_clean}"

Retrieved Database & System Information:
{json.dumps(retrieved_data, indent=2)}

Available Navigation Actions:
{json.dumps(SYSTEM_ROUTE_MAP, indent=2)}

Instructions:
1. Answer the user's question directly using the retrieved database data.
2. Respect user role permissions. (e.g. A Reporter cannot view administrative data).
3. If navigation guidance is appropriate, mention where the page is located in the application.
4. Keep the response concise, helpful, and formatted in clean markdown.

Return strictly a JSON object:
{{
  "answer": "Clear markdown answer text for the user",
  "suggested_questions": [
    "Follow-up question option 1?",
    "Follow-up question option 2?"
  ]
}}
"""
        try:
            from google.genai import types
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            res = clean_json_response(response.text)
            if res.get('answer'):
                return {
                    'answer': res['answer'],
                    'suggested_questions': res.get('suggested_questions', ["Show open defects", "Where can I view analytics?"]),
                    'nav_action': nav_action,
                    'rag_references': rag_references
                }
        except Exception as e:
            print(f"Gemini chatbot error: {e}")

        return ChatbotService._fallback_chat_response(msg_clean, current_user, retrieved_data, nav_action, rag_references)

    @staticmethod
    def _fallback_chat_response(user_message, current_user, retrieved_data, nav_action, rag_references):
        ans_parts = []

        if 'issue_lookup' in retrieved_data:
            lookup = retrieved_data['issue_lookup']
            if isinstance(lookup, str):
                ans_parts.append(lookup)
            else:
                ans_parts.append(f"**Defect Details ({lookup['issue_key']})**:\n- **Title**: {lookup['title']}\n- **Status**: `{lookup['status']}`\n- **Severity**: `{lookup['severity']}`\n- **Category**: {lookup['category']}\n- **Assignee**: {lookup['assignee']['full_name'] if lookup['assignee'] else 'Unassigned'}")

        elif 'overloaded_developers' in retrieved_data:
            overloaded = retrieved_data['overloaded_developers']
            if overloaded:
                ans_parts.append(f"**Overloaded Developers Report**:\nFound **{len(overloaded)} overloaded developer(s)** exceeding recommended workload capacity limits:\n\n" + "\n".join([f"- **{o['developer']}**: {o['active_workload']} active defects ({o['high_critical']} High/Critical)" for o in overloaded]))
            else:
                ans_parts.append("Good news! All developers are currently operating within healthy workload capacity limits (0 overloaded developers).")

        elif 'developer_workload' in retrieved_data:
            workload = retrieved_data['developer_workload']
            if workload:
                top_dev = workload[0]
                ans_parts.append(f"**Developer Workload Summary**:\n**{top_dev['developer']}** currently has the highest workload with **{top_dev['active_defects']}** active assigned defects.\n\n" + "\n".join([f"- {w['developer']}: {w['active_defects']} defects" for w in workload]))
            else:
                ans_parts.append("No active assigned defects found across developers.")

        elif 'user_assigned_defects' in retrieved_data:
            my_defects = retrieved_data['user_assigned_defects']
            if my_defects:
                ans_parts.append(f"You currently have **{len(my_defects)} active defects** assigned to you:\n" + "\n".join([f"- **{d['issue_key']}**: {d['title']} (`{d['status']}`)" for d in my_defects]))
            else:
                ans_parts.append("You currently have no open active defects assigned to your queue.")

        elif 'high_severity_defects' in retrieved_data:
            high_sev = retrieved_data['high_severity_defects']
            ans_parts.append(f"Found **{len(high_sev)} open High/Critical severity defects**:\n" + "\n".join([f"- **{d['issue_key']}** ({d['severity']}): {d['title']} (`{d['status']}`)" for d in high_sev]))

        elif 'open_defects_count' in retrieved_data:
            ans_parts.append(f"There are currently **{retrieved_data['open_defects_count']} open defects** in the active backlog.")

        elif 'role_info' in retrieved_data:
            ans_parts.append(retrieved_data['role_info'])

        elif 'knowledge_base' in retrieved_data and retrieved_data['knowledge_base']:
            kb_items = retrieved_data['knowledge_base']
            ans_parts.append("**Knowledge Base Results**:\n" + "\n".join([f"- **{k['issue_key']}**: {k['title']}\n  - *Root Cause*: {k['root_cause']}\n  - *Fix*: {k['suggested_fix']}" for k in kb_items]))

        else:
            ans_parts.append(f"Hello {current_user.full_name}! I am the BugFlow AI Assistant. I can help you query defects, check developer workloads, search historical resolutions, explain user role permissions, and navigate the application.")

        if nav_action:
            ans_parts.append(f"\n\nYou can access this page directly below:")

        return {
            'answer': "\n\n".join(ans_parts),
            'suggested_questions': [
                "Show open defects count",
                "Which developer has highest workload?",
                "Where can I see analytics?",
                "What can a Tester do?"
            ],
            'nav_action': nav_action,
            'rag_references': rag_references
        }
