import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sprintService } from '../../services/sprintService';
import { projectService } from '../../services/projectService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { CreateSprintModal } from '../../components/sprints/CreateSprintModal';
import { 
  Rocket, Calendar, CheckCircle2, Clock, Play, Check, 
  Trash2, Plus, Sparkles, Filter, Briefcase, ChevronRight
} from 'lucide-react';

export const SprintsPage = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadProjects();
    loadSprints();
  }, [selectedProjectId, selectedStatus]);

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects();
      setProjects(data.projects || []);
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  };

  const loadSprints = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (selectedProjectId) params.project_id = selectedProjectId;
      if (selectedStatus) params.status = selectedStatus;

      const data = await sprintService.getSprints(params);
      setSprints(data.sprints || []);
    } catch (err) {
      console.error("Failed to load sprints:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSprint = async (sprintId) => {
    try {
      await sprintService.startSprint(sprintId);
      addNotification({
        title: 'Sprint Activated',
        message: 'Sprint is now active!',
        type: 'success'
      });
      loadSprints();
    } catch (err) {
      addNotification({
        title: 'Sprint Activation Failed',
        message: err.response?.data?.error || 'Failed to start sprint',
        type: 'error'
      });
    }
  };

  const handleCompleteSprint = async (sprintId) => {
    try {
      await sprintService.completeSprint(sprintId);
      addNotification({
        title: 'Sprint Completed',
        message: 'Sprint marked as Completed',
        type: 'success'
      });
      loadSprints();
    } catch (err) {
      addNotification({
        title: 'Completion Error',
        message: err.response?.data?.error || 'Failed to complete sprint',
        type: 'error'
      });
    }
  };

  const handleDeleteSprint = async (sprintId, sprintName) => {
    if (!window.confirm(`Are you sure you want to delete "${sprintName}"? Defects will be unassigned to backlog.`)) return;

    try {
      await sprintService.deleteSprint(sprintId);
      addNotification({
        title: 'Sprint Deleted',
        message: `Deleted sprint "${sprintName}"`,
        type: 'info'
      });
      loadSprints();
    } catch (err) {
      addNotification({
        title: 'Delete Error',
        message: err.response?.data?.error || 'Failed to delete sprint',
        type: 'error'
      });
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Active': return 'admin';
      case 'Completed': return 'tester';
      case 'Planned': return 'info';
      case 'Archived': return 'default';
      default: return 'default';
    }
  };

  const canManage = user?.role === 'Admin' || user?.role === 'Project Manager';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Rocket className="w-6 h-6 text-indigo-400" />
            <span>Sprint Management Workspace</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Group defects, track sprint burndown velocity, and run AI risk advisories
          </p>
        </div>

        {canManage && (
          <Button
            variant="gradient"
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
          >
            Create New Sprint
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glass-panel rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-300">Filter Sprints:</span>
          
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
            ))}
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['', 'Active', 'Planned', 'Completed', 'Archived'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedStatus === st
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {st || 'All Sprints'}
            </button>
          ))}
        </div>
      </div>

      {/* Sprints List Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading sprints...</div>
      ) : sprints.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-800">
          <Rocket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">No Sprints Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            No sprints match the selected criteria. Create a sprint to group defect work for your development team.
          </p>
          {canManage && (
            <Button variant="outline" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
              Create First Sprint
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sprints.map((sprint) => {
            const startDateFormatted = sprint.start_date ? new Date(sprint.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
            const endDateFormatted = sprint.end_date ? new Date(sprint.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

            return (
              <Card key={sprint.id} className="p-5 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between shadow-xl">
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-mono font-bold">
                        {sprint.project?.key || 'PRJ'}
                      </span>
                      <Badge variant={getStatusBadgeVariant(sprint.status)} size="sm">
                        {sprint.status}
                      </Badge>
                    </div>

                    {canManage && (
                      <button
                        onClick={() => handleDeleteSprint(sprint.id, sprint.name)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Delete Sprint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Title & Goal */}
                  <Link to={`/sprints/${sprint.id}`} className="text-base font-bold text-slate-100 hover:text-indigo-400 transition-colors block mb-1">
                    {sprint.name}
                  </Link>

                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-4">
                    {sprint.goal || 'No specific goal specified for this sprint.'}
                  </p>

                  {/* Timeline */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{startDateFormatted} → {endDateFormatted}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-indigo-400">{sprint.progress_percentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(sprint.progress_percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metrics Badge Counter */}
                  <div className="grid grid-cols-3 gap-2 text-center p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-5">
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium uppercase">Total</p>
                      <p className="text-xs font-bold text-slate-200">{sprint.total_defects}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium uppercase">Completed</p>
                      <p className="text-xs font-bold text-emerald-400">{sprint.completed_defects}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium uppercase">Remaining</p>
                      <p className="text-xs font-bold text-amber-400">{sprint.remaining_defects}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                  <div className="flex items-center gap-1.5">
                    {canManage && sprint.status === 'Planned' && (
                      <button
                        onClick={() => handleStartSprint(sprint.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                      >
                        <Play className="w-3 h-3" /> Start
                      </button>
                    )}

                    {canManage && sprint.status === 'Active' && (
                      <button
                        onClick={() => handleCompleteSprint(sprint.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/20 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Complete
                      </button>
                    )}
                  </div>

                  <Link to={`/sprints/${sprint.id}`}>
                    <Button variant="outline" size="sm" className="gap-1 text-xs">
                      <span>Open Sprint</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Sprint Modal */}
      <CreateSprintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSprintCreated={() => loadSprints()}
        initialProjectId={selectedProjectId ? parseInt(selectedProjectId) : null}
      />
    </div>
  );
};
