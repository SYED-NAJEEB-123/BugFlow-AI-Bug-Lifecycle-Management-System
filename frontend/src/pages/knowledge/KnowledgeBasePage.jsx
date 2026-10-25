import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/aiService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { Modal } from '../../components/common/Modal';
import { 
  Users, Search, BookOpen, Sparkles, CheckCircle2, AlertTriangle, 
  ArrowRight, MessageSquare, Filter, Layers, User, Calendar,
  BarChart2, ShieldAlert, Cpu, Activity, Check, Code, Briefcase, FileText
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'UI/UX',
  'Backend API',
  'Database',
  'Security',
  'Performance',
  'Integration',
  'Mobile'
];

const DEV_QUICK_QUERIES = [
  'Who is currently overloaded?',
  'Who has the lowest current workload?',
  'Which developer has the highest number of in-progress bugs?',
  'Who has resolved payment defects before?',
  'Who has Python and Flask experience?'
];

export const KnowledgeBasePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dev_dashboard'); // 'dev_dashboard' | 'solution_rag'

  // Developer Dashboard State
  const [devDashboardLoading, setDevDashboardLoading] = useState(false);
  const [developers, setDevelopers] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [devSearchQuery, setDevSearchQuery] = useState('');
  const [devSearchExplanation, setDevSearchExplanation] = useState('');
  const [selectedDev, setSelectedDev] = useState(null);

  // Solution Knowledge Search State
  const [ragQuery, setRagQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResults, setRagResults] = useState([]);
  const [hasSearchedRag, setHasSearchedRag] = useState(false);

  // Fetch Developer Dashboard Data
  const fetchDevDashboard = async () => {
    setDevDashboardLoading(true);
    try {
      const res = await aiService.getDeveloperDashboard();
      setDevelopers(res.developers || []);
      setDashboardSummary(res.summary || null);
    } catch (err) {
      console.error('Failed to fetch developer dashboard:', err);
    } finally {
      setDevDashboardLoading(false);
    }
  };

  // Search Developer Query
  const handleDevQuerySearch = async (queryToSearch = null) => {
    const q = queryToSearch !== null ? queryToSearch : devSearchQuery;
    if (!q.trim()) {
      fetchDevDashboard();
      setDevSearchExplanation('');
      return;
    }
    setDevDashboardLoading(true);
    try {
      const res = await aiService.searchDeveloperQuery(q);
      setDevSearchExplanation(res.explanation || '');
      if (res.developers) {
        const idSet = new Set(res.developers.map((d) => d.id));
        setDevelopers((prev) => {
          const matched = prev.filter((d) => idSet.has(d.user_id));
          return matched.length > 0 ? matched : prev;
        });
      }
    } catch (err) {
      console.error('Failed developer search query:', err);
    } finally {
      setDevDashboardLoading(false);
    }
  };

  // Fetch Solution RAG Knowledge
  const fetchSolutionKnowledge = async (searchQuery = '', category = null) => {
    setRagLoading(true);
    try {
      const catParam = category === 'All' ? null : category;
      const res = await aiService.knowledgeSearch(searchQuery, catParam);
      setRagResults(res.results || []);
    } catch (err) {
      console.error('Failed to search knowledge base:', err);
      setRagResults([]);
    } fontFinally: {
      setRagLoading(false);
      setHasSearchedRag(true);
    }
  };

  useEffect(() => {
    fetchDevDashboard();
    fetchSolutionKnowledge('', 'All');
  }, []);

  const handleRagSearch = (e) => {
    e.preventDefault();
    fetchSolutionKnowledge(ragQuery, selectedCategory);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    fetchSolutionKnowledge(ragQuery, category);
  };

  const getWorkloadBadge = (openWorkload, isOverloaded) => {
    if (isOverloaded) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-red-950/80 text-red-300 border border-red-800/60 font-bold flex items-center gap-1 w-max">
          <AlertTriangle className="w-3 h-3 text-red-400" /> Overloaded ({openWorkload})
        </span>
      );
    }
    if (openWorkload >= 3) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold flex items-center gap-1 w-max">
          <Activity className="w-3 h-3 text-amber-400" /> Moderate ({openWorkload})
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold flex items-center gap-1 w-max">
        <Check className="w-3 h-3 text-emerald-400" /> Optimal ({openWorkload})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-black text-slate-100">Developer Knowledge & Workload Hub</h2>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-0.5 rounded border border-indigo-500/30">
                Team Intelligence & RAG
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Real-time developer capacity, active workload analytics, domain expertise profiles, and historical resolution vector search.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('dev_dashboard')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'dev_dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" /> Developer Workload Dashboard
            </button>
            <button
              onClick={() => setActiveTab('solution_rag')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'solution_rag'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" /> RAG Solutions Knowledge Base
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: DEVELOPER WORKLOAD & TEAM KNOWLEDGE DASHBOARD */}
      {activeTab === 'dev_dashboard' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          {dashboardSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="p-4 bg-slate-900/80 border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Developers</span>
                  <span className="text-2xl font-black text-slate-100">{dashboardSummary.total_developers}</span>
                </div>
                <div className="p-3 bg-indigo-950/80 rounded-xl text-indigo-400 border border-indigo-800/40">
                  <Users className="w-6 h-6" />
                </div>
              </Card>

              <Card className="p-4 bg-slate-900/80 border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Active Open Workload</span>
                  <span className="text-2xl font-black text-amber-400">{dashboardSummary.total_open_workload}</span>
                </div>
                <div className="p-3 bg-amber-950/80 rounded-xl text-amber-400 border border-amber-800/40">
                  <Activity className="w-6 h-6" />
                </div>
              </Card>

              <Card className="p-4 bg-slate-900/80 border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Completed Defects</span>
                  <span className="text-2xl font-black text-emerald-400">{dashboardSummary.total_completed_defects}</span>
                </div>
                <div className="p-3 bg-emerald-950/80 rounded-xl text-emerald-400 border border-emerald-800/40">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </Card>

              <Card className="p-4 bg-slate-900/80 border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Overloaded Developers</span>
                  <span className="text-2xl font-black text-red-400">{dashboardSummary.overloaded_developers_count}</span>
                </div>
                <div className="p-3 bg-red-950/80 rounded-xl text-red-400 border border-red-800/40">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              </Card>
            </div>
          )}

          {/* Natural Language Developer Search Bar */}
          <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" /> Natural Language Developer Query Assistant
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={devSearchQuery}
                  onChange={(e) => setDevSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDevQuerySearch()}
                  placeholder="e.g. Who is currently overloaded? or Who has resolved payment defects?"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 text-slate-100 text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none"
                />
              </div>
              <Button
                variant="primary"
                onClick={() => handleDevQuerySearch()}
                isLoading={devDashboardLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 text-xs font-bold flex items-center gap-2"
              >
                <Search className="w-4 h-4" /> Query Developers
              </Button>
              {devSearchQuery && (
                <Button variant="outline" size="sm" onClick={() => { setDevSearchQuery(''); fetchDevDashboard(); setDevSearchExplanation(''); }}>
                  Reset
                </Button>
              )}
            </div>

            {/* Quick Query Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Suggested:</span>
              {DEV_QUICK_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => { setDevSearchQuery(q); handleDevQuerySearch(q); }}
                  className="text-[11px] bg-slate-950 hover:bg-indigo-950/80 hover:border-indigo-700/60 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-full transition-all"
                >
                  {q}
                </button>
              ))}
            </div>

            {devSearchExplanation && (
              <p className="text-xs text-indigo-300 bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-800/40">
                🔍 {devSearchExplanation}
              </p>
            )}
          </Card>

          {/* Developer Workload Matrix Table */}
          <Card className="p-0 bg-slate-900/80 border-slate-800 overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" /> Developer Capacity & Real DB Workload Matrix
              </h3>
              <span className="text-xs text-slate-400">Click any developer row to view detailed profile & active defect queue</span>
            </div>

            {devDashboardLoading ? (
              <div className="py-12 text-center">
                <Spinner size="lg" />
              </div>
            ) : developers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No developer statistics found matching query.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Developer</th>
                      <th className="p-3.5">Role & Dept</th>
                      <th className="p-3.5">Assigned</th>
                      <th className="p-3.5">In Progress</th>
                      <th className="p-3.5">In Review</th>
                      <th className="p-3.5">Resolved</th>
                      <th className="p-3.5">Completed</th>
                      <th className="p-3.5">Completion Rate</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {developers.map((dev) => (
                      <tr
                        key={dev.user_id}
                        onClick={() => setSelectedDev(dev)}
                        className="hover:bg-indigo-950/30 transition-all cursor-pointer group"
                      >
                        <td className="p-3.5 font-bold flex items-center gap-2.5">
                          <img
                            src={dev.avatar_url}
                            alt={dev.full_name}
                            className="w-8 h-8 rounded-full border border-slate-700 bg-slate-950"
                          />
                          <div>
                            <span className="text-slate-100 group-hover:text-indigo-300 block">{dev.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">@{dev.username}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="text-slate-300 font-medium block">{dev.role}</span>
                          <span className="text-[10px] text-slate-500">{dev.department}</span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-200">{dev.assigned_count}</td>
                        <td className="p-3.5 font-bold text-amber-400">{dev.in_progress_count}</td>
                        <td className="p-3.5 font-bold text-indigo-400">{dev.in_review_count}</td>
                        <td className="p-3.5 font-bold text-emerald-400">{dev.resolved_count}</td>
                        <td className="p-3.5 font-bold text-purple-400">{dev.completed_count}</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(dev.completion_rate, 100)}%` }}
                              />
                            </div>
                            <span className="font-semibold text-[11px]">{dev.completion_rate}%</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {getWorkloadBadge(dev.open_workload, dev.is_overloaded)}
                        </td>
                        <td className="p-3.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setSelectedDev(dev); }}
                            className="text-[11px] border-slate-700 text-indigo-300 hover:bg-indigo-950/50"
                          >
                            View Profile
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: RAG SOLUTION KNOWLEDGE SEARCH */}
      {activeTab === 'solution_rag' && (
        <div className="space-y-6">
          <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-4">
            <form onSubmit={handleRagSearch} className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="e.g. How to fix memory leak in background worker or JWT token refresh issue..."
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 text-slate-100 placeholder-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={ragLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {ragLoading ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                Search Vector RAG
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3" /> Category Filter:
              </span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`text-xs font-medium px-3 py-1 rounded-lg transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Card>

          {ragLoading ? (
            <div className="py-12 text-center">
              <Spinner size="lg" />
            </div>
          ) : ragResults.length === 0 ? (
            <Card className="p-12 text-center bg-slate-900/50 border-slate-800">
              <Search className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <h4 className="text-base font-bold text-slate-300">No Historical Vector Solutions Found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {hasSearchedRag ? 'Try broadening your search query.' : 'Search resolved defect solutions from real database records.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {ragResults.map((item) => (
                <Card key={item.id} className="p-5 bg-slate-900/80 border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                        {item.issue_key}
                      </span>
                      <h4 className="text-base font-bold text-slate-100">{item.title}</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/issues/${item.id}`)}
                      className="text-xs flex items-center gap-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      View Issue <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {item.root_cause && (
                    <div className="text-xs bg-amber-950/20 border border-amber-800/30 p-3 rounded-lg text-amber-200">
                      <span className="font-bold block mb-1">Identified Root Cause:</span>
                      {item.root_cause}
                    </div>
                  )}

                  {item.suggested_fix && (
                    <div className="text-xs bg-emerald-950/20 border border-emerald-800/30 p-3 rounded-lg text-emerald-200">
                      <span className="font-bold block mb-1">Verified Fix:</span>
                      {item.suggested_fix}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAILED DEVELOPER PROFILE MODAL */}
      {selectedDev && (
        <Modal
          isOpen={Boolean(selectedDev)}
          onClose={() => setSelectedDev(null)}
          title={`Developer Knowledge Profile: ${selectedDev.full_name}`}
          size="xl"
        >
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header info */}
            <div className="flex items-start justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={selectedDev.avatar_url}
                  alt={selectedDev.full_name}
                  className="w-12 h-12 rounded-full border border-indigo-500/40 bg-slate-900"
                />
                <div>
                  <h4 className="text-base font-bold text-slate-100">{selectedDev.full_name}</h4>
                  <p className="text-xs text-slate-400">@{selectedDev.username} • {selectedDev.role} ({selectedDev.department})</p>
                  <p className="text-xs text-indigo-400 mt-0.5">{selectedDev.email}</p>
                </div>
              </div>
              {getWorkloadBadge(selectedDev.open_workload, selectedDev.is_overloaded)}
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned</span>
                <span className="text-lg font-black text-slate-100">{selectedDev.assigned_count}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">In Progress</span>
                <span className="text-lg font-black text-amber-400">{selectedDev.in_progress_count}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Resolved</span>
                <span className="text-lg font-black text-emerald-400">{selectedDev.resolved_count}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Completion Rate</span>
                <span className="text-lg font-black text-purple-400">{selectedDev.completion_rate}%</span>
              </div>
            </div>

            {/* Skills & Experience Profile */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <h5 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-indigo-400" /> Declared Technical Skills
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {selectedDev.skill_profile && selectedDev.skill_profile.primary_languages && selectedDev.skill_profile.primary_languages.length > 0 ? (
                  selectedDev.skill_profile.primary_languages.map((s, idx) => (
                    <span key={idx} className="bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic">No specific languages registered.</span>
                )}
              </div>
            </div>

            {/* Active Assigned Defects */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> Active Defect Queue ({selectedDev.active_defects?.length || 0})
              </h5>
              {selectedDev.active_defects && selectedDev.active_defects.length > 0 ? (
                <div className="space-y-2">
                  {selectedDev.active_defects.map((def) => (
                    <div
                      key={def.id}
                      onClick={() => { setSelectedDev(null); navigate(`/issues/${def.id}`); }}
                      className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-400">{def.issue_key}</span>
                          <span className="text-slate-200 font-bold">{def.title}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Category: {def.category} • Severity: {def.severity}</p>
                      </div>
                      <Badge variant="secondary" size="sm">{def.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-500 text-center">
                  No active defects currently assigned to queue.
                </div>
              )}
            </div>

            {/* Completed & Resolved Historical Defects */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed & Resolved Defects ({selectedDev.resolved_defects?.length || 0})
              </h5>
              {selectedDev.resolved_defects && selectedDev.resolved_defects.length > 0 ? (
                <div className="space-y-2">
                  {selectedDev.resolved_defects.map((def) => (
                    <div
                      key={def.id}
                      onClick={() => { setSelectedDev(null); navigate(`/issues/${def.id}`); }}
                      className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-400">{def.issue_key}: {def.title}</span>
                        <Badge variant="success" size="sm">{def.status}</Badge>
                      </div>
                      {def.root_cause && <p className="text-[10px] text-slate-400">Root Cause: {def.root_cause}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-500 text-center">
                  No completed defects logged in history yet.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default KnowledgeBasePage;
