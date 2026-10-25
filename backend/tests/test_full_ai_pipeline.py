import pytest
import io
import base64
from app.services.embedding_service import EmbeddingService
from app.models.issue import Issue, DefectEmbedding
from app.models.user import User

PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

def test_screenshot_vision_analysis_api(client, admin_headers):
    img_bytes = base64.b64decode(PNG_BASE64)
    data = {
        'file': (io.BytesIO(img_bytes), 'test_bug.png')
    }
    res = client.post('/api/ai/analyze-screenshot', headers=admin_headers, data=data, content_type='multipart/form-data')
    assert res.status_code == 200
    assert 'analysis' in res.json
    assert 'title' in res.json['analysis']

def test_autonomous_screenshot_agent_workflow(client, admin_headers):
    # Create project first
    p_res = client.post('/api/projects', headers=admin_headers, json={
        'name': 'Intake Agent Project',
        'key': 'IAP',
        'description': 'Test project for intake agent'
    })
    assert p_res.status_code == 201
    project_id = p_res.json['project']['id']

    img_bytes = base64.b64decode(PNG_BASE64)
    data = {
        'file': (io.BytesIO(img_bytes), 'screen.png'),
        'project_id': project_id,
        'auto_create': 'true',
        'auto_assign': 'true'
    }
    res = client.post('/api/ai/agent/process-screenshot', headers=admin_headers, data=data, content_type='multipart/form-data')
    assert res.status_code == 200
    res_data = res.json
    assert res_data['success'] is True
    assert 'defect' in res_data
    assert 'assignment' in res_data
    assert 'duplicate_check' in res_data

def test_real_rag_historical_resolution_pipeline(client, admin_headers):
    # Create project first
    p_res = client.post('/api/projects', headers=admin_headers, json={
        'name': 'RAG Resolution Project',
        'key': 'RAGRP',
        'description': 'Test project for RAG resolution'
    })
    assert p_res.status_code == 201
    project_id = p_res.json['project']['id']

    # 1. Create historical defect
    h_res = client.post('/api/issues', headers=admin_headers, json={
        'project_id': project_id,
        'title': 'JWT Token authentication header missing on API request',
        'description': 'API requests fail with HTTP 401 Unauthorized when Authorization Bearer token is omitted',
        'category': 'Authentication',
        'severity': 'Critical',
        'priority': 'High'
    })
    assert h_res.status_code == 201
    issue_id = h_res.json['issue']['id']

    # Mark resolved with root cause
    client.put(f'/api/issues/{issue_id}/status', headers=admin_headers, json={
        'status': 'Resolved',
        'root_cause': 'Authorization Bearer header omitted in frontend API client config',
        'suggested_fix': 'Add JWT token header interceptor to all Axios network requests'
    })

    EmbeddingService.sync_defect_embedding(issue_id)

    # 2. Execute RAG pipeline for new defect
    rag_res = client.post('/api/ai/rag-resolution', headers=admin_headers, json={
        'project_id': project_id,
        'title': 'API requests fail with 401 Unauthorized token error',
        'description': 'User session drops due to missing authentication token',
        'category': 'Authentication'
    })
    assert rag_res.status_code == 200
    data = rag_res.json
    assert 'suggested_resolution' in data
    assert 'confidence_relevance' in data
    assert 'evidence_summary' in data

def test_developer_workload_dashboard_and_search_api(client, admin_headers):
    dash_res = client.get('/api/users/developers/dashboard', headers=admin_headers)
    assert dash_res.status_code == 200
    assert 'developers' in dash_res.json
    assert 'summary' in dash_res.json

    search_res = client.post('/api/users/developers/search-query', headers=admin_headers, json={
        'query': 'Who is currently overloaded?'
    })
    assert search_res.status_code == 200
    assert 'developers' in search_res.json

def test_conversational_chatbot_intent_and_nav_routing(client, admin_headers):
    # Workload query
    chat_res1 = client.post('/api/ai/chat', headers=admin_headers, json={
        'message': 'Which developer has the highest workload?'
    })
    assert chat_res1.status_code == 200
    assert 'answer' in chat_res1.json

    # Nav query
    chat_res2 = client.post('/api/ai/chat', headers=admin_headers, json={
        'message': 'Where can I see analytics?'
    })
    assert chat_res2.status_code == 200
    assert chat_res2.json['nav_action'] is not None
