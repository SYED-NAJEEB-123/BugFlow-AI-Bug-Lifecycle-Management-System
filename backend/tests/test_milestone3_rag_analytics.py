import pytest
from app.services.embedding_service import EmbeddingService
from app.services.ai_service import AIService

def test_rag_context_retrieval_and_embedding_sync(client, admin_headers):
    # 1. Create test project
    p_res = client.post('/api/projects', headers=admin_headers, json={
        'name': 'RAG Vector Project',
        'key': 'RAGP',
        'description': 'Project for RAG vector search verification'
    })
    assert p_res.status_code == 201
    project_id = p_res.json['project']['id']

    # 2. Create historical resolved defect
    hist_res = client.post('/api/issues', headers=admin_headers, json={
        'project_id': project_id,
        'title': 'Payment gateway timeout during credit card submission',
        'description': 'Payment API times out when submitting transaction payload with null auth token',
        'severity': 'Critical',
        'priority': 'High',
        'category': 'Payment'
    })
    assert hist_res.status_code == 201
    hist_issue_id = hist_res.json['issue']['id']

    # Transition to Resolved with root cause and fix
    client.put(f'/api/issues/{hist_issue_id}/status', headers=admin_headers, json={
        'status': 'Resolved',
        'root_cause': 'Null auth token passed in payment API payload',
        'suggested_fix': 'Added validation for bearer token before executing payment request'
    })

    # Sync embedding
    EmbeddingService.sync_defect_embedding(hist_issue_id)

    # 3. Create new similar defect
    new_res = client.post('/api/issues', headers=admin_headers, json={
        'project_id': project_id,
        'title': 'Payment crashes during checkout processing',
        'description': 'Checkout screen throws exception when submitting payment request',
        'severity': 'High',
        'priority': 'High',
        'category': 'Payment'
    })
    assert new_res.status_code == 201
    new_issue_id = new_res.json['issue']['id']

    # Test resolution assistance API
    ai_res = client.post('/api/ai/resolution-assistance', headers=admin_headers, json={
        'issue_id': new_issue_id
    })
    assert ai_res.status_code == 200
    data = ai_res.json['assistance']
    assert 'investigation_areas' in data
    assert 'possible_root_cause' in data
    assert 'suggested_resolution' in data
    assert 'confidence_indicator' in data

def test_ai_defect_summarize_api(client, admin_headers):
    sum_res = client.post('/api/ai/summarize-defect', headers=admin_headers, json={
        'title': 'Database connection pool exhausted',
        'description': 'Under high concurrent traffic, the database connection pool reaches maximum capacity causing HTTP 500 error responses across all API endpoints.'
    })
    assert sum_res.status_code == 200
    summary = sum_res.json['summary']
    assert 'short_summary' in summary
    assert 'important_symptoms' in summary
    assert 'impact' in summary

def test_analytics_dashboard_metrics_api(client, admin_headers):
    res = client.get('/api/analytics', headers=admin_headers)
    assert res.status_code == 200
    data = res.json
    assert 'overview' in data
    assert 'severity_breakdown' in data
    assert 'category_breakdown' in data
    assert 'status_breakdown' in data
    assert 'developer_workload' in data
    assert 'defect_trends' in data
    assert 'open_vs_resolved' in data

def test_swagger_apidocs_endpoint(client):
    res = client.get('/apidocs/')
    assert res.status_code == 200

def test_unauthorized_and_invalid_payloads(client):
    # Missing token
    res = client.get('/api/analytics')
    assert res.status_code == 401

    # Invalid issue ID for resolution assistance
    res_ai = client.post('/api/ai/resolution-assistance', json={'issue_id': 999999})
    assert res_ai.status_code == 401
