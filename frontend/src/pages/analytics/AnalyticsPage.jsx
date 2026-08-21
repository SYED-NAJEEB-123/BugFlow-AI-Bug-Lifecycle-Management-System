import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';
import { 
  BarChart3, PieChart as PieIcon, TrendingUp, Users, 
  Bug, AlertTriangle, CheckCircle2, Clock, Rocket 
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';

export const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const result = await analyticsService.getAnalytics();
        setData(result);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const SEVERITY_COLORS = ['#f43f5e', '#f59e0b', '#3b82f6', '#94a3b8'];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data) return null;

  const { overview, severity_breakdown, category_breakdown, developer_workload } = data;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <span>Enterprise Defect Analytics & Sprint Metrics</span>
          <BarChart3 className="w-5 h-5 text-indigo-400" />
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Real-time metrics on defect severity distribution, category breakdown, resolution velocity, sprint completion, and developer workloads
        </p>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Defects</p>
            <h3 className="text-2xl font-black text-slate-100 mt-1">{overview.total_defects}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">{overview.open_defects} Active Backlog</span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Bug className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Critical Defects</p>
            <h3 className="text-2xl font-black text-rose-400 mt-1">{overview.critical_defects}</h3>
            <span className="text-[10px] text-rose-400 font-semibold block mt-1">Immediate Triage Scope</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sprint Velocity</p>
            <h3 className="text-2xl font-black text-cyan-400 mt-1">{overview.active_sprints || 0} Active</h3>
            <span className="text-[10px] text-cyan-300 font-semibold block mt-1">
              {overview.total_sprints || 0} Total Sprints ({overview.completed_sprints || 0} Done)
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Rocket className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resolution Rate</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{overview.resolution_rate}%</h3>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> {overview.resolved_defects} Fixed
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Resolution</p>
            <h3 className="text-2xl font-black text-purple-400 mt-1">{overview.avg_resolution_hours} hrs</h3>
            <span className="text-[10px] text-purple-300 block mt-1">{overview.knowledge_base_articles} KB Articles</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity Distribution Pie Chart */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-indigo-400" />
            <span>Defect Severity Distribution</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severity_breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severity_breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[index % SEVERITY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d121f', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Category Breakdown Bar Chart */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Defects by Functional Category</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={category_breakdown}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d121f', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Developer Workload Allocation */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <span>Developer Active Workload Allocation</span>
        </h3>

        {developer_workload.length === 0 ? (
          <div className="p-6 text-center space-y-2 bg-slate-900/40 rounded-xl border border-slate-800">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No registered developers in the workspace yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {developer_workload.map((dev) => (
              <div key={dev.developer_id} className="p-4 rounded-xl glass-card space-y-2">
                <div className="flex items-center gap-3">
                  <img src={dev.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dev.name}`} alt={dev.name} className="w-8 h-8 rounded-full border border-slate-700 object-cover" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{dev.name}</h4>
                    <p className="text-[10px] text-slate-400">{dev.active_defects} Active Assigned Bugs</p>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, dev.active_defects * 25)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
