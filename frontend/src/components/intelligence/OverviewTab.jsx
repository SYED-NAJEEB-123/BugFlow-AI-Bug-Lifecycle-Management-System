import React from 'react';
import { Card } from '../common/Card';
import { 
  Users, Activity, CheckCircle2, ShieldAlert, AlertTriangle, 
  BarChart2, Award, Zap, TrendingUp, RefreshCw
} from 'lucide-react';

export const OverviewTab = ({ summary, developers, onRefresh }) => {
  const safeSummary = summary || {};
  const safeDevs = Array.isArray(developers) ? developers : [];

  const totalDevs = safeSummary.total_developers || safeDevs.length || 0;
  const activeWorkload = safeSummary.total_open_workload || 0;
  const completedCount = safeSummary.total_completed_defects || 0;
  const overloadedCount = safeSummary.overloaded_developers_count || 0;

  // Calculate average workload per developer
  const avgWorkload = totalDevs > 0 ? (activeWorkload / totalDevs).toFixed(1) : 0;

  // Count high/critical defects across developers
  const highCritCount = safeDevs.reduce((acc, d) => acc + (d?.high_critical_workload || 0), 0);

  // Compute average completion rate
  const totalAssignedAll = safeDevs.reduce((acc, d) => acc + (d?.total_assigned || 0), 0);
  const avgCompletionRate = totalAssignedAll > 0 
    ? ((completedCount / totalAssignedAll) * 100).toFixed(1)
    : 0;

  // Calculate overall load balance score (0% to 100%)
  const loadBalanceScore = Math.max(100 - (overloadedCount * 25), 40);

  return (
    <div className="space-y-6">
      {/* 8 Real-Time KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Developers */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Developers</span>
            <span className="text-2xl font-black text-slate-100">{totalDevs}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Active Workspace Engineers</span>
          </div>
          <div className="p-3 bg-indigo-950/80 rounded-xl text-indigo-400 border border-indigo-800/40">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        {/* Card 2: Total Active Defects */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Active Defects</span>
            <span className="text-2xl font-black text-amber-400">{activeWorkload}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Assigned & In-Progress</span>
          </div>
          <div className="p-3 bg-amber-950/80 rounded-xl text-amber-400 border border-amber-800/40">
            <Activity className="w-6 h-6" />
          </div>
        </Card>

        {/* Card 3: Average Developer Workload */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Avg Developer Workload</span>
            <span className="text-2xl font-black text-indigo-400">{avgWorkload} <span className="text-xs text-slate-400">bugs/dev</span></span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Defects per Engineer</span>
          </div>
          <div className="p-3 bg-indigo-950/80 rounded-xl text-indigo-400 border border-indigo-800/40">
            <BarChart2 className="w-6 h-6" />
          </div>
        </Card>

        {/* Card 4: Developers Overloaded */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Developers Overloaded</span>
            <span className={`text-2xl font-black ${overloadedCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{overloadedCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">&gt;5 active or heavy high/crit</span>
          </div>
          <div className={`p-3 rounded-xl border ${overloadedCount > 0 ? 'bg-rose-950/80 text-rose-400 border-rose-800/40' : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40'}`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
        </Card>

        {/* Card 5: High/Critical Defects */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">High/Critical Defects</span>
            <span className="text-2xl font-black text-rose-400">{highCritCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">High Priority Capacity Impact</span>
          </div>
          <div className="p-3 bg-rose-950/80 rounded-xl text-rose-400 border border-rose-800/40">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </Card>

        {/* Card 6: Overall Load Balance Score */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Load Balance Health</span>
            <span className="text-2xl font-black text-emerald-400">{loadBalanceScore}%</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Team Distribution Rating</span>
          </div>
          <div className="p-3 bg-emerald-950/80 rounded-xl text-emerald-400 border border-emerald-800/40">
            <Award className="w-6 h-6" />
          </div>
        </Card>

        {/* Card 7: Defects Resolved */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Defects Resolved</span>
            <span className="text-2xl font-black text-emerald-400">{completedCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Resolved, Verified, Closed</span>
          </div>
          <div className="p-3 bg-emerald-950/80 rounded-xl text-emerald-400 border border-emerald-800/40">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </Card>

        {/* Card 8: Average Completion Rate */}
        <Card className="p-4 bg-slate-900/90 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Avg Completion Rate</span>
            <span className="text-2xl font-black text-cyan-400">{avgCompletionRate}%</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Historical Resolution Rate</span>
          </div>
          <div className="p-3 bg-cyan-950/80 rounded-xl text-cyan-400 border border-cyan-800/40">
            <TrendingUp className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Workforce Summary Banner & Developer List Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            Developer Capacity & Active Workload Matrix
          </h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync Real-Time Database Metrics
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {safeDevs.map((dev) => (
            <div key={dev.user_id || dev.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-xs">
                    {dev.full_name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{dev.full_name}</h4>
                    <span className="text-[10px] text-slate-400">{dev.role}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                  dev.is_overloaded ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {dev.is_overloaded ? 'OVERLOADED' : 'HEALTHY'}
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-slate-300 border-t border-slate-800/80 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Open Workload:</span>
                  <strong className="text-amber-400">{dev.open_workload} active</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Completed Defects:</span>
                  <strong className="text-emerald-400">{dev.completed_count} defects</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Completion Rate:</span>
                  <strong className="text-slate-200">{dev.completion_rate}%</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
