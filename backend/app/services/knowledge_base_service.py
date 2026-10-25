from app.extensions import db
from app.models.issue import Issue, DefectResolutionKnowledge, IssueComment
from app.services.embedding_service import EmbeddingService

class KnowledgeBaseService:
    @staticmethod
    def search_knowledge_base(query, category=None, project_id=None, top_k=10):
        """
        Search developer knowledge base derived from actual resolved defects,
        root cause logs, resolution summaries, and developer comments.
        """
        if not query or not query.strip():
            return {
                'count': 0,
                'results': [],
                'categories_found': []
            }

        candidate_query = Issue.query.filter(
            Issue.status.in_(['Resolved', 'Verified', 'Closed']) |
            Issue.root_cause.isnot(None) |
            Issue.suggested_fix.isnot(None)
        )

        if project_id:
            candidate_query = candidate_query.filter_by(project_id=project_id)
        if category and category.strip() and category != 'All':
            candidate_query = candidate_query.filter_by(category=category.strip())

        candidate_issues = candidate_query.all()
        if not candidate_issues:
            # Fallback to all candidate issues if no resolved filter matched
            candidate_issues = Issue.query.all()

        ranked = EmbeddingService.rank_similar_defects(query.strip(), candidate_issues, top_k=top_k)

        results = []
        categories_found = set()

        for item in ranked:
            categories_found.add(item.get('category', 'General'))
            know = DefectResolutionKnowledge.query.filter_by(issue_id=item['id']).first()
            comments = IssueComment.query.filter_by(issue_id=item['id']).order_by(IssueComment.created_at.desc()).all()

            results.append({
                'id': item['id'],
                'issue_key': item['issue_key'],
                'title': item['title'],
                'description': item['description'],
                'category': item.get('category', 'General'),
                'module': item.get('module', 'General'),
                'severity': item.get('severity', 'Medium'),
                'status': item.get('status', 'Resolved'),
                'root_cause': item.get('root_cause') or (know.root_cause if know else 'N/A'),
                'suggested_fix': item.get('suggested_fix') or (know.resolution_summary if know else 'N/A'),
                'similarity_score': item['similarity_score'],
                'similarity_level': item['similarity_level'],
                'developer_comments': [c.to_dict() for c in comments[:3]],
                'updated_at': item.get('updated_at')
            })

        return {
            'count': len(results),
            'results': results,
            'categories_found': sorted(list(categories_found))
        }
