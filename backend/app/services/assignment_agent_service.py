from app.extensions import db
from app.models.user import User, DeveloperSkill, ActivityLog
from app.models.issue import Issue

class AssignmentAgentService:
    @staticmethod
    def get_workload_status(active_workload, high_critical_count=0):
        if active_workload >= 7 or high_critical_count >= 3:
            return 'OVERLOADED'
        elif active_workload >= 5 or high_critical_count >= 2:
            return 'HIGH'
        elif active_workload >= 3:
            return 'MEDIUM'
        else:
            return 'LOW'

    @staticmethod
    def calculate_developer_score(defect_data, developer, active_workload=None):
        """
        Calculate transparent developer allocation score (0 to 100):
        - Skill Match (35%)
        - Category & Module Preference Match (25%)
        - Historical Experience & Resolved Similar Defects (20%)
        - Workload Availability (20%)
        - High/Critical & In-Progress Overload Penalty
        """
        if active_workload is None:
            active_workload = Issue.query.filter_by(assignee_id=developer.id).filter(
                Issue.status.in_(['Assigned', 'In Progress', 'In Review', 'Reopened'])
            ).count()

        high_crit_count = Issue.query.filter_by(assignee_id=developer.id).filter(
            Issue.status.in_(['Assigned', 'In Progress', 'In Review', 'Reopened']),
            Issue.severity.in_(['High', 'Critical'])
        ).count()

        in_progress_count = Issue.query.filter_by(assignee_id=developer.id, status='In Progress').count()

        dev_skill_rec = DeveloperSkill.query.filter_by(user_id=developer.id).first()

        primary_languages = dev_skill_rec.primary_languages.lower() if dev_skill_rec else (developer.skills or '').lower()
        frameworks = dev_skill_rec.frameworks.lower() if dev_skill_rec else (developer.skills or '').lower()
        preferred_categories = dev_skill_rec.preferred_categories.lower() if dev_skill_rec else (developer.skills or '').lower()
        preferred_modules = dev_skill_rec.preferred_modules.lower() if dev_skill_rec else ''

        category = defect_data.get('category', 'General').lower()
        module = defect_data.get('module', 'General').lower()
        title_desc = (defect_data.get('title', '') + " " + defect_data.get('description', '')).lower()

        # 1. Skill Match (Max 35 points)
        skill_score = 0
        all_skills_str = f"{primary_languages} {frameworks} {developer.skills or ''}".lower()

        if category in all_skills_str or module in all_skills_str:
            skill_score += 20

        matching_keywords = ['react', 'python', 'flask', 'sql', 'auth', 'jwt', 'payment', 'ui', 'api', 'database', 'security', 'node', 'express']
        matched_kw = [kw for kw in matching_keywords if kw in all_skills_str and kw in title_desc]
        skill_score += min(len(matched_kw) * 5, 15)

        # 2. Category & Module Preference Match (Max 25 points)
        cat_mod_score = 0
        if category in preferred_categories:
            cat_mod_score += 15
        if module in preferred_modules:
            cat_mod_score += 10
        if cat_mod_score == 0 and (category in all_skills_str or module in all_skills_str):
            cat_mod_score = 15

        # 3. Historical Experience Match (Max 20 points)
        resolved_count = Issue.query.filter_by(assignee_id=developer.id, category=defect_data.get('category', 'General')).filter(
            Issue.status.in_(['Resolved', 'Verified', 'Closed'])
        ).count()
        hist_score = min(resolved_count * 5, 20)

        # 4. Workload Availability & Penalty (Max 20 points minus overload penalties)
        base_workload = max(20 - (active_workload * 3), 0)
        overload_penalty = (high_crit_count * 3) + (in_progress_count * 2)
        workload_score = max(base_workload - overload_penalty, 0)

        final_score = skill_score + cat_mod_score + hist_score + workload_score
        final_score = min(max(final_score, 10), 99)

        workload_status = AssignmentAgentService.get_workload_status(active_workload, high_crit_count)

        reasons = []
        if matched_kw or category in all_skills_str:
            reasons.append(f"Strong skill match for {category} / {module}")
        if resolved_count > 0:
            reasons.append(f"Previously resolved {resolved_count} {defect_data.get('category', 'General')} defects")
        if workload_status == 'LOW':
            reasons.append(f"Optimal workload availability ({active_workload} active defects)")
        elif workload_status == 'MEDIUM':
            reasons.append(f"Moderate workload ({active_workload} active defects)")
        else:
            reasons.append(f"High workload ({active_workload} active defects, {high_crit_count} high/critical)")

        return {
            'developer_id': developer.id,
            'developer': developer.to_dict(),
            'score': final_score,
            'match_score': final_score,
            'workload_status': workload_status,
            'breakdown': {
                'skill_match': skill_score,
                'category_match': cat_mod_score,
                'historical_experience': hist_score,
                'workload_balance': workload_score,
                'overload_penalty': overload_penalty
            },
            'reasoning': reasons,
            'resolved_category_count': resolved_count,
            'active_workload': active_workload,
            'high_critical_count': high_crit_count,
            'in_progress_count': in_progress_count
        }

    @staticmethod
    def select_best_developer(defect_data, project_id=None):
        """
        Evaluate all active developers and return ranked list of developer recommendations.
        """
        dev_query = User.query.filter(User.role.in_(['Developer', 'DEVELOPER', 'Admin', 'Project Manager']), User.is_active == True)
        developers = dev_query.all()

        if not developers:
            developers = User.query.filter(User.role != 'Reporter', User.is_active == True).all()

        rankings = []
        for dev in developers:
            score_data = AssignmentAgentService.calculate_developer_score(defect_data, dev)
            rankings.append(score_data)

        rankings.sort(key=lambda x: x['score'], reverse=True)

        best_candidate = rankings[0] if rankings else None
        return {
            'best_candidate': best_candidate,
            'recommended_developer': best_candidate['developer'] if best_candidate else None,
            'rankings': rankings
        }

    @staticmethod
    def what_if_assignment(defect_data, target_developer_id, project_id=None):
        """
        Simulate assignment of a defect to target developer and return workload impact,
        post-assignment status, sprint impact, and alternative recommendations.
        """
        target_dev = db.session.get(User, target_developer_id)
        if not target_dev:
            return {'error': 'Target developer not found'}, 404

        current_active = Issue.query.filter_by(assignee_id=target_dev.id).filter(
            Issue.status.in_(['Assigned', 'In Progress', 'In Review', 'Reopened'])
        ).count()

        current_high_crit = Issue.query.filter_by(assignee_id=target_dev.id).filter(
            Issue.status.in_(['Assigned', 'In Progress', 'In Review', 'Reopened']),
            Issue.severity.in_(['High', 'Critical'])
        ).count()

        is_new_high_crit = defect_data.get('severity') in ['High', 'Critical']
        
        post_active = current_active + 1
        post_high_crit = current_high_crit + (1 if is_new_high_crit else 0)

        current_status = AssignmentAgentService.get_workload_status(current_active, current_high_crit)
        post_status = AssignmentAgentService.get_workload_status(post_active, post_high_crit)

        current_load_pct = min(current_active * 15, 100)
        post_load_pct = min(post_active * 15, 100)

        # Evaluate all developers for alternatives
        allocation_res = AssignmentAgentService.select_best_developer(defect_data, project_id)
        rankings = allocation_res['rankings']

        alternatives = [r for r in rankings if r['developer_id'] != target_developer_id]

        recommendation_msg = "HEALTHY"
        if post_status == 'OVERLOADED':
            recommendation_msg = f"WARNING: Assigning to {target_dev.full_name} will cause workload overload ({post_active} active defects). Recommend selecting an alternative developer with lower workload."
        elif post_status == 'HIGH':
            recommendation_msg = f"MODERATE WARN: {target_dev.full_name}'s workload will reach HIGH capacity ({post_active} active defects)."
        else:
            recommendation_msg = f"SAFE: Assigning to {target_dev.full_name} is within healthy capacity limits."

        return {
            'target_developer': target_dev.to_dict(),
            'current_load': {
                'active_defects': current_active,
                'high_critical_defects': current_high_crit,
                'workload_pct': current_load_pct,
                'workload_status': current_status
            },
            'simulated_post_load': {
                'active_defects': post_active,
                'high_critical_defects': post_high_crit,
                'workload_pct': post_load_pct,
                'workload_status': post_status
            },
            'sprint_impact': {
                'capacity_impact': f"+1 Defect added to {target_dev.full_name}'s active queue",
                'risk_flag': post_status in ['HIGH', 'OVERLOADED']
            },
            'recommendation': recommendation_msg,
            'is_overload_risk': post_status == 'OVERLOADED',
            'suggested_alternatives': alternatives[:3]
        }

