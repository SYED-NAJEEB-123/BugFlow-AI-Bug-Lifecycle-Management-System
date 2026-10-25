import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { issueService } from '../../services/issueService';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Input } from '../common/Input';
import { DeveloperAllocationPanel } from '../ai/DeveloperAllocationPanel';
import { 
  Sparkles, UserCheck, ShieldAlert, CheckCircle2, 
  Brain, FileText, RefreshCw, ArrowRight 
} from 'lucide-react';

export const AllocationTab = ({ onDefectAssigned }) => {
  const [issues, setIssues] = useState([]);
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [defectForm, setDefectForm] = useState({
    title: 'Payment API Failure on Checkout',
    description: 'HTTP 500 error returned during UPI payment processing',
    category: 'Payment',
    module: 'PaymentGateway',
    severity: 'High',
    priority: 'High'
  });
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');
  const [assignedDevId, setAssignedDevId] = useState('');

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await issueService.getIssues();
        setIssues(res.issues || []);
      } catch (err) {
        console.error('Failed to load issues:', err);
      }
    };
    fetchIssues();
  }, []);

  const handleSelectExistingIssue = (issueId) => {
    setSelectedIssueId(issueId);
    if (!issueId) return;
    const found = issues.find(i => Number(i.id) === Number(issueId));
    if (found) {
      setDefectForm({
        title: found.title,
        description: found.description,
        category: found.category || 'General',
        module: found.module || 'General',
        severity: found.severity || 'Medium',
        priority: found.priority || 'Medium'
      });
      setAssignedDevId(found.assignee_id || '');
    }
  };

  const handleAutoAllocate = async (targetDevId = null) => {
    if (!selectedIssueId && !targetDevId) {
      // If allocating without an existing issue ID, select best candidate or inform user
      return;
    }
    setAssigning(true);
    setAssignSuccessMsg('');
    try {
      const res = await aiService.allocateDeveloper(Number(selectedIssueId), targetDevId);
      if (res.success) {
        setAssignSuccessMsg(`Defect successfully allocated & assigned to ${res.assigned_developer?.full_name}!`);
        if (onDefectAssigned) onDefectAssigned();
      }
    } catch (err) {
      console.error('Failed to allocate developer:', err);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-400" />
            AI Developer Allocation Agent Workflow
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Calculates 4-tier candidate suitability scores balancing Technical Skills, Category Experience, Historical Resolutions, and Active Capacity limits.
          </p>
        </div>

        <div className="w-full md:w-72">
          <Select
            label="Select Existing Defect to Evaluate"
            value={selectedIssueId}
            onChange={(e) => handleSelectExistingIssue(e.target.value)}
            options={[
              { label: 'Enter Manual Defect Details below', value: '' },
              ...issues.map(i => ({ label: `${i.issue_key}: ${i.title}`, value: i.id }))
            ]}
          />
        </div>
      </div>

      {assignSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{assignSuccessMsg}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setAssignSuccessMsg('')}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Manual Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <Input
          label="Defect Title"
          value={defectForm.title}
          onChange={(e) => setDefectForm({ ...defectForm, title: e.target.value })}
        />

        <Select
          label="Category"
          value={defectForm.category}
          onChange={(e) => setDefectForm({ ...defectForm, category: e.target.value })}
          options={[
            { label: 'Payment', value: 'Payment' },
            { label: 'Authentication', value: 'Authentication' },
            { label: 'UI/UX', value: 'UI/UX' },
            { label: 'API', value: 'API' },
            { label: 'Database', value: 'Database' },
            { label: 'Security', value: 'Security' },
            { label: 'General', value: 'General' }
          ]}
        />

        <Input
          label="Module / Component"
          value={defectForm.module}
          onChange={(e) => setDefectForm({ ...defectForm, module: e.target.value })}
        />
      </div>

      {/* Allocation Panel Widget */}
      <DeveloperAllocationPanel
        defectData={defectForm}
        currentAssigneeId={assignedDevId}
        onSelectDeveloper={(devId) => {
          setAssignedDevId(devId);
          if (selectedIssueId) {
            handleAutoAllocate(devId);
          }
        }}
      />
    </div>
  );
};
