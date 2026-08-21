import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { issueService } from '../../services/issueService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { Code, Sparkles, CheckCircle2, Clock, Bug, ExternalLink, FileCode, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DevDashboard = () => {
  const { user } = useAuth();
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevData = async () => {
      setLoading(true);
      try {
        if (user?.id) {
          const res = await issueService.getIssues({ assignee_id: user.id });
          setAssignedIssues(res.issues || []);
        }
      } catch (err) {
        console.error('Error fetching developer defects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDevData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const inProgressCount = assignedIssues.filter(i => i.status === 'In Progress').length;
  const resolvedCount = assignedIssues.filter(i => ['Resolved', 'Verified', 'Closed'].includes(i.status)).length;

  return (
    <div className="space-y-6">
      {/* Dev Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <span>Developer Workspace</span>
            <Code className="w-5 h-5 text-cyan-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Welcome back, {user?.full_name}. View your assigned defects & launch Gemini AI Solution Copilot.
          </p>
        </div>
      </div>

      {/* AI Copilot Callout Banner */}
      <Card className="p-6 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Gemini AI Solution Copilot Ready</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xl">
              Open any assigned defect to generate root-cause analysis, code fix snippets, unit test steps, and resolution guides automatically.
            </p>
          </div>
        </div>
        <Link to="/issues">
          <Button variant="gradient" icon={Sparkles}>
            Explore Defect Backlog
          </Button>
        </Link>
      </Card>

      {/* Real Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned to Me</p>
            <h3 className="text-2xl font-black text-slate-100 mt-1">{assignedIssues.length}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Bug className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{inProgressCount}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resolved Defects</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{resolvedCount}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Assigned Defects List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>Assigned Defect Queue ({assignedIssues.length})</span>
          </h3>
        </div>

        {assignedIssues.length === 0 ? (
          <div className="p-10 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">No Defects Assigned to You</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your queue is clean! When project managers assign defects to you, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignedIssues.map((b) => (
              <div key={b.id} className="p-4 rounded-xl glass-card flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-500/40 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400">{b.issue_key}</span>
                    <span className="text-[11px] text-slate-400">• {b.project?.name || 'Project'}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">{b.title}</h4>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={b.severity.toLowerCase()}>{b.severity}</Badge>
                  <Badge variant={b.status === 'Resolved' ? 'resolved' : 'in_progress'}>{b.status}</Badge>
                  <Link to={`/issues/${b.id}`}>
                    <Button variant="outline" size="sm" icon={ExternalLink}>
                      Inspect Defect
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
