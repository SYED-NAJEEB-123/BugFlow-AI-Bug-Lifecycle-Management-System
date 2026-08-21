from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.ai_service import AIService
from app.models.issue import Issue, DefectResolutionKnowledge

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

@ai_bp.route('/enhance-description', methods=['POST'])
@jwt_required()
def enhance_description():
    data = request.get_json() or {}
    raw_desc = data.get('description', '').strip()
    environment = data.get('environment', 'Development')

    if not raw_desc:
        return jsonify({'error': 'Description is required'}), 400

    result = AIService.enhance_description(raw_desc, environment)
    return jsonify({'enhanced': result}), 200

@ai_bp.route('/classify', methods=['POST'])
@jwt_required()
def classify_defect():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()

    if not title and not description:
        return jsonify({'error': 'Title or description is required'}), 400

    result = AIService.classify_defect(title, description)
    return jsonify({'classification': result}), 200

@ai_bp.route('/predict-triage', methods=['POST'])
@jwt_required()
def predict_triage():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()

    result = AIService.classify_defect(title, description)
    return jsonify({
        'severity': result.get('severity', 'Medium'),
        'severity_reason': result.get('severity_reason', ''),
        'priority': result.get('priority', 'Medium'),
        'priority_reason': result.get('priority_reason', '')
    }), 200

@ai_bp.route('/analyze-screenshot', methods=['POST'])
@jwt_required()
def analyze_screenshot():
    if 'file' not in request.files:
        return jsonify({'error': 'No screenshot file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    image_bytes = file.read()
    mime_type = file.content_type or 'image/png'

    result = AIService.analyze_screenshot(image_bytes, mime_type)
    return jsonify({'analysis': result}), 200

@ai_bp.route('/similar-defects', methods=['POST'])
@jwt_required()
def find_similar_defects():
    data = request.get_json() or {}
    project_id = data.get('project_id')
    title = data.get('title', '').strip().lower()
    description = data.get('description', '').strip().lower()

    if not title and not description:
        return jsonify({'similar_defects': []}), 200

    query = Issue.query
    if project_id:
        query = query.filter_by(project_id=project_id)

    all_issues = query.all()
    similar = []

    words = set(re.findall(r'\w+', f"{title} {description}"))

    for i in all_issues:
        target_text = f"{i.title} {i.description} {i.category}".lower()
        target_words = set(re.findall(r'\w+', target_text))
        
        if not words or not target_words:
            continue

        intersection = words.intersection(target_words)
        score = int((len(intersection) / max(len(words), 1)) * 100)

        if score >= 15:
            similar.append({
                'id': i.id,
                'issue_key': i.issue_key,
                'title': i.title,
                'status': i.status,
                'severity': i.severity,
                'similarity_score': min(98, score + 10),
                'root_cause': i.root_cause or 'Under investigation',
                'suggested_fix': i.suggested_fix or 'No fix recorded'
            })

    similar.sort(key=lambda x: x['similarity_score'], reverse=True)
    return jsonify({'similar_defects': similar[:5]}), 200

@ai_bp.route('/resolution-assistance', methods=['POST'])
@jwt_required()
def resolution_assistance():
    data = request.get_json() or {}
    issue_id = data.get('issue_id')

    defect_data = {}
    if issue_id:
        issue = Issue.query.get(issue_id)
        if issue:
            defect_data = issue.to_dict()

    if not defect_data:
        defect_data = data

    # Fetch historical knowledge base entries
    historical = DefectResolutionKnowledge.query.order_by(DefectResolutionKnowledge.resolved_at.desc()).limit(5).all()
    historical_fixes = [h.to_dict() for h in historical]

    result = AIService.generate_resolution_assistance(defect_data, historical_fixes)
    result['historical_fixes'] = historical_fixes
    return jsonify({'assistance': result}), 200
