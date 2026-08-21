import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { projectService } from '../../services/projectService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { Briefcase, BarChart3, Users, FileText, Sparkles, TrendingUp, FolderKanban, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ManagerDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectService.getProjects();
        setProjects(data.projects || []);
      } catch (err) {
        console.error('Failed to load manager projects:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'Active').length;
  const avgProgress = totalProjects > 0
    ? Math.round(projects.reduce((acc, curr) => acc + (curr.progress_percentage || 0), 0) / totalProjects)
    : 0;

  return (
    <div className="space-y-6">
      {/* PM Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <span>Project Management Suite</span>
            <Briefcase className="w-5 h-5 text-amber-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Welcome back, {user?.full_name}. Monitor sprint health, team velocity & AI release summaries.
          </p>
        </div>
        <Link to="/projects">
          <Button variant="gradient" icon={FolderKanban}>
            Manage Projects Portfolio
          </Button>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Portfolio Health</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{avgProgress}%</h3>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Average Milestone Completion
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Repositories</p>
            <h3 className="text-2xl font-black text-slate-100 mt-1">{totalProjects}</h3>
            <span className="text-[10px] text-slate-400 mt-1 block">{activeProjects} Active Sprint Scopes</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FolderKanban className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Members</p>
            <h3 className="text-2xl font-black text-cyan-400 mt-1">
              {projects.reduce((acc, curr) => acc + (curr.members_count || 0), 0)}
            </h3>
            <span className="text-[10px] text-cyan-400 mt-1 block">Cross-functional allocations</span>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">AI Release Summary</p>
            <h3 className="text-2xl font-black text-indigo-400 mt-1">Ready</h3>
            <span className="text-[10px] text-indigo-300 mt-1 block">Gemini Sprint Release Notes</span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Live Active Projects Overview */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-amber-400" />
            <span>Active Project Portfolios</span>
          </h3>
          <Link to="/projects" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <Spinner />
        ) : projects.length === 0 ? (
          <div className="p-8 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">No Projects Initialized</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first project repository portfolio to begin assigning teams and tracking sprint progress.
            </p>
            <Link to="/projects" className="inline-block mt-2">
              <Button variant="primary" icon={FolderKanban}>
                Create First Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <div key={p.id} className="p-4 rounded-xl glass-card space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{p.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Key: {p.key} • {p.members_count || 0} Team Members • Status: {p.status}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-400">{Math.round(p.progress_percentage)}% Complete</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, p.progress_percentage))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
