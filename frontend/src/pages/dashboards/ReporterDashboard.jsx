import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { issueService } from '../../services/issueService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { IssueModal } from '../../components/issues/IssueModal';
import { 
  FileText, Plus, Bug, CheckCircle2, Clock, 
  AlertTriangle, TrendingUp, ExternalLink, PieChart as PieIcon, BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';

export const ReporterDashboard = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Issue modal for immediate bug reporting from dashboard
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReporterData = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        const res = await issueService.getIssues({ reporter_id: user.id });
        setIssues(res.issues || []);
      }
    } catch (err) {
      console.error('Error fetching reporter defects:', err);
      addNotification({
        title: 'Dashboard Error',
        message: 'Could not load reported defects',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReporterData();
  }, [user?.id]);

  const handleSaveIssue = async (formData) => {
    setIsSubmitting(true);
    try {
      const res = await issueService.createIssue(formData);
      addNotification({
        title: 'Defect Reported Successfully',
        message: `Defect ${res.issue?.issue_key || ''} submitted for triage`,
        type: 'success'
      });
      setIsModalOpen(false);
      fetchReporterData();
    } catch (err) {
      console.error("Reporter issue creation failed:", err.response?.data || err.message);
      addNotification({
        title: 'Report Failed',
        message: err.response?.data?.error || 'Could not report defect',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Real Database Metric Computations
  const totalCount = issues.length;
  const openCount = issues.filter(i => ['Reported', 'Assigned', 'In Progress', 'In Review', 'Reopened'].includes(i.status)).length;
  const inProgressCount = issues.filter(i => i.status === 'In Progress').length;
  const resolvedCount = issues.filter(i => i.status === 'Resolved').length;
  const closedCount = issues.filter(i => ['Verified', 'Closed'].includes(i.status)).length;
  const criticalCount = issues.filter(i => i.severity === 'Critical').length;

  // Status breakdown data for chart
  const statusData = [
    { name: 'Reported', value: issues.filter(i => i.status === 'Reported').length },
    { name: 'In Progress', value: inProgressCount },
    { name: 'Resolved', value: resolvedCount },
    { name: 'Closed', value: closedCount }
  ].filter(s => s.value > 0 || totalCount === 0);

  const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#64748b'];

  // Severity breakdown data for chart
  const severityData = [
    { name: 'Critical', count: criticalCount },
    { name: 'High', count: issues.filter(i => i.severity === 'High').length },
    { name: 'Medium', count: issues.filter(i => i.severity === 'Medium').length },
    { name: 'Low', count: issues.filter(i => i.severity === 'Low').length }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <span>Reporter Workspace</span>
            <FileText className="w-5 h-5 text-indigo-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Welcome back, {user?.full_name}. Monitor your submitted software defects, evidence attachments & resolution progress.
          </p>
        </div>
        <Button variant="gradient" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Report New Defect
        </Button>
      </div>

      {/* Real Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Reported Issues</p>
            <h3 className="text-2xl font-black text-slate-100 mt-1">{totalCount}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Bug className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Backlog</p>
            <h3 className="text-2xl font-black text-blue-400 mt-1">{openCount}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{inProgressCount}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolved</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{resolvedCount}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Closed</p>
            <h3 className="text-2xl font-black text-slate-300 mt-1">{closedCount}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Critical Issues</p>
            <h3 className="text-2xl font-black text-rose-400 mt-1">{criticalCount}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-indigo-400" />
            <span>My Issues Status Distribution</span>
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
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

        {/* Severity Distribution Bar Chart */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>My Issues Severity Breakdown</span>
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData}>
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

      {/* Reported Defect Queue List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Bug className="w-4 h-4 text-indigo-400" />
            <span>My Submitted Defects ({totalCount})</span>
          </h3>
          <Link to="/my-bugs" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            View All My Bugs <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {issues.length === 0 ? (
          <div className="p-10 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Bug className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">No Defects Submitted Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven't reported any software defects. Use the button below to submit your first defect report.
            </p>
            <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)} className="mt-2">
              Report First Defect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.slice(0, 5).map((item) => (
              <div key={item.id} className="p-4 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500/40 transition-colors">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400">{item.issue_key}</span>
                    <span className="text-[11px] text-slate-400">• {item.project?.name || 'Project'}</span>
                    <span className="text-[11px] text-slate-500">• {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 truncate">{item.title}</h4>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={item.severity.toLowerCase()}>{item.severity}</Badge>
                  <Badge variant={item.status === 'Resolved' || item.status === 'Verified' || item.status === 'Closed' ? 'resolved' : 'in_progress'}>
                    {item.status}
                  </Badge>
                  <Link to={`/issues/${item.id}`}>
                    <Button variant="outline" size="sm" icon={ExternalLink}>
                      Inspect
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Bug Report Modal Launcher */}
      <IssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveIssue}
        isLoading={isSubmitting}
      />
    </div>
  );
};
