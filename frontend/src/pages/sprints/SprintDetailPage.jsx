import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sprintService } from '../../services/sprintService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SprintKanbanBoard } from '../../components/sprints/SprintKanbanBoard';
import { 
  Rocket, Calendar, CheckCircle2, Clock, Play, Check, 
  Sparkles, AlertTriangle, ArrowLeft, User, ShieldAlert, BarChart3, TrendingDown
} from 'lucide-react';

export const SprintDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [sprint, setSprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiAdvisor, setAiAdvisor] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  useEffect(() => {
    loadSprint();
  }, [id]);

  const loadSprint = async () => {
    setIsLoading(true);
    try {
      const data = await sprintService.getSprint(id);
      setSprint(data);
    } catch (err) {
      console.error("Failed to load sprint:", err);
      addNotification({
        title: 'Error',
        message: 'Sprint not found',
        type: 'error'
      });
      navigate('/sprints');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSprint = async () => {
    try {
      await sprintService.startSprint(id);
      addNotification({
        title: 'Sprint Activated',
        message: 'Sprint is now active!',
        type: 'success'
      });
      loadSprint();
    } catch (err) {
      addNotification({
        title: 'Error',
        message: err.response?.data?.error || 'Failed to start sprint',
        type: 'error'
      });
    }
  };

  const handleCompleteSprint = async () => {
    try {
      await sprintService.completeSprint(id);
      addNotification({
        title: 'Sprint Completed',
        message: 'Sprint status updated to Completed',
        type: 'success'
      });
      loadSprint();
    } catch (err) {
      addNotification({
        title: 'Error',
        message: err.response?.data?.error || 'Failed to complete sprint',
        type: 'error'
      });
    }
  };

  const fetchAiAdvisor = async () => {
    setIsAiLoading(true);
    setIsAiModalOpen(true);
    try {
      const res = await sprintService.getAiAdvisor(id);
      setAiAdvisor(res);
    } catch (err) {
      console.error("AI Advisor error:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Active': return 'admin';
      case 'Completed': return 'tester';
      case 'Planned': return 'info';
      default: return 'default';
    }
  };

  if (isLoading || !sprint) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading sprint details...</div>;
  }

  const canManage = user?.role === 'Admin' || user?.role === 'Project Manager';
  const criticalCount = (sprint.issues || []).filter(i => i.severity === 'Critical' && !['Resolved', 'Closed'].includes(i.status)).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/sprints" className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sprints Workspace</span>
        </Link>
      </div>

      {/* Header Banner */}
      <Card className="p-6 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-mono font-bold">
                {sprint.project?.key || 'PRJ'}
              </span>
              <Badge variant={getStatusBadgeVariant(sprint.status)}>
                {sprint.status}
              </Badge>
            </div>

            <h1 className="text-2xl font-bold text-slate-100">{sprint.name}</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {sprint.goal || 'No specific sprint goal defined.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={fetchAiAdvisor}
              className="text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/20"
            >
              AI Sprint Risk Advisor
            </Button>

            {canManage && sprint.status === 'Planned' && (
              <Button variant="gradient" size="sm" icon={Play} onClick={handleStartSprint}>
                Start Sprint
              </Button>
            )}

            {canManage && sprint.status === 'Active' && (
              <Button variant="gradient" size="sm" icon={Check} onClick={handleCompleteSprint}>
                Complete Sprint
              </Button>
            )}
          </div>
        </div>

        {/* Sprint Timeline & Progress Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-800 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Defects</p>
            <p className="text-lg font-bold text-slate-100 mt-0.5">{sprint.total_defects}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Completed</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">{sprint.completed_defects}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Remaining</p>
            <p className="text-lg font-bold text-amber-400 mt-0.5">{sprint.remaining_defects}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Critical Open</p>
            <p className={`text-lg font-bold mt-0.5 ${criticalCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
              {criticalCount}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Sprint Completion</p>
            <p className="text-lg font-bold text-indigo-400 mt-0.5">{sprint.progress_percentage}%</p>
          </div>
        </div>
      </Card>

      {/* Real Sprint Burndown & Timeline Card */}
      {sprint.burndown && sprint.burndown.length > 0 && (
        <Card className="p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              <span>Sprint Burndown Progression</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Real-time activity tracking
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
            {sprint.burndown.map((pt, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                <p className="text-[10px] font-mono text-slate-400">{pt.day}</p>
                <p className="text-xs font-bold text-slate-200 mt-1">
                  Actual: <span className="text-amber-400">{pt.actual_remaining}</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Target: {pt.target_remaining}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sprint Kanban Board */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Sprint Board & Defect Lifecycle</span>
          </h3>
        </div>

        <SprintKanbanBoard
          issues={sprint.issues || []}
          onIssueStatusChanged={loadSprint}
        />
      </div>

      {/* AI Risk Advisor Modal */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="Gemini AI Sprint Risk Advisor"
        size="lg"
      >
        {isAiLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-400 animate-spin" />
            <span>Analyzing sprint velocity, open defect bottlenecks, and risk trajectory...</span>
          </div>
        ) : aiAdvisor ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-slate-200">
              <p className="font-bold text-indigo-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Executive Summary
              </p>
              <p className="leading-relaxed">{aiAdvisor.summary}</p>
            </div>

            {aiAdvisor.risk_alerts && aiAdvisor.risk_alerts.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Detected Sprint Risks
                </h4>
                <div className="space-y-2">
                  {aiAdvisor.risk_alerts.map((risk, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                      • {risk}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiAdvisor.recommendations && aiAdvisor.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Actionable Recommendations
                </h4>
                <div className="space-y-2">
                  {aiAdvisor.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                      • {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button variant="outline" onClick={() => setIsAiModalOpen(false)}>
                Close Advisor
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
