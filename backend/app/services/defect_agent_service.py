import json
from app.extensions import db
from app.models.user import User, ActivityLog, AgentDecision
from app.models.project import Project
from app.models.issue import Issue
from app.routes.issues import generate_issue_key
from app.services.ai_service import AIService
from app.services.embedding_service import EmbeddingService
from app.services.assignment_agent_service import AssignmentAgentService

class DefectAgentService:
    @staticmethod
    def process_screenshot_intake(file, reporter_user, project_id=None, auto_create=True, auto_assign=True, duplicate_threshold=40):
        """
        Full Autonomous Screenshot Intake & Auto-Assignment Workflow:
        1. AI Vision Analysis
        2. Defect Information Extraction
        3. Semantic Duplicate Check
        4. Automatic Defect Creation
        5. Developer Skill & Workload Scoring
        6. Developer Selection & Assignment
        7. Audit Log in AgentDecision & ActivityLog
        """
        # 1. AI Vision Analysis
        vision_analysis = AIService.analyze_screenshot_vision(file)

        # 2. Defect Information Extraction
        extracted_title = vision_analysis.get('title', 'UI Issue Detected in Screenshot')
        extracted_desc = vision_analysis.get('description', 'Defect automatically reported via AI Vision Screenshot Intake.')
        category = vision_analysis.get('category', 'UI/UX')
        severity = vision_analysis.get('severity', 'Medium')
        priority = vision_analysis.get('priority', 'Medium')
        expected_behavior = vision_analysis.get('expected_behavior', '')
        actual_behavior = vision_analysis.get('actual_behavior', vision_analysis.get('error_message', ''))
        steps = vision_analysis.get('steps_to_reproduce', '1. View uploaded screenshot attachment.')
        module = vision_analysis.get('module', 'General')

        defect_payload = {
            'title': extracted_title,
            'description': extracted_desc,
            'category': category,
            'severity': severity,
            'priority': priority,
            'expected_behavior': expected_behavior,
            'actual_behavior': actual_behavior,
            'steps_to_reproduce': steps,
            'module': module
        }

        # Determine target project
        if not project_id:
            proj = Project.query.filter_by(status='Active').first()
            if not proj:
                proj = Project.query.first()
            project_id = proj.id if proj else 1

        project = db.session.get(Project, project_id)

        # 3. Semantic Duplicate Check
        candidate_query = Issue.query.filter_by(project_id=project_id).all() if project else Issue.query.all()
        duplicates = EmbeddingService.check_duplicates(defect_payload, candidate_query, threshold=duplicate_threshold)

        highest_dup_score = duplicates[0]['similarity_score'] if duplicates else 0
        is_duplicate_suspected = len(duplicates) > 0 and highest_dup_score >= duplicate_threshold

        # 4. Create Defect if auto_create is True and no high-confidence duplicate blocks it
        created_issue = None
        if auto_create and not (is_duplicate_suspected and highest_dup_score >= 85):
            issue_key = generate_issue_key(project) if project else "BUG-001"
            created_issue = Issue(
                issue_key=issue_key,
                project_id=project_id,
                title=extracted_title,
                description=extracted_desc,
                expected_behavior=expected_behavior,
                actual_behavior=actual_behavior,
                steps_to_reproduce=steps,
                category=category,
                module=module,
                defect_type='UI Bug' if category == 'UI/UX' else 'Functional Defect',
                severity=severity,
                priority=priority,
                status='Reported',
                reporter_id=reporter_user.id,
                ai_enhanced=True,
                vision_analyzed=True
            )
            db.session.add(created_issue)
            db.session.commit()

            EmbeddingService.sync_defect_embedding(created_issue)

        # 5. Developer Skill & Workload Scoring
        assignment_res = AssignmentAgentService.select_best_developer(defect_payload, project_id)
        best_dev = assignment_res['best_candidate']

        assigned_dev_id = None
        assignment_reasoning = ""
        assignment_score = 0

        if best_dev and best_dev['score'] >= 40:
            assigned_dev_id = best_dev['developer_id']
            assignment_score = best_dev['score']
            assignment_reasoning = "; ".join(best_dev['reasoning'])

            if auto_assign and created_issue:
                created_issue.assignee_id = assigned_dev_id
                created_issue.status = 'Assigned'
                db.session.commit()

        # 6. Audit Logging (AgentDecision & ActivityLog)
        agent_decision = AgentDecision(
            issue_id=created_issue.id if created_issue else None,
            action_type='AUTO_INTAKE_SCREENSHOT',
            confidence_score=85 if created_issue else 50,
            extracted_info_json=json.dumps(defect_payload),
            duplicate_check_json=json.dumps({
                'is_duplicate_suspected': is_duplicate_suspected,
                'highest_score': highest_dup_score,
                'duplicate_candidates': duplicates[:3]
            }),
            selected_developer_id=assigned_dev_id,
            assignment_score=assignment_score,
            reasoning=assignment_reasoning or "Assigned based on skill profile and workload balance.",
            is_override=False
        )
        db.session.add(agent_decision)

        activity = ActivityLog(
            user_id=reporter_user.id,
            action='AI_AGENT_INTAKE',
            entity_type='Issue',
            entity_id=created_issue.id if created_issue else None,
            details=f"AI Agent analyzed screenshot and created defect {created_issue.issue_key if created_issue else 'Pending'} assigned to {best_dev['developer']['full_name'] if best_dev else 'Unassigned'}"
        )
        db.session.add(activity)
        db.session.commit()

        defect_dict = created_issue.to_dict() if created_issue else defect_payload
        if created_issue:
            defect_dict['defect_key'] = created_issue.issue_key

        assignment_dict = {
            'assigned_to': best_dev['developer']['full_name'] if best_dev else 'Unassigned',
            'developer_id': assigned_dev_id,
            'match_score': assignment_score,
            'reasoning': assignment_reasoning,
            'score_breakdown': {
                'skill_score': best_dev['breakdown']['skill_match'] if best_dev else 0,
                'category_score': best_dev['breakdown']['category_match'] if best_dev else 0,
                'history_score': best_dev['breakdown']['historical_experience'] if best_dev else 0,
                'workload_score': best_dev['breakdown']['workload_balance'] if best_dev else 0,
            } if best_dev else {}
        }

        dup_check_dict = {
            'is_duplicate': is_duplicate_suspected,
            'is_duplicate_suspected': is_duplicate_suspected,
            'max_similarity': highest_dup_score / 100.0 if highest_dup_score > 1 else highest_dup_score,
            'highest_score': highest_dup_score,
            'similar_defects': duplicates[:3],
            'duplicate_candidates': duplicates[:3]
        }

        return {
            'success': True,
            'defect': defect_dict,
            'created_issue': created_issue.to_dict() if created_issue else None,
            'assignment': assignment_dict,
            'assignment_decision': {
                'selected_developer': best_dev['developer'] if best_dev else None,
                'assignment_score': assignment_score,
                'reasoning': best_dev['reasoning'] if best_dev else [],
                'score_breakdown': best_dev['breakdown'] if best_dev else {},
                'rankings': assignment_res['rankings']
            },
            'duplicate_check': dup_check_dict,
            'vision_analysis': vision_analysis,
            'extracted_info': defect_payload,
            'agent_decision_id': agent_decision.id
        }
