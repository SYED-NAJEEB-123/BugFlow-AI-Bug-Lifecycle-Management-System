import json
import math
import re

def clean_words(text):
    if not text:
        return []
    text_clean = re.sub(r'[^\w\s]', ' ', text.lower())
    words = [w.strip() for w in text_clean.split() if len(w.strip()) > 1]
    stopwords = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were',
        'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'should', 'could', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'when',
        'where', 'how', 'why', 'what', 'which', 'who', 'user', 'page', 'app'
    }
    return [w for w in words if w not in stopwords]

def generate_defect_text(data):
    """Combine defect metadata fields into single searchable document."""
    parts = []
    if isinstance(data, dict):
        parts.append(data.get('title', ''))
        parts.append(data.get('description', ''))
        parts.append(data.get('steps_to_reproduce', ''))
        parts.append(data.get('expected_behavior', ''))
        parts.append(data.get('actual_behavior', ''))
        parts.append(data.get('category', ''))
        parts.append(data.get('module', ''))
        parts.append(data.get('defect_type', ''))
        parts.append(data.get('error_message', ''))
    else:
        parts.append(getattr(data, 'title', ''))
        parts.append(getattr(data, 'description', ''))
        parts.append(getattr(data, 'steps_to_reproduce', ''))
        parts.append(getattr(data, 'expected_behavior', ''))
        parts.append(getattr(data, 'actual_behavior', ''))
        parts.append(getattr(data, 'category', ''))
        parts.append(getattr(data, 'module', ''))
        parts.append(getattr(data, 'defect_type', ''))
        parts.append(getattr(data, 'suggested_fix', ''))

    return ' '.join([p for p in parts if p]).strip()

def text_to_vector(text, vector_size=300):
    """Generate dense normalized TF-IDF / character n-gram vector representation."""
    words = clean_words(text)
    if not words:
        return [0.0] * vector_size

    freqs = {}
    for w in words:
        freqs[w] = freqs.get(w, 0) + 1

    vec = [0.0] * vector_size
    for word, count in freqs.items():
        bucket = abs(hash(word)) % vector_size
        tf = 1 + math.log(count)
        vec[bucket] += tf

        if len(word) >= 3:
            for i in range(len(word) - 2):
                sub = word[i:i+3]
                sub_bucket = abs(hash(sub)) % vector_size
                vec[sub_bucket] += 0.3 * tf

    magnitude = math.sqrt(sum(v * v for v in vec))
    if magnitude > 0:
        vec = [v / magnitude for v in vec]

    return vec

def cosine_similarity(vec1, vec2):
    """Compute Cosine Similarity score between two vector representations."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    mag1 = math.sqrt(sum(a * a for a in vec1))
    mag2 = math.sqrt(sum(b * b for b in vec2))

    if mag1 == 0 or mag2 == 0:
        return 0.0

    return min(max(dot_product / (mag1 * mag2), 0.0), 1.0)

class EmbeddingService:
    @staticmethod
    def generate_embedding(text):
        """Generate normalized float embedding vector for given text."""
        from app.services.ai_service import get_gemini_client
        client = get_gemini_client()
        if client:
            try:
                res = client.models.embed_content(
                    model='text-embedding-004',
                    contents=text[:2000]
                )
                if res and hasattr(res, 'embedding') and hasattr(res.embedding, 'values'):
                    vals = res.embedding.values
                    norm = math.sqrt(sum(x * x for x in vals))
                    return [x / norm for x in vals] if norm > 0 else vals
            except Exception as e:
                print(f"Gemini embed_content fallback: {e}")

        return text_to_vector(text)

    @staticmethod
    def rank_similar_defects(query_text, candidate_issues, exclude_issue_id=None):
        """Rank candidate issues by semantic vector similarity to query_text."""
        if not query_text or not candidate_issues:
            return []

        query_vec = EmbeddingService.generate_embedding(query_text)
        results = []

        for issue in candidate_issues:
            if exclude_issue_id and issue.id == exclude_issue_id:
                continue

            target_text = generate_defect_text(issue)
            target_vec = text_to_vector(target_text)

            similarity = cosine_similarity(query_vec, target_vec)
            score_pct = int(round(similarity * 100))

            if score_pct > 0:
                if score_pct >= 90:
                    level = "Very Likely Duplicate"
                elif score_pct >= 75:
                    level = "Highly Similar"
                elif score_pct >= 60:
                    level = "Related Defect"
                else:
                    level = "Low Relevance"

                issue_dict = issue.to_dict()
                issue_dict['similarity_score'] = score_pct
                issue_dict['similarity_level'] = level
                results.append(issue_dict)

        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return results

    @staticmethod
    def check_duplicates(payload, candidate_issues, threshold=None):
        """Pre-submission duplicate check returning matching candidates above threshold."""
        if threshold is None:
            threshold = payload.get('threshold', 30) if isinstance(payload, dict) else 30
        query_text = generate_defect_text(payload)
        ranked = EmbeddingService.rank_similar_defects(query_text, candidate_issues)
        return [r for r in ranked if r['similarity_score'] >= threshold]
