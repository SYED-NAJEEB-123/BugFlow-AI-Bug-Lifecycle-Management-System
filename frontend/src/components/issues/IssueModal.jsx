import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { projectService } from '../../services/projectService';
import { authService } from '../../services/authService';
import { aiService } from '../../services/aiService';
import { AIEnhancerModal } from '../ai/AIEnhancerModal';
import { VisionAnalyzerModal } from '../ai/VisionAnalyzerModal';
import { SimilarDefectsWidget } from '../ai/SimilarDefectsWidget';
import { 
  Bug, FolderKanban, Sparkles, Camera, Users, 
  Wrench, Save, Plus, AlertCircle, FileText
} from 'lucide-react';

export const IssueModal = ({
  isOpen,
  onClose,
  onSubmit,
  issue = null,
  isLoading = false
}) => {
  const { user } = useAuth();
  const isEditing = !!issue;

  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    expected_behavior: '',
    actual_behavior: '',
    steps_to_reproduce: '',
    suggested_fix: '',
    category: 'General',
    module: 'General',
    defect_type: 'Functional Defect',
    severity: 'Medium',
    priority: 'Medium',
    environment: 'Development',
    assignee_id: '',
    sprint_id: '',
    ai_enhanced: false,
    vision_analyzed: false
  });

  const [projects, setProjects] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [isEnhancerOpen, setIsEnhancerOpen] = useState(false);
  const [isVisionOpen, setIsVisionOpen] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pData, uData] = await Promise.all([
          projectService.getProjects(),
          authService.getUsers()
        ]);
        setProjects(pData.projects || []);
        setDevelopers(uData.users || []);
        
        if (pData.projects && pData.projects.length > 0 && !formData.project_id) {
          setFormData(prev => ({ ...prev, project_id: pData.projects[0].id }));
        }
      } catch (err) {
        console.error('Failed to load project & user data for IssueModal:', err);
      }
    };

    if (isOpen) {
      fetchData();
      if (issue) {
        setFormData({
          project_id: issue.project_id || '',
          title: issue.title || '',
          description: issue.description || '',
          expected_behavior: issue.expected_behavior || '',
          actual_behavior: issue.actual_behavior || '',
          steps_to_reproduce: issue.steps_to_reproduce || '',
          suggested_fix: issue.suggested_fix || '',
          category: issue.category || 'General',
          module: issue.module || 'General',
          defect_type: issue.defect_type || 'Functional Defect',
          severity: issue.severity || 'Medium',
          priority: issue.priority || 'Medium',
          environment: issue.environment || 'Development',
          assignee_id: issue.assignee_id || '',
          sprint_id: issue.sprint_id || '',
          ai_enhanced: issue.ai_enhanced || false,
          vision_analyzed: issue.vision_analyzed || false
        });
      } else {
        setFormData({
          project_id: projects[0]?.id || '',
          title: '',
          description: '',
          expected_behavior: '',
          actual_behavior: '',
          steps_to_reproduce: '',
          suggested_fix: '',
          category: 'General',
          module: 'General',
          defect_type: 'Functional Defect',
          severity: 'Medium',
          priority: 'Medium',
          environment: 'Development',
          assignee_id: '',
          sprint_id: '',
          ai_enhanced: false,
          vision_analyzed: false
        });
      }
    }
  }, [isOpen, issue]);

  const handleAIClassify = async () => {
    if (!formData.title && !formData.description) return;
    setIsClassifying(true);
    try {
      const result = await aiService.classifyDefect(formData.title, formData.description);
      setFormData(prev => ({
        ...prev,
        category: result.category || prev.category,
        module: result.module || prev.module,
        defect_type: result.defect_type || prev.defect_type,
        severity: result.severity || prev.severity,
        priority: result.priority || prev.priority
      }));
    } catch (err) {
      console.error('Auto-classify error:', err);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleApplyEnhancedReport = (enhanced) => {
    setFormData(prev => ({
      ...prev,
      title: enhanced.title || prev.title,
      description: enhanced.description || prev.description,
      environment: enhanced.environment || prev.environment,
      steps_to_reproduce: enhanced.steps_to_reproduce || prev.steps_to_reproduce,
      expected_behavior: enhanced.expected_result || prev.expected_behavior,
      actual_behavior: enhanced.actual_result || prev.actual_behavior,
      ai_enhanced: true
    }));
  };

  const handleApplyVisionAnalysis = (analysis) => {
    setFormData(prev => ({
      ...prev,
      title: analysis.title || prev.title,
      description: analysis.description || prev.description,
      environment: analysis.environment || prev.environment,
      steps_to_reproduce: analysis.steps_to_reproduce || prev.steps_to_reproduce,
      expected_behavior: analysis.expected_result || prev.expected_behavior,
      actual_behavior: analysis.actual_result || prev.actual_behavior,
      category: analysis.category || prev.category,
      severity: analysis.severity || prev.severity,
      priority: analysis.priority || prev.priority,
      suggested_fix: analysis.suggested_fix || prev.suggested_fix,
      vision_analyzed: true
    }));
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();

    const cleanProjectId = formData.project_id ? Number(formData.project_id) : (projects[0]?.id || null);
    const cleanAssigneeId = formData.assignee_id ? Number(formData.assignee_id) : null;
    const cleanSprintId = formData.sprint_id ? Number(formData.sprint_id) : null;

    const payload = {
      ...formData,
      project_id: cleanProjectId,
      assignee_id: cleanAssigneeId,
      sprint_id: cleanSprintId
    };

    console.log("Submitting issue:", payload);
    onSubmit(payload);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? `Edit Defect: ${issue.issue_key}` : 'Report New Software Defect'}
        subtitle={isEditing ? 'Modify defect severity, priority, or details' : 'Enter defect information manually or use AI-assisted tools'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* AI Helper Banner */}
          {!isEditing && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Need AI Assistance?
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Sparkles}
                  onClick={() => setIsEnhancerOpen(true)}
                >
                  AI Description Enhancer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={Camera}
                  onClick={() => setIsVisionOpen(true)}
                >
                  Screenshot Vision OCR
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Target Project *"
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: Number(e.target.value) })}
              options={projects.map(p => ({ label: `${p.name} (${p.key})`, value: p.id }))}
              containerClassName="sm:col-span-2"
              required
            />

            <Select
              label="Environment"
              value={formData.environment}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
              options={[
                { label: 'Development', value: 'Development' },
                { label: 'QA / Testing', value: 'QA' },
                { label: 'Staging', value: 'Staging' },
                { label: 'Production', value: 'Production' },
                { label: 'iOS / Mobile', value: 'iOS' },
                { label: 'Android', value: 'Android' }
              ]}
            />
          </div>

          <Input
            label="Defect Title *"
            placeholder="Concise technical summary of the failure"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Detailed Defect Description *
              </label>
              {formData.title && (
                <button
                  type="button"
                  onClick={handleAIClassify}
                  disabled={isClassifying}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Auto-Classify Severity & Category
                </button>
              )}
            </div>
            <textarea
              rows={3}
              placeholder="Describe the defect, actual behavior, and steps leading to the error..."
              className="w-full bg-slate-900/90 border border-slate-800 text-slate-100 text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 transition-colors"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          {/* Real-time Similar Defects Duplicate Checker */}
          {!isEditing && (
            <SimilarDefectsWidget
              title={formData.title}
              description={formData.description}
              projectId={formData.project_id}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { label: 'General', value: 'General' },
                { label: 'UI/UX', value: 'UI/UX' },
                { label: 'API', value: 'API' },
                { label: 'Authentication', value: 'Authentication' },
                { label: 'Database', value: 'Database' },
                { label: 'Performance', value: 'Performance' },
                { label: 'Security', value: 'Security' },
                { label: 'Payment', value: 'Payment' }
              ]}
            />

            <Select
              label="Severity *"
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              options={[
                { label: 'Critical', value: 'Critical' },
                { label: 'High', value: 'High' },
                { label: 'Medium', value: 'Medium' },
                { label: 'Low', value: 'Low' }
              ]}
            />

            <Select
              label="Priority *"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={[
                { label: 'Critical / Urgent', value: 'Critical' },
                { label: 'High', value: 'High' },
                { label: 'Medium', value: 'Medium' },
                { label: 'Low', value: 'Low' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(user?.role !== 'Reporter') ? (
              <Select
                label="Assign Developer"
                value={formData.assignee_id || ''}
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value ? Number(e.target.value) : '' })}
                options={[
                  { label: 'Unassigned', value: '' },
                  ...developers.map(d => ({ label: `${d.full_name} (${d.role})`, value: d.id }))
                ]}
              />
            ) : (
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Assignee</span>
                  <span className="text-xs text-slate-300">Automatic Triage Queue</span>
                </div>
              </div>
            )}

            <Input
              label="Module / Component"
              placeholder="e.g. AuthController, PaymentGateway"
              value={formData.module}
              onChange={(e) => setFormData({ ...formData, module: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                Steps to Reproduce
              </label>
              <textarea
                rows={2}
                placeholder="1. Step one&#10;2. Step two"
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5"
                value={formData.steps_to_reproduce}
                onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                Expected vs Actual Behavior
              </label>
              <textarea
                rows={2}
                placeholder="Expected result and actual crash trace..."
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5"
                value={formData.actual_behavior}
                onChange={(e) => setFormData({ ...formData, actual_behavior: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              isLoading={isLoading}
              icon={isEditing ? Save : Plus}
            >
              {isEditing ? 'Save Defect Changes' : 'Submit Defect Report'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* AI Modals */}
      <AIEnhancerModal
        isOpen={isEnhancerOpen}
        onClose={() => setIsEnhancerOpen(false)}
        onApply={handleApplyEnhancedReport}
        initialDescription={formData.description}
        initialEnvironment={formData.environment}
      />

      <VisionAnalyzerModal
        isOpen={isVisionOpen}
        onClose={() => setIsVisionOpen(false)}
        onAcceptAnalysis={handleApplyVisionAnalysis}
      />
    </>
  );
};
