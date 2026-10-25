import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { projectService } from '../../services/projectService';
import { sprintService } from '../../services/sprintService';
import { OverviewTab } from '../../components/intelligence/OverviewTab';
import { WorkloadTab } from '../../components/intelligence/WorkloadTab';
import { AllocationTab } from '../../components/intelligence/AllocationTab';
import { SkillsExperienceTab } from '../../components/intelligence/SkillsExperienceTab';
import { LoadBalancerTab } from '../../components/intelligence/LoadBalancerTab';
import { ImpactAnalysisTab } from '../../components/intelligence/ImpactAnalysisTab';
import { 
  Cpu, Users, BarChart2, Brain, Zap, AlertTriangle, 
  RefreshCw, Filter, Layers, Award, Sparkles, CheckCircle2, ShieldAlert 
} from 'lucide-react';

export const DeveloperIntelligencePage = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'workload' | 'allocation' | 'skills' | 'balancer' | 'impact'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [developers, setDevelopers] = useState([]);
  const [summary, setSummary] = useState({});

  // Filters State
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [filterProject, setFilterProject] = useState('');
  const [filterSprint, setFilterSprint] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterWorkloadStatus, setFilterWorkloadStatus] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [devRes, projRes, sprintRes] = await Promise.allSettled([
        aiService.getDeveloperDashboard(),
        projectService.getProjects(),
        sprintService.getSprints()
      ]);

      if (devRes.status === 'fulfilled' && devRes.value) {
        setDevelopers(devRes.value.developers || []);
        setSummary(devRes.value.summary || {});
      } else {
        console.warn('Developer dashboard fetch rejected or returned empty:', devRes.reason);
        setDevelopers([]);
        setSummary({});
      }

      if (projRes.status === 'fulfilled' && projRes.value) {
        setProjects(projRes.value.projects || []);
      }
      if (sprintRes.status === 'fulfilled' && sprintRes.value) {
        setSprints(sprintRes.value.sprints || []);
      }
    } catch (err) {
      console.error('Failed to load developer intelligence data:', err);
      setError('Unable to load developer intelligence data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter developers based on toolbar selection
  const safeDevelopers = Array.isArray(developers) ? developers : [];
  const filteredDevelopers = safeDevelopers.filter(dev => {
    if (!dev) return false;
    if (filterWorkloadStatus !== 'ALL') {
      const status = dev.workload_status || (dev.is_overloaded ? 'OVERLOADED' : (dev.open_workload <= 2 ? 'LOW' : dev.open_workload <= 4 ? 'MEDIUM' : 'HIGH'));
      if (status !== filterWorkloadStatus) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Title Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-950 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 shadow-md">
                <Cpu className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2">
                  Developer Intelligence
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    AI Capacity & Allocation Hub
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  AI-powered developer workload, allocation and impact intelligence
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              Refresh Database Analytics
            </button>
          </div>
        </div>

        {/* Global Toolbar Filters */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Filter Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500"
            >
              <option value="">All Active Projects</option>
              {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.key})</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Filter Sprint</label>
            <select
              value={filterSprint}
              onChange={(e) => setFilterSprint(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500"
            >
              <option value="">All Active Sprints</option>
              {(sprints || []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Filter Severity Impact</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical Only</option>
              <option value="High">High & Critical</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Workload Capacity</label>
            <select
              value={filterWorkloadStatus}
              onChange={(e) => setFilterWorkloadStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="LOW">LOW Load</option>
              <option value="MEDIUM">MEDIUM Load</option>
              <option value="HIGH">HIGH Load</option>
              <option value="OVERLOADED">OVERLOADED Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs Toolbar */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> 1. Overview
        </button>

        <button
          onClick={() => setActiveTab('workload')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'workload'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> 2. Workload
        </button>

        <button
          onClick={() => setActiveTab('allocation')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'allocation'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Brain className="w-4 h-4" /> 3. Allocation
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'skills'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Award className="w-4 h-4" /> 4. Skills & Experience
        </button>

        <button
          onClick={() => setActiveTab('balancer')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'balancer'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Zap className="w-4 h-4" /> 5. Load Balancer
        </button>

        <button
          onClick={() => setActiveTab('impact')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'impact'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> 6. Impact Analysis
        </button>
      </div>

      {/* Loading Indicator Banner */}
      {loading && (
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-200 text-xs flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Loading developer intelligence...</span>
        </div>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold transition-all border border-rose-500/40"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State Banner */}
      {!loading && !error && safeDevelopers.length === 0 && (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <Users className="w-8 h-8 text-slate-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-200">No developer workload data available yet.</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Once users with Developer roles are assigned defects in active projects, real-time workload analytics and allocation intelligence will appear here.
          </p>
        </div>
      )}

      {/* Tab Content Panels */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab summary={summary} developers={filteredDevelopers} onRefresh={fetchData} />
        )}
        {activeTab === 'workload' && (
          <WorkloadTab developers={filteredDevelopers} />
        )}
        {activeTab === 'allocation' && (
          <AllocationTab onDefectAssigned={fetchData} />
        )}
        {activeTab === 'skills' && (
          <SkillsExperienceTab developers={filteredDevelopers} onSkillsUpdated={fetchData} />
        )}
        {activeTab === 'balancer' && (
          <LoadBalancerTab developers={filteredDevelopers} onDefectAssigned={fetchData} />
        )}
        {activeTab === 'impact' && (
          <ImpactAnalysisTab />
        )}
      </div>
    </div>
  );
};
