import json
from app.extensions import db
from app.models.issue import Issue
from app.models.sprint import Sprint
from app.models.user import User
from app.services.embedding_service import EmbeddingService
from app.services.ai_service import get_gemini_client, clean_json_response

class ImpactAnalysisService:
    @staticmethod
    def analyze_defect_impact(defect_data_or_issue_id):
        issue = None
        if isinstance(defect_data_or_issue_id, int):
            issue = db.session.get(Issue, defect_data_or_issue_id)
            defect_data = issue.to_dict() if issue else {}
        elif isinstance(defect_data_or_issue_id, dict):
            defect_data = defect_data_or_issue_id
            if defect_data.get('id'):
                issue = db.session.get(Issue, defect_data.get('id'))
        else:
            defect_data = {}

        title = defect_data.get('title', 'Unspecified Defect')
        description = defect_data.get('description', '')
        category = defect_data.get('category', 'General')
        module = defect_data.get('module', 'General')
        severity = defect_data.get('severity', 'Medium')
        priority = defect_data.get('priority', 'Medium')

        # 1. Database Facts
        db_facts = []
        if issue and issue.issue_key:
            db_facts.append(f"Defect Key: {issue.issue_key} (ID: {issue.id})")
        db_facts.append(f"Category: {category} | Module: {module}")
        db_facts.append(f"Reported Severity: {severity} | Priority: {priority}")

        if issue and issue.assignee:
            db_facts.append(f"Assigned Developer: {issue.assignee.full_name} ({issue.assignee.role})")
        else:
            db_facts.append("Assigned Developer: Currently Unassigned")

        sprint_name = "No Active Sprint"
        if issue and issue.sprint:
            sprint_name = f"{issue.sprint.name} ({issue.sprint.status})"
            db_facts.append(f"Associated Sprint: {sprint_name}")

        candidate_issues = Issue.query.all()
        query_text = f"{title} {description} {category}"
        similar = EmbeddingService.rank_similar_defects(query_text, candidate_issues, exclude_issue_id=issue.id if issue else None, top_k=3)
        
        db_facts.append(f"Retrieved Historical Similar Defects in DB: {len(similar)}")

        # 2. Calculated Metrics
        open_module_defects = Issue.query.filter_by(category=category).filter(
            Issue.status.in_(['Reported', 'Assigned', 'In Progress', 'In Review'])
        ).count()

        severity_points = {'Low': 10, 'Medium': 25, 'High': 45, 'Critical': 65}.get(severity, 25)
        priority_points = {'Low': 5, 'Medium': 15, 'High': 25, 'Critical': 35, 'Urgent': 35}.get(priority, 15)
        module_load_points = min(open_module_defects * 5, 20)

        risk_score = min(max(severity_points + priority_points + module_load_points, 10), 99)

        if risk_score >= 75 or severity == 'Critical':
            risk_level = 'CRITICAL'
        elif risk_score >= 55 or severity == 'High':
            risk_level = 'HIGH'
        elif risk_score >= 35:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'

        calculated_metrics = {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'open_defects_in_category': open_module_defects,
            'severity_weight': severity_points,
            'priority_weight': priority_points,
            'similar_defects_count': len(similar)
        }

        # 3. AI Inferences
        ai_inferences = ImpactAnalysisService._generate_ai_inferences(
            title=title,
            description=description,
            category=category,
            module=module,
            severity=severity,
            risk_score=risk_score,
            risk_level=risk_level,
            sprint_name=sprint_name,
            similar=similar
        )

        return {
            'title': title,
            'database_facts': db_facts,
            'calculated_metrics': calculated_metrics,
            'ai_inferences': ai_inferences,
            'retrieved_similar_defects': similar
        }

    @staticmethod
    def _generate_ai_inferences(title, description, category, module, severity, risk_score, risk_level, sprint_name, similar):
        client = get_gemini_client()
        if not client:
            return ImpactAnalysisService._fallback_inferences(title, category, module, severity, risk_level, sprint_name, similar)

        prompt = f"""
You are a Principal Software Reliability Engineer and Enterprise QA Architect.
Analyze the potential system and business impact of the following software defect:

Title: "{title}"
Description: "{description}"
Category: {category}
Module: {module}
Severity: {severity}
Calculated Risk Score: {risk_score}/100 ({risk_level})
Sprint Context: {sprint_name}
Historical Similar Defects Count: {len(similar)}

Return strictly a valid JSON object:
{{
  "why_risky": "Explanation of technical risks and potential system failures caused by this defect",
  "potentially_affected_components": [
    "{category} API Service",
    "{module} Component State",
    "Database Transaction Pool"
  ],
  "sprint_impact": "Impact on sprint velocity, release milestones, or team capacity",
  "recommended_action": "Immediate technical action recommended for engineering lead"
}}
"""
        try:
            from google.genai import types
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            result = clean_json_response(response.text)
            if result.get('why_risky'):
                return result
        except Exception as e:
            print(f"Gemini Impact Analysis inference error: {e}")

        return ImpactAnalysisService._fallback_inferences(title, category, module, severity, risk_level, sprint_name, similar)

    @staticmethod
    def _fallback_inferences(title, category, module, severity, risk_level, sprint_name, similar):
        return {
            "why_risky": f"Defect in '{category}' module with {severity} severity has potential to cause unhandled runtime exceptions or workflow disruption.",
            "potentially_affected_components": [
                f"{category} Controller and Endpoint",
                f"{module} UI Component State",
                "Asynchronous Event Dispatcher"
            ],
            "sprint_impact": f"Requires allocation within {sprint_name} to prevent carry-over defect debt.",
            "recommended_action": f"Assign to domain developer for immediate investigation. Conduct regression testing across {category} workflows."
        }
