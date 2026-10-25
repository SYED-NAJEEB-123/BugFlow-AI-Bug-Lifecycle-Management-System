import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.issue import Issue
from app.services.ai_service import AIService
from app.services.embedding_service import EmbeddingService

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

@ai_bp.route('/enhance-description', methods=['POST'])
@jwt_required()
def enhance_description_endpoint():
    """
    AI Defect Description Enhancement
    ---
    tags:
      - AI
    summary: Transform raw bug notes into a structured report (Steps to Reproduce, Expected, Actual)
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - description
          properties:
            description:
              type: string
              example: "Login button doesn't respond when clicking on chrome mobile"
            environment:
              type: string
              example: "Production Chrome Mobile"
    responses:
      200:
        description: Enhanced defect report payload
      400:
        description: Description cannot be empty
      401:
        description: Unauthorized token
    """
    data = request.get_json() or {}
    description = data.get('description', '').strip()
    environment = data.get('environment', 'Development')

    if not description:
        return jsonify({'error': 'Description cannot be empty'}), 400

    enhanced = AIService.enhance_description(description, environment)
    return jsonify({'enhanced': enhanced}), 200

@ai_bp.route('/classify', methods=['POST'])
@jwt_required()
def classify_defect_endpoint():
    """
    AI Defect Auto-Classification
    ---
    tags:
      - AI
    summary: Predict defect category and component module from title and description
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - title
            - description
          properties:
            title:
              type: string
              example: "SQL Injection in Search API"
            description:
              type: string
              example: "Unsanitized input in GET /api/search allows DB query manipulation"
    responses:
      200:
        description: Predicted category and module
      400:
        description: Title and description required
      401:
        description: Unauthorized token
    """
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()

    if not title or not description:
        return jsonify({'error': 'Title and description are required'}), 400

    classification = AIService.classify_defect(title, description)
    return jsonify({'classification': classification}), 200

@ai_bp.route('/predict-triage', methods=['POST'])
@jwt_required()
def predict_triage_endpoint():
    """
    AI Triage Severity & Priority Predictor
    ---
    tags:
      - AI
    summary: Predict severity and priority ratings with confidence scores and technical reasoning
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - title
            - description
          properties:
            title:
              type: string
            description:
              type: string
    responses:
      200:
        description: Predicted severity, priority, confidence score, and reasoning
      400:
        description: Title and description required
      401:
        description: Unauthorized token
    """
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()

    if not title or not description:
        return jsonify({'error': 'Title and description are required'}), 400

    result = AIService.predict_triage_metadata(title, description)
    return jsonify(result), 200

@ai_bp.route('/analyze-screenshot', methods=['POST'])
@jwt_required()
def analyze_screenshot_endpoint():
    """
    Multimodal Vision Screenshot Analysis
    ---
    tags:
      - AI
    summary: Analyze bug screenshot image to extract visual UI errors and text
    security:
      - Bearer: []
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: Bug screenshot image (PNG, JPG)
    responses:
      200:
        description: Extracted visual errors, detected text, and technical description
      400:
        description: No image file uploaded
      401:
        description: Unauthorized token
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No image file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    allowed_extensions = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        return jsonify({'error': f'Unsupported image file type ({ext}). Allowed: PNG, JPG, JPEG, WEBP'}), 400

    try:
        analysis = AIService.analyze_screenshot_vision(file)
        return jsonify({'analysis': analysis}), 200
    except Exception as e:
        print(f"Error analyzing screenshot: {e}")
        return jsonify({'error': f"Failed to analyze screenshot: {str(e)}"}), 500

@ai_bp.route('/similar-defects', methods=['POST'])
@jwt_required()
def similar_defects_endpoint():
    """
    Semantic Duplicate & Similar Defect Retrieval
    ---
    tags:
      - AI
    summary: Vector similarity retrieval of existing similar defects to prevent duplicate filing
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - title
            - description
          properties:
            title:
              type: string
            description:
              type: string
            project_id:
              type: integer
    responses:
      200:
        description: List of ranked similar defects with similarity scores
      400:
        description: Title and description required
      401:
        description: Unauthorized token
    """
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    project_id = data.get('project_id')

    if not title or not description:
        return jsonify({'error': 'Title and description are required'}), 400

    candidate_query = Issue.query
    if project_id:
        candidate_query = candidate_query.filter_by(project_id=project_id)
    candidate_issues = candidate_query.all()

    query_text = f"{title} {description}"
    similar = EmbeddingService.rank_similar_defects(query_text, candidate_issues, top_k=5)

    return jsonify({'similar_defects': similar}), 200

@ai_bp.route('/summarize-defect', methods=['POST'])
@jwt_required()
def summarize_defect_endpoint():
    """
    AI Executive Defect Summarizer
    ---
    tags:
      - AI
    summary: Generate concise executive summary, symptoms, and impact from defect report
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - description
          properties:
            description:
              type: string
            title:
              type: string
    responses:
      200:
        description: Executive short summary, observed symptoms, and business impact
      400:
        description: Description required
      401:
        description: Unauthorized token
    """
    data = request.get_json() or {}
    description = data.get('description', '').strip()
    title = data.get('title', '').strip()

    if not description:
        return jsonify({'error': 'Description is required'}), 400

    summary_res = AIService.summarize_defect(description, title)
    return jsonify({'summary': summary_res}), 200

@ai_bp.route('/resolution-assistance', methods=['POST'])
@jwt_required()
def resolution_assistance_endpoint():
    """
    RAG-Grounded AI Resolution Co-Pilot
    ---
    tags:
      - AI
    summary: RAG vector retrieval & grounded Gemini prompt for root cause analysis and potential fix
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            issue_id:
              type: integer
            title:
              type: string
            description:
              type: string
            steps_to_reproduce:
              type: string
            error_logs:
              type: string
    responses:
      200:
        description: RAG grounded resolution assistance with confidence indicator and historical context
      401:
        description: Unauthorized token
    """
    data = request.get_json() or {}
    issue_id = data.get('issue_id')

    issue = None
    if issue_id:
        issue = db.session.get(Issue, issue_id)

    if not issue and not data.get('title'):
        return jsonify({'error': 'Either issue_id or title/description must be provided'}), 400

    title = issue.title if issue else data.get('title', '')
    description = issue.description if issue else data.get('description', '')
    steps = issue.steps_to_reproduce if issue else data.get('steps_to_reproduce', '')
    error_logs = data.get('error_logs', '')

    project_id = issue.project_id if issue else data.get('project_id')
    candidate_query = Issue.query
    if project_id:
        candidate_query = candidate_query.filter_by(project_id=project_id)
    candidate_issues = candidate_query.all()

    query_text = f"{title} {description} {steps} {error_logs}"
    rag_context = EmbeddingService.retrieve_rag_context(query_text, candidate_issues, top_k=3)

    defect_data = {
        'issue_key': issue.issue_key if issue else 'NEW',
        'title': title,
        'description': description,
        'steps_to_reproduce': steps,
        'category': issue.category if issue else data.get('category', 'General'),
        'module': issue.module if issue else data.get('module', 'General'),
        'severity': issue.severity if issue else data.get('severity', 'Medium'),
        'environment': issue.environment if issue else data.get('environment', 'Development')
    }

    assistance = AIService.generate_resolution_assistance(
        defect_data=defect_data,
        rag_context=rag_context
    )

    return jsonify({
        'assistance': assistance,
        'rag_retrieved_count': len(rag_context)
    }), 200

@ai_bp.route('/rag-resolution', methods=['POST'])
@jwt_required()
def rag_resolution_endpoint():
    """
    Real RAG-Based Historical Resolution Pipeline
    ---
    tags:
      - AI
    summary: Execute full RAG pipeline (Retrieval -> Context -> Grounded Generation) using database defect knowledge
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            issue_id:
              type: integer
            title:
              type: string
            description:
              type: string
            category:
              type: string
            module:
              type: string
            project_id:
              type: integer
    responses:
      200:
        description: Grounded RAG resolution report with related historical defect keys and evidence summaries
      401:
        description: Unauthorized token
    """
    from flask_jwt_extended import get_jwt_identity
    from app.models.user import User
    from app.services.rag_service import RAGService

    user_id = int(get_jwt_identity())
    current_user = db.session.get(User, user_id)
    data = request.get_json() or {}

    issue_id = data.get('issue_id')
    issue = db.session.get(Issue, issue_id) if issue_id else None

    title = issue.title if issue else data.get('title', '')
    description = issue.description if issue else data.get('description', '')

    if not title and not description:
        return jsonify({'error': 'Defect title or description is required'}), 400

    project_id = issue.project_id if issue else data.get('project_id')
    candidate_query = Issue.query
    if project_id:
        candidate_query = candidate_query.filter_by(project_id=project_id)
    if current_user and current_user.role == 'Reporter':
        candidate_query = candidate_query.filter_by(reporter_id=user_id)

    candidate_issues = candidate_query.all()

    query_text = f"{title} {description}"
    rag_context = RAGService.retrieve_rag_context(query_text, candidate_issues, exclude_issue_id=issue.id if issue else None, top_k=5)

    defect_data = {
        'issue_key': issue.issue_key if issue else 'NEW',
        'title': title,
        'description': description,
        'category': issue.category if issue else data.get('category', 'General'),
        'module': issue.module if issue else data.get('module', 'General'),
        'severity': issue.severity if issue else data.get('severity', 'Medium'),
        'environment': issue.environment if issue else data.get('environment', 'Development')
    }

    rag_result = RAGService.generate_rag_resolution(defect_data, rag_context)
    return jsonify(rag_result), 200

@ai_bp.route('/knowledge-search', methods=['POST'])
@jwt_required()
def knowledge_search_endpoint():
    """
    Developer Knowledge Base Search
    ---
    tags:
      - AI
    summary: Natural language semantic vector search across resolved defects, root causes, and developer comments
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - query
          properties:
            query:
              type: string
              example: "authentication token expires after password reset"
            category:
              type: string
              example: "Authentication"
            project_id:
              type: integer
    responses:
      200:
        description: List of matched historical resolution knowledge items
      400:
        description: Search query required
      401:
        description: Unauthorized token
    """
    from app.services.knowledge_base_service import KnowledgeBaseService

    data = request.get_json() or {}
    query_str = data.get('query', '').strip()
    category = data.get('category')
    project_id = data.get('project_id')

    if not query_str:
        return jsonify({'error': 'Search query string is required'}), 400

    results = KnowledgeBaseService.search_knowledge_base(query_str, category=category, project_id=project_id, top_k=10)
    return jsonify(results), 200

@ai_bp.route('/chat', methods=['POST'])
@jwt_required()
def chat_endpoint():
    """
    Conversational BugFlow AI Assistant
    ---
    tags:
      - AI
    summary: System-aware conversational chatbot for querying defects, workloads, permissions, and app navigation
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - message
          properties:
            message:
              type: string
              example: "Which developer has the highest workload?"
    responses:
      200:
        description: Conversational response with optional navigation action and RAG references
      400:
        description: Message text required
      401:
        description: Unauthorized token
    """
    from flask_jwt_extended import get_jwt_identity
    from app.models.user import User
    from app.services.chatbot_service import ChatbotService

    user_id = int(get_jwt_identity())
    current_user = db.session.get(User, user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    message = data.get('message', '').strip()

    if not message:
        return jsonify({'error': 'Message text is required'}), 400

    chat_response = ChatbotService.process_chat_message(message, current_user)
    return jsonify(chat_response), 200

@ai_bp.route('/agent/process-screenshot', methods=['POST'])
@jwt_required()
def agent_process_screenshot_endpoint():
    """
    Autonomous Screenshot-to-Defect & Auto-Assignment Agent
    ---
    tags:
      - AI
    summary: Vision analysis -> duplicate check -> defect creation -> skill/workload scoring -> developer assignment
    security:
      - Bearer: []
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: Bug screenshot image file
      - in: formData
        name: project_id
        type: integer
      - in: formData
        name: auto_create
        type: boolean
      - in: formData
        name: auto_assign
        type: boolean
    responses:
      200:
        description: Complete autonomous intake report with extracted fields, duplicate check, and developer score
      400:
        description: File missing or invalid
      401:
        description: Unauthorized token
    """
    from flask_jwt_extended import get_jwt_identity
    from app.models.user import User
    from app.services.defect_agent_service import DefectAgentService

    user_id = int(get_jwt_identity())
    current_user = db.session.get(User, user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404

    if 'file' not in request.files:
        return jsonify({'error': 'No screenshot file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    project_id = request.form.get('project_id', type=int)
    auto_create = request.form.get('auto_create', 'true').lower() == 'true'
    auto_assign = request.form.get('auto_assign', 'true').lower() == 'true'

    res = DefectAgentService.process_screenshot_intake(
        file=file,
        reporter_user=current_user,
        project_id=project_id,
        auto_create=auto_create,
        auto_assign=auto_assign
    )

    return jsonify(res), 200

@ai_bp.route('/agent/assign-defect', methods=['POST'])
@jwt_required()
def agent_assign_defect_endpoint():
    """
    Developer Skill & Workload Assignment Agent
    ---
    tags:
      - AI
    summary: Score developer candidates based on skills, category preference, historical resolutions, and active workload
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            title:
              type: string
            category:
              type: string
            module:
              type: string
            project_id:
              type: integer
    responses:
      200:
        description: Ranked developer scoring list with transparent score breakdowns
      401:
        description: Unauthorized token
    """
    from app.services.assignment_agent_service import AssignmentAgentService
    from app.models.user import User, ActivityLog, AgentDecision
    from flask_jwt_extended import get_jwt_identity

    data = request.get_json() or {}
    issue_id = data.get('issue_id')
    override_dev_id = data.get('override_developer_id')

    if issue_id and override_dev_id:
        issue = db.session.get(Issue, issue_id)
        dev = db.session.get(User, override_dev_id)
        if issue and dev:
            issue.assignee_id = dev.id
            if issue.status == 'Reported':
                issue.status = 'Assigned'

            decision = AgentDecision(
                issue_id=issue.id,
                action_type='MANUAL_DEVELOPER_OVERRIDE',
                confidence_score=100,
                selected_developer_id=dev.id,
                assignment_score=100,
                reasoning=f"Manual developer reassignment override to {dev.full_name}.",
                is_override=True
            )
            db.session.add(decision)

            activity = ActivityLog(
                user_id=int(get_jwt_identity()),
                action='MANUAL_ASSIGNMENT_OVERRIDE',
                entity_type='Issue',
                entity_id=issue.id,
                details=f"Defect {issue.issue_key} manually reassigned to {dev.full_name}"
            )
            db.session.add(activity)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': f"Defect {issue.issue_key} successfully reassigned to {dev.full_name}",
                'assignment': {
                    'assigned_to': dev.full_name,
                    'developer_id': dev.id,
                    'match_score': 100,
                    'reasoning': 'Manual human override selection'
                },
                'issue': issue.to_dict()
            }), 200

    project_id = data.get('project_id')
    res = AssignmentAgentService.select_best_developer(data, project_id)
    return jsonify(res), 200

@ai_bp.route('/recommend-developer', methods=['POST'])
@jwt_required()
def recommend_developer_endpoint():
    """
    Recommend Ranked Developers for Defect Allocation
    ---
    tags:
      - AI
    summary: Recommend ranked developer allocation with transparent score breakdowns and workload availability
    security:
      - Bearer: []
    """
    from app.services.assignment_agent_service import AssignmentAgentService
    data = request.get_json() or {}
    project_id = data.get('project_id')
    res = AssignmentAgentService.select_best_developer(data, project_id)
    return jsonify(res), 200

@ai_bp.route('/allocate-developer', methods=['POST'])
@jwt_required()
def allocate_developer_endpoint():
    """
    Allocate Developer Agent Endpoint
    ---
    tags:
      - AI
    summary: Automatically allocate and assign best candidate developer for a defect in the DB
    security:
      - Bearer: []
    """
    from app.services.assignment_agent_service import AssignmentAgentService
    from app.models.user import User, ActivityLog, AgentDecision
    from flask_jwt_extended import get_jwt_identity

    data = request.get_json() or {}
    issue_id = data.get('issue_id')
    
    if not issue_id:
        # If defect payload supplied without issue_id, return recommendation
        res = AssignmentAgentService.select_best_developer(data, data.get('project_id'))
        return jsonify(res), 200

    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({'error': 'Issue not found'}), 404

    defect_payload = issue.to_dict()
    res = AssignmentAgentService.select_best_developer(defect_payload, issue.project_id)
    best = res.get('best_candidate')

    if not best:
        return jsonify({'error': 'No suitable developer candidate found'}), 400

    dev = db.session.get(User, best['developer_id'])
    if dev:
        issue.assignee_id = dev.id
        if issue.status == 'Reported':
            issue.status = 'Assigned'

        decision = AgentDecision(
            issue_id=issue.id,
            action_type='DEVELOPER_ALLOCATION_AGENT',
            confidence_score=best['score'],
            selected_developer_id=dev.id,
            assignment_score=best['score'],
            reasoning="; ".join(best['reasoning']),
            is_override=False
        )
        db.session.add(decision)

        activity = ActivityLog(
            user_id=int(get_jwt_identity()),
            action='AUTO_DEVELOPER_ALLOCATION',
            entity_type='Issue',
            entity_id=issue.id,
            details=f"Defect {issue.issue_key} automatically allocated & assigned to {dev.full_name} (Score: {best['score']}/100)"
        )
        db.session.add(activity)
        db.session.commit()

    return jsonify({
        'success': True,
        'assigned_developer': dev.to_dict() if dev else None,
        'allocation_score': best['score'],
        'reasoning': best['reasoning'],
        'breakdown': best['breakdown'],
        'issue': issue.to_dict()
    }), 200

@ai_bp.route('/impact-analysis', methods=['POST'])
@jwt_required()
def impact_analysis_endpoint():
    """
    AI Impact Analysis Agent Endpoint
    ---
    tags:
      - AI
    summary: Generate Risk Score, Database Facts, Calculated Metrics, and AI Inferences for defect impact
    security:
      - Bearer: []
    """
    from app.services.impact_analysis_service import ImpactAnalysisService
    data = request.get_json() or {}
    defect_param = data.get('issue_id') or data
    res = ImpactAnalysisService.analyze_defect_impact(defect_param)
    return jsonify(res), 200

@ai_bp.route('/load-balance', methods=['POST'])
@jwt_required()
def load_balance_endpoint():
    """
    Developer Load Balance Summary Endpoint
    ---
    tags:
      - AI
    summary: Team-wide developer workload distribution, overload warnings, and balance recommendations
    security:
      - Bearer: []
    """
    from app.models.user import User
    from app.services.assignment_agent_service import AssignmentAgentService

    devs = User.query.filter(User.role.in_(['Developer', 'DEVELOPER', 'Admin', 'Project Manager']), User.is_active == True).all()
    overview = []

    for d in devs:
        active_cnt = Issue.query.filter_by(assignee_id=d.id).filter(
            Issue.status.in_(['Assigned', 'In Progress', 'In Review', 'Reopened'])
        ).count()

        high_crit_cnt = Issue.query.filter_by(assignee_id=d.id).filter(
            Issue.status.in_(['Assigned', 'In Progress', 'In Review', 'Reopened']),
            Issue.severity.in_(['High', 'Critical'])
        ).count()

        status = AssignmentAgentService.get_workload_status(active_cnt, high_crit_cnt)
        overview.append({
            'developer': d.to_dict(),
            'active_workload': active_cnt,
            'high_critical_count': high_crit_cnt,
            'workload_status': status,
            'is_overloaded': status == 'OVERLOADED'
        })

    overview.sort(key=lambda x: x['active_workload'], reverse=True)
    overloaded_count = sum(1 for x in overview if x['is_overloaded'])

    return jsonify({
        'developer_count': len(devs),
        'overloaded_count': overloaded_count,
        'team_load_balance': overview,
        'recommendation': 'Workload is balanced across developers.' if overloaded_count == 0 else f'Warning: {overloaded_count} developer(s) are currently OVERLOADED. Consider reassigning defects.'
    }), 200

@ai_bp.route('/what-if-assignment', methods=['POST'])
@jwt_required()
def what_if_assignment_endpoint():
    """
    What-If Load Balancing Assignment Simulation
    ---
    tags:
      - AI
    summary: Simulate assigning a defect to a target developer and evaluate pre- vs post-load status & sprint impact
    security:
      - Bearer: []
    """
    from app.services.assignment_agent_service import AssignmentAgentService
    data = request.get_json() or {}
    target_dev_id = data.get('target_developer_id') or data.get('developer_id')
    defect_data = data.get('defect_data') or data

    if not target_dev_id:
        return jsonify({'error': 'target_developer_id is required'}), 400

    res = AssignmentAgentService.what_if_assignment(defect_data, int(target_dev_id), data.get('project_id'))
    if isinstance(res, tuple):
        return jsonify(res[0]), res[1]
    return jsonify(res), 200


