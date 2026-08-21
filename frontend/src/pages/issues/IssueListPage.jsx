import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { issueService } from '../../services/issueService';
import { projectService } from '../../services/projectService';
import { sprintService } from '../../services/sprintService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { IssueModal } from '../../components/issues/IssueModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { VisionAnalyzerModal } from '../../components/ai/VisionAnalyzerModal';
import { 
  Bug, Plus, Search, Filter, Sparkles, Camera, LayoutGrid, 
  List, Trash2, Edit3, ExternalLink, Rocket
} from 'lucide-react';

export const IssueListPage = ({ autoOpenReportModal = false }) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const [searchMode, setSearchMode] = useState('keyword'); // 'keyword' | 'semantic'

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSprint, setSelectedSprint] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  // Modals state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingIssue, setDeletingIssue] = useState(null);
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = user?.role === 'Admin' || user?.role === 'Project Manager';

  useEffect(() => {
    if (autoOpenReportModal || window.location.pathname === '/report' || window.location.pathname === '/report-issue') {
      setIsIssueModalOpen(true);
    }
  }, [autoOpenReportModal]);

  useEffect(() => {
    loadProjectsAndSprints();
  }, [selectedProject]);

  const loadProjectsAndSprints = async () => {
    try {
      const pData = await projectService.getProjects();
      setProjects(pData.projects || []);

      const sParams = selectedProject ? { project_id: selectedProject } : {};
      const sData = await sprintService.getSprints(sParams);
      setSprints(sData.sprints || []);
    } catch (err) {
      console.error("Error loading filter data:", err);
    }
  };

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const isMyBugsOnly = window.location.pathname === '/my-bugs' || user?.role === 'Reporter';

      if (searchMode === 'semantic' && searchQuery.trim().length > 0) {
        // Execute Semantic Vector Search
        const res = await issueService.semanticSearch({
          query: searchQuery,
          project_id: selectedProject ? parseInt(selectedProject) : null,
          sprint_id: selectedSprint ? parseInt(selectedSprint) : null,
          status: selectedStatus,
          severity: selectedSeverity,
          priority: selectedPriority,
          reporter_id: isMyBugsOnly && user?.id ? user.id : null
        });
        setIssues(res.results || []);
      } else {
        // Standard Filtered Search
        const params = {};
        if (isMyBugsOnly && user?.id) params.reporter_id = user.id;
        if (searchQuery) params.q = searchQuery;
        if (selectedProject) params.project_id = selectedProject;
        if (selectedSprint) params.sprint_id = selectedSprint;
        if (selectedStatus) params.status = selectedStatus;
        if (selectedSeverity) params.severity = selectedSeverity;
        if (selectedPriority) params.priority = selectedPriority;

        const iData = await issueService.getIssues(params);
        setIssues(iData.issues || []);
      }
    } catch (err) {
      addNotification({
        title: 'Error Loading Defects',
        message: err.response?.data?.error || 'Failed to fetch defect list',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchIssues, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMode, selectedProject, selectedSprint, selectedStatus, selectedSeverity, selectedPriority]);

  const handleCreateIssue = () => {
    setEditingIssue(null);
    setIsIssueModalOpen(true);
  };

  const handleEditIssue = (issue) => {
    setEditingIssue(issue);
    setIsIssueModalOpen(true);
  };

  const handleDeletePrompt = (issue) => {
    setDeletingIssue(issue);
    setIsDeleteModalOpen(true);
  };

  const handleSaveIssue = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingIssue) {
        await issueService.updateIssue(editingIssue.id, formData);
        addNotification({
          title: 'Defect Updated',
          message: `Defect ${editingIssue.issue_key} has been updated`,
          type: 'success'
        });
      } else {
        const res = await issueService.createIssue(formData);
        addNotification({
          title: 'Defect Reported',
          message: `Defect ${res.issue?.issue_key || 'report'} created successfully`,
          type: 'success'
        });
      }
      setIsIssueModalOpen(false);
      fetchIssues();
    } catch (err) {
      console.error(
        "Issue creation failed:",
        err.response?.data || err.message
      );
      const serverErrMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Could not save defect';
      addNotification({
        title: 'Save Failed',
        message: serverErrMsg,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingIssue) return;
    setIsSubmitting(true);
    try {
      await issueService.deleteIssue(deletingIssue.id);
      addNotification({
        title: 'Defect Deleted',
        message: `Defect ${deletingIssue.issue_key} removed`,
        type: 'success'
      });
      setIsDeleteModalOpen(false);
      setDeletingIssue(null);
      fetchIssues();
    } catch (err) {
      addNotification({
        title: 'Delete Failed',
        message: err.response?.data?.error || 'Could not delete defect',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const kanbanColumns = [
    { title: 'Reported', status: 'Reported', color: 'border-rose-500/40 text-rose-400' },
    { title: 'Assigned', status: 'Assigned', color: 'border-amber-500/40 text-amber-400' },
    { title: 'In Progress', status: 'In Progress', color: 'border-indigo-500/40 text-indigo-400' },
    { title: 'In Review', status: 'In Review', color: 'border-cyan-500/40 text-cyan-400' },
    { title: 'Resolved / Closed', status: 'Resolved', color: 'border-emerald-500/40 text-emerald-400' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <span>Defect Lifecycle & Tracking Hub</span>
            <Bug className="w-5 h-5 text-rose-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Report, triage, assign, investigate, and verify software defects across repositories
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Camera} onClick={() => setIsVisionModalOpen(true)}>
            Screenshot Vision OCR
          </Button>
          <Button variant="gradient" icon={Plus} onClick={handleCreateIssue}>
            Report Defect
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input Bar */}
          <div className="relative w-full md:w-96 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={searchMode === 'semantic' ? "Natural language semantic search (e.g. checkout payment crash)..." : "Search by Key, Title, Description..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Mode Toggles */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* Search Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setSearchMode('keyword')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  searchMode === 'keyword' ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Keyword
              </button>
              <button
                onClick={() => setSearchMode('semantic')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  searchMode === 'semantic' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Semantic AI
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === 'list' ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-4 h-4" /> List
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === 'kanban' ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" /> Kanban
              </button>
            </div>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80">
          <select
            value={selectedProject}
            onChange={(e) => { setSelectedProject(e.target.value); setSelectedSprint(''); }}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
            ))}
          </select>

          <select
            value={selectedSprint}
            onChange={(e) => setSelectedSprint(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Sprints</option>
            {sprints.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Verified">Verified</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </Card>

      {/* Main View Area */}
      {loading ? (
        <Spinner size="lg" className="py-12" />
      ) : issues.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Bug className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Defects Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedStatus || selectedSeverity || selectedSprint
              ? 'No defects matched your filter or semantic search criteria.'
              : 'Great job! There are currently no reported defects.'}
          </p>
          <Button variant="primary" icon={Plus} onClick={handleCreateIssue} className="mt-2">
            Report First Defect
          </Button>
        </Card>
      ) : viewMode === 'list' ? (
        /* Table View */
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Key</th>
                  {searchMode === 'semantic' && <th className="py-3 px-4">Similarity Match</th>}
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Sprint</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {issues.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                      <Link to={`/issues/${i.id}`} className="hover:underline flex items-center gap-1">
                        {i.issue_key}
                      </Link>
                    </td>

                    {searchMode === 'semantic' && (
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          {i.similarity_score}% Match ({i.similarity_level})
                        </span>
                      </td>
                    )}

                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <Link to={`/issues/${i.id}`} className="font-semibold text-slate-200 hover:text-indigo-300">
                        {i.title}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {i.project?.key || 'BUG'}
                    </td>

                    <td className="py-3.5 px-4">
                      {i.sprint ? (
                        <span className="text-[11px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                          <Rocket className="w-3 h-3" /> {i.sprint.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Backlog</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant={i.severity.toLowerCase()}>{i.severity}</Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant={i.status === 'Resolved' || i.status === 'Verified' || i.status === 'Closed' ? 'resolved' : 'in_progress'}>
                        {i.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {i.assignee ? (
                        <div className="flex items-center gap-2">
                          <img src={i.assignee.avatar_url} alt={i.assignee.full_name} className="w-5 h-5 rounded-full" />
                          <span>{i.assignee.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                        <Link to={`/issues/${i.id}`} className="p-1 rounded text-indigo-400 hover:bg-slate-800">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleEditIssue(i)} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <button onClick={() => handleDeletePrompt(i)} className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colIssues = issues.filter(i => {
              if (col.status === 'Reported') return ['Reported', 'New', 'Open'].includes(i.status);
              if (col.status === 'Resolved') return ['Resolved', 'Verified', 'Closed'].includes(i.status);
              return i.status === col.status;
            });

            return (
              <div key={col.status} className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800 flex flex-col min-w-[240px]">
                <div className={`flex items-center justify-between pb-3 border-b ${col.color} mb-3`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider">{col.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 font-mono font-bold">
                    {colIssues.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[65vh] pr-1">
                  {colIssues.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl glass-card space-y-2 hover:border-indigo-500/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <Link to={`/issues/${item.id}`} className="text-xs font-mono font-bold text-indigo-400 hover:underline">
                          {item.issue_key}
                        </Link>
                        <Badge variant={item.severity.toLowerCase()} size="sm">{item.severity}</Badge>
                      </div>

                      <Link to={`/issues/${item.id}`} className="text-xs font-bold text-slate-200 line-clamp-2 hover:text-indigo-300">
                        {item.title}
                      </Link>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                        <span>{item.category}</span>
                        {item.assignee && (
                          <img src={item.assignee.avatar_url} alt={item.assignee.full_name} title={item.assignee.full_name} className="w-5 h-5 rounded-full" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <IssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSubmit={handleSaveIssue}
        issue={editingIssue}
        isLoading={isSubmitting}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Defect Report"
        itemName={deletingIssue ? `${deletingIssue.issue_key}: "${deletingIssue.title}"` : 'defect'}
        isLoading={isSubmitting}
      />

      <VisionAnalyzerModal
        isOpen={isVisionModalOpen}
        onClose={() => setIsVisionModalOpen(false)}
        onAcceptAnalysis={handleSaveIssue}
      />
    </div>
  );
};
