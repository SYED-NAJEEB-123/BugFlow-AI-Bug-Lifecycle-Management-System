import json
from app.extensions import db
from app.models.issue import Issue, DefectResolutionKnowledge
from app.services.embedding_service import EmbeddingService
from app.services.ai_service import get_gemini_client, clean_json_response

class RAGService:
    @staticmethod
    def retrieve_rag_context(query_text, candidate_issues, exclude_issue_id=None, top_k=5, threshold=15):
        """
        RAG Retrieval Phase:
        1. Query embedding & cosine vector search over candidate defects.
        2. Filter by similarity score threshold (min 15%).
        3. Extract historical root causes, previous resolutions, and comments from matched issues.
        """
        if not query_text or not candidate_issues:
            return {
                'retrieved_defects': [],
                'historical_resolutions': [],
                'has_sufficient_evidence': False,
                'evidence_summary': 'Insufficient historical information available for a reliable recommendation.'
            }

        ranked = EmbeddingService.rank_similar_defects(query_text, candidate_issues, exclude_issue_id=exclude_issue_id, top_k=top_k*2)
        filtered = [r for r in ranked if r['similarity_score'] >= threshold]

        if not filtered:
            return {
                'retrieved_defects': [],
                'historical_resolutions': [],
                'has_sufficient_evidence': False,
                'evidence_summary': 'Insufficient historical information available for a reliable recommendation.'
            }

        historical_resolutions = []
        for item in filtered:
            # Query DefectResolutionKnowledge for extra root cause / resolution logs
            know = DefectResolutionKnowledge.query.filter_by(issue_id=item['id']).first()
            root_cause = item.get('root_cause') or (know.root_cause if know else 'N/A')
            suggested_fix = item.get('suggested_fix') or (know.resolution_summary if know else 'N/A')

            if item['status'] in ['Resolved', 'Verified', 'Closed'] or root_cause != 'N/A' or suggested_fix != 'N/A':
                historical_resolutions.append({
                    'issue_id': item['id'],
                    'issue_key': item['issue_key'],
                    'title': item['title'],
                    'category': item.get('category', 'General'),
                    'severity': item.get('severity', 'Medium'),
                    'root_cause': root_cause,
                    'suggested_fix': suggested_fix,
                    'similarity_score': item['similarity_score'],
                    'similarity_level': item['similarity_level']
                })

        has_evidence = len(historical_resolutions) > 0 or len(filtered) > 0
        summary_msg = f"Retrieved {len(filtered[:top_k])} relevant historical defects ({len(historical_resolutions[:top_k])} resolved with root cause evidence)." if has_evidence else "Insufficient historical information available for a reliable recommendation."

        return {
            'retrieved_defects': filtered[:top_k],
            'historical_resolutions': historical_resolutions[:top_k],
            'has_sufficient_evidence': has_evidence,
            'evidence_summary': summary_msg
        }

    @staticmethod
    def generate_rag_resolution(defect_data, rag_context):
        """
        RAG Generation Phase:
        Passes retrieved historical context into Gemini LLM prompt to generate grounded resolution assistance.
        """
        client = get_gemini_client()
        has_evidence = bool(rag_context and rag_context.get('has_sufficient_evidence'))
        evidence_summary = rag_context.get('evidence_summary', 'No historical matches retrieved.') if rag_context else 'No historical matches retrieved.'
        retrieved_defects = rag_context.get('retrieved_defects', []) if rag_context else []
        retrieved_resolutions = rag_context.get('historical_resolutions', []) if rag_context else []

        if not client:
            return RAGService._fallback_rag_resolution(defect_data, rag_context)

        prompt = f"""
You are a Principal Software Architect aiding a Developer in investigating and resolving a software defect in BugFlow AI.

Current Defect Details:
- Key: {defect_data.get('issue_key', 'N/A')}
- Title: "{defect_data.get('title', '')}"
- Description: "{defect_data.get('description', '')}"
- Category: {defect_data.get('category', 'General')}
- Module: {defect_data.get('module', 'General')}
- Severity: {defect_data.get('severity', 'Medium')}
- Environment: {defect_data.get('environment', 'Development')}

Grounded RAG Historical Context (Retrieved Database Evidence):
- Has Evidence: {has_evidence}
- Evidence Summary: {evidence_summary}
- Retrieved Similar Resolved Defects: {json.dumps(retrieved_resolutions)}
- Retrieved Relevant Defects: {json.dumps([{ 'key': d['issue_key'], 'title': d['title'], 'similarity': d['similarity_score'] } for d in retrieved_defects])}

Strict Rules & Instructions:
1. Base recommendations strictly on the provided defect details and retrieved historical database evidence.
2. Clearly reference related historical defect keys (e.g., DEF-102) when applicable.
3. If evidence is insufficient, state "Insufficient historical information available for a reliable recommendation" in the notes.
4. Use transparent phrasing like "Possible Resolution", "Suggested Area for Investigation", and "Potential Cause".
5. Do NOT claim certainty and do NOT claim that the AI automatically fixed the bug.

Return strictly a JSON object matching this structure:
{{
  "related_historical_defects": [
    "DEF-102: Brief title of related historical defect"
  ],
  "previous_resolutions": [
    "Resolution summary from past resolved defect DEF-102"
  ],
  "possible_root_cause_areas": [
    "Potential Cause: Primary technical hypothesis based on available details"
  ],
  "recommended_investigation_steps": [
    "1. Suggested Area for Investigation: Specific file, route, or table to inspect",
    "2. Suggested Area for Investigation: Specific log entry or trace to verify"
  ],
  "suggested_resolution": "Possible Resolution: Step-by-step code resolution approach.",
  "confidence_relevance": "High Historical Evidence / Moderate Evidence / Insufficient Evidence",
  "evidence_summary": "{evidence_summary}",
  "important_note": "Developer review is required. Our AI provides intelligent assistance to help developers analyze defects and identify possible resolution approaches."
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
            if result.get('suggested_resolution'):
                result['retrieved_defects'] = retrieved_defects
                result['grounded'] = True
                return result
        except Exception as e:
            print(f"Gemini generate_rag_resolution error: {e}")

        return RAGService._fallback_rag_resolution(defect_data, rag_context)

    @staticmethod
    def _fallback_rag_resolution(defect_data, rag_context):
        has_evidence = bool(rag_context and rag_context.get('has_sufficient_evidence'))
        evidence_summary = rag_context.get('evidence_summary', 'No historical matches retrieved.') if rag_context else 'No historical matches retrieved.'
        retrieved_defects = rag_context.get('retrieved_defects', []) if rag_context else []
        retrieved_resolutions = rag_context.get('historical_resolutions', []) if rag_context else []

        related_keys = [f"{r['issue_key']}: {r['title']} ({r['similarity_score']}% match)" for r in retrieved_defects]
        prev_fixes = [r['suggested_fix'] for r in retrieved_resolutions if r.get('suggested_fix') and r['suggested_fix'] != 'N/A']

        return {
            "related_historical_defects": related_keys if related_keys else ["No direct historical matches found in database."],
            "previous_resolutions": prev_fixes if prev_fixes else ["No previous resolution logs available for this component."],
            "possible_root_cause_areas": [
                f"Potential Cause: Unhandled exception or state mismatch in {defect_data.get('category', 'General')} module."
            ],
            "recommended_investigation_steps": [
                f"1. Suggested Area for Investigation: Inspect controller handling {defect_data.get('category', 'General')} logic",
                "2. Suggested Area for Investigation: Verify API payload structure and authentication headers"
            ],
            "suggested_resolution": f"Possible Resolution: Review recent changes in {defect_data.get('module', 'General')}, validate input payloads, and add try-catch error boundaries.",
            "confidence_relevance": "Moderate Evidence" if has_evidence else "Insufficient Evidence",
            "evidence_summary": evidence_summary,
            "important_note": "Developer review is required. Our AI provides intelligent assistance to help developers analyze defects.",
            "retrieved_defects": retrieved_defects,
            "grounded": has_evidence
        }
