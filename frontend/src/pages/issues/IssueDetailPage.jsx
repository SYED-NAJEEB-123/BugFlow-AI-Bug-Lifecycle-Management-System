import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { issueService } from '../../services/issueService';
import { authService } from '../../services/authService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { ResolutionAssistancePanel } from '../../components/ai/ResolutionAssistancePanel';
import { SimilarDefectsWidget } from '../../components/ai/SimilarDefectsWidget';
import { 
  Bug, ArrowLeft, CheckCircle2, Clock, Users, Send, 
  Paperclip, History, Sparkles, AlertCircle, Edit3, Trash2,
  FileCode, Check, RefreshCcw, Shield
} from 'lucide-react';

export const IssueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'comments' | 'attachments' | 'history'

  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const [developers, setDevelopers] = useState([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [rootCauseInput, setRootCauseInput] = useState('');
  const [resolutionInput, setResolutionInput] = useState('');

  const canManage = user?.role === 'Admin' || user?.role === 'Project Manager';

  const fetchIssueDetail = async () => {
    setLoading(true);
    try {
      const [iData, uData] = await Promise.all([
        issueService.getIssueById(id),
        authService.getUsers()
      ]);
      setIssue(iData);
      setDevelopers(uData.users || []);
      setRootCauseInput(iData.root_cause || '');
      setResolutionInput(iData.suggested_fix || '');
    } catch (err) {
      addNotification({
        title: 'Error Loading Defect',
        message: err.response?.data?.error || 'Defect not found',
        type: 'error'
      });
      navigate('/issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueDetail();
  }, [id]);

  const handleStatusChange = async (targetStatus) => {
    setIsUpdatingStatus(true);
    try {
      await issueService.updateStatus(issue.id, {
        status: targetStatus,
        root_cause: rootCauseInput,
        resolution_summary: resolutionInput
      });
      addNotification({
        title: 'Status Updated',
        message: `Defect status set to ${targetStatus}`,
        type: 'success'
      });
      fetchIssueDetail();
    } catch (err) {
      addNotification({
        title: 'Status Update Failed',
        message: err.response?.data?.error || 'Action forbidden',
        type: 'error'
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId) => {
    try {
      await issueService.assignIssue(issue.id, newAssigneeId ? Number(newAssigneeId) : null);
      addNotification({
        title: 'Assignee Updated',
        message: 'Defect developer assignment updated',
        type: 'success'
      });
      fetchIssueDetail();
    } catch (err) {
      addNotification({
        title: 'Assignment Failed',
        message: err.response?.data?.error || 'Could not assign developer',
        type: 'error'
      });
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsPostingComment(true);
    try {
      await issueService.addComment(issue.id, newComment);
      addNotification({
        title: 'Comment Posted',
        message: 'Your discussion note has been added',
        type: 'success'
      });
      setNewComment('');
      fetchIssueDetail();
    } catch (err) {
      addNotification({
        title: 'Comment Error',
        message: err.response?.data?.error || 'Failed to post comment',
        type: 'error'
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await issueService.uploadAttachment(issue.id, file);
      addNotification({
        title: 'File Uploaded',
        message: `Attachment ${file.name} uploaded successfully`,
        type: 'success'
      });
      fetchIssueDetail();
    } catch (err) {
      addNotification({
        title: 'Upload Error',
        message: err.response?.data?.error || 'Failed to upload attachment',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!issue) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/issues')}>
            Back to Defects
          </Button>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
            {issue.issue_key}
          </span>
          <Badge variant={issue.status === 'Resolved' || issue.status === 'Verified' || issue.status === 'Closed' ? 'resolved' : 'in_progress'}>
            {issue.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={issue.severity.toLowerCase()}>{issue.severity} Severity</Badge>
          <Badge variant={issue.priority.toLowerCase()}>{issue.priority} Priority</Badge>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Main Defect Content, Tabs, Comments, History) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-100">{issue.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                <span>Project: {issue.project?.name} ({issue.project?.key})</span>
                <span>•</span>
                <span>Category: {issue.category}</span>
                <span>•</span>
                <span>Module: {issue.module}</span>
                <span>•</span>
                <span>Env: {issue.environment}</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 text-xs font-semibold pt-2">
              {[
                { id: 'overview', name: 'Overview & Steps', icon: Bug },
                { id: 'comments', name: `Comments (${issue.comments_count || 0})`, icon: Clock },
                { id: 'attachments', name: `Attachments (${issue.attachments_count || 0})`, icon: Paperclip },
                { id: 'history', name: 'Activity History', icon: History }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-300 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-300 uppercase tracking-wider mb-1">Description</h4>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {issue.description}
                  </div>
                </div>

                {issue.steps_to_reproduce && (
                  <div>
                    <h4 className="font-bold text-slate-300 uppercase tracking-wider mb-1">Steps to Reproduce</h4>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                      {issue.steps_to_reproduce}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {issue.expected_behavior && (
                    <div>
                      <h4 className="font-bold text-slate-300 uppercase tracking-wider mb-1">Expected Behavior</h4>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 leading-relaxed">
                        {issue.expected_behavior}
                      </div>
                    </div>
                  )}
                  {issue.actual_behavior && (
                    <div>
                      <h4 className="font-bold text-slate-300 uppercase tracking-wider mb-1">Actual Behavior</h4>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 leading-relaxed">
                        {issue.actual_behavior}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-4">
                <form onSubmit={handlePostComment} className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Add a comment or technical note..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" size="sm" icon={Send} isLoading={isPostingComment}>
                      Post Comment
                    </Button>
                  </div>
                </form>

                <div className="space-y-3 pt-3 border-t border-slate-800">
                  {issue.comments && issue.comments.map((c) => (
                    <div key={c.id} className="p-3.5 rounded-xl glass-card space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={c.user?.avatar_url} alt={c.user?.full_name} className="w-5 h-5 rounded-full" />
                          <span className="font-bold text-slate-200">{c.user?.full_name}</span>
                          <span className="text-[10px] text-slate-400">({c.user?.role})</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-300 uppercase tracking-wider">File Attachments</h4>
                  <label className="cursor-pointer">
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                    <span className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium inline-flex items-center gap-1.5 transition-colors">
                      <Paperclip className="w-3.5 h-3.5" /> Upload File
                    </span>
                  </label>
                </div>

                <div className="space-y-2">
                  {issue.attachments && issue.attachments.map((a) => (
                    <div key={a.id} className="p-3 rounded-xl glass-card flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-indigo-400" />
                        <div>
                          <p className="font-semibold text-slate-200">{a.filename}</p>
                          <p className="text-[10px] text-slate-400">Uploaded by {a.uploaded_by?.full_name}</p>
                        </div>
                      </div>
                      <a
                        href={`/api/issues/uploads/${a.file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline text-xs font-semibold"
                      >
                        Download / View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-2 text-xs">
                {issue.history && issue.history.map((h) => (
                  <div key={h.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-slate-300">
                    <div>
                      <span className="font-semibold text-indigo-400">{h.user?.full_name}</span>{' '}
                      changed <span className="font-mono font-bold text-slate-200">{h.field_changed}</span> from{' '}
                      <span className="text-slate-400">{h.old_value || 'None'}</span> to{' '}
                      <span className="text-emerald-400 font-semibold">{h.new_value}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(h.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Similar Defects Widget */}
          <SimilarDefectsWidget
            title={issue.title}
            description={issue.description}
            projectId={issue.project_id}
          />
        </div>

        {/* Right Column (Lifecycle Control & AI Resolution Assistance) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Lifecycle State Controller */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Defect Lifecycle Control</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Status:</span>
                <Badge variant={issue.status === 'Resolved' ? 'resolved' : 'in_progress'}>
                  {issue.status}
                </Badge>
              </div>

              {/* Reporter Restricted Edit Banner */}
              {user?.role === 'Reporter' && !['Reported', 'New', 'Open'].includes(issue.status) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>This issue is currently being processed and can no longer be modified.</span>
                </div>
              )}

              {/* Status Transition Action Buttons */}
              {user?.role !== 'Reporter' && (
                <div className="grid grid-cols-1 gap-2 pt-2">
                  {issue.status === 'Reported' && (
                    <Button variant="primary" size="sm" onClick={() => handleStatusChange('In Progress')}>
                      Start Working (In Progress)
                    </Button>
                  )}

                  {issue.status === 'Assigned' && (
                    <Button variant="primary" size="sm" onClick={() => handleStatusChange('In Progress')}>
                      Begin Resolution (In Progress)
                    </Button>
                  )}

                  {issue.status === 'In Progress' && (
                    <Button variant="gradient" size="sm" onClick={() => handleStatusChange('In Review')}>
                      Submit Fix for Review
                    </Button>
                  )}

                  {issue.status === 'In Review' && (
                    <Button variant="gradient" size="sm" onClick={() => handleStatusChange('Resolved')}>
                      Mark Defect Resolved
                    </Button>
                  )}

                  {issue.status === 'Resolved' && (
                    <div className="space-y-2">
                      <Button variant="primary" size="sm" className="w-full bg-emerald-600" onClick={() => handleStatusChange('Verified')}>
                        Verify Defect Fix (QA)
                      </Button>
                      <Button variant="danger" size="sm" className="w-full" onClick={() => handleStatusChange('Reopened')}>
                        Reopen Defect (Reject Fix)
                      </Button>
                    </div>
                  )}

                  {issue.status === 'Verified' && (
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => handleStatusChange('Closed')}>
                      Close Defect
                    </Button>
                  )}

                  {issue.status === 'Reopened' && (
                    <Button variant="primary" size="sm" onClick={() => handleStatusChange('In Progress')}>
                      Resume Fix (In Progress)
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Developer Assignment Selector */}
            <div className="pt-3 border-t border-slate-800 text-xs">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                Assigned Developer
              </label>
              <select
                value={issue.assignee_id || ''}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                disabled={!canManage || user?.role === 'Reporter'}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Unassigned</option>
                {developers.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name} ({d.role})</option>
                ))}
              </select>
            </div>
          </Card>

          {/* Signature Feature: AI Resolution Assistance Panel */}
          <ResolutionAssistancePanel issue={issue} />
        </div>
      </div>
    </div>
  );
};
