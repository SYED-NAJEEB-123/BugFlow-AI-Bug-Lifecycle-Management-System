import React, { useState } from 'react';
import { aiService } from '../../services/aiService';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { 
  BarChart2, ShieldAlert, ArrowRight, CheckCircle2, 
  AlertTriangle, Cpu, Activity, RefreshCw, Zap 
} from 'lucide-react';

export const LoadBalancerTab = ({ developers, onDefectAssigned }) => {
  const safeDevs = Array.isArray(developers) ? developers : [];
  const [selectedDevId, setSelectedDevId] = useState(safeDevs[0]?.user_id || safeDevs[0]?.id || '');
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [defectTitle, setDefectTitle] = useState('Payment API Failure on High Load');
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');

  const runSimulation = async (devIdToSimulate = null) => {
    const devId = devIdToSimulate || selectedDevId;
    if (!devId) return;
    setLoading(true);
    try {
      const res = await aiService.whatIfAssignment({
        title: defectTitle,
        category: 'Payment',
        severity: 'High',
        priority: 'High'
      }, Number(devId));
      setSimulation(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const targetDev = safeDevs.find(d => d && Number(d.user_id || d.id) === Number(selectedDevId)) || safeDevs[0];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'LOW': return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">LOW</span>;
      case 'MEDIUM': return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">MEDIUM</span>;
      case 'HIGH': return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">HIGH</span>;
      case 'OVERLOADED': return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">OVERLOADED</span>;
      default: return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Load Balancer Conceptual Pipeline Flowchart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-400" />
          Developer Load Balancing Pipeline Architecture
        </h3>
        <p className="text-xs text-slate-400">
          The load balancer balances Technical Expertise against Current Workload Capacity to prevent assigning every defect to the top specialist.
        </p>

        <div className="overflow-x-auto py-2">
          <div className="min-w-[680px] flex items-center justify-between gap-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">1. Defect Ingestion</span>
              <strong className="text-slate-200">Category & Severity</strong>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex-1">
              <span className="text-[10px] uppercase font-bold text-indigo-400 block">2. Candidate Scoring</span>
              <strong className="text-indigo-300">Skill Match (35%)</strong>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex-1">
              <span className="text-[10px] uppercase font-bold text-cyan-400 block">3. Historical Match</span>
              <strong className="text-cyan-300">Resolutions (20%)</strong>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex-1">
              <span className="text-[10px] uppercase font-bold text-rose-400 block">4. Workload Penalty</span>
              <strong className="text-rose-300">Capacity Deductions</strong>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 flex-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">5. Final Selection</span>
              <strong className="text-emerald-300">Optimal Allocation</strong>
            </div>
          </div>
        </div>
      </div>

      {/* BEFORE vs AFTER Load Balancing Visual Highlight */}
      <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              BEFORE vs AFTER Load Balancing Visual Comparison
            </h3>
            <p className="text-xs text-slate-400">Simulates team-wide workload distribution changes before committing assignment</p>
          </div>

          <div className="w-full sm:w-64">
            <Select
              label="Target Developer for Simulation"
              value={selectedDevId}
              onChange={(e) => {
                setSelectedDevId(e.target.value);
                runSimulation(e.target.value);
              }}
              options={safeDevs.map(d => ({ label: `${d.full_name} (${d.open_workload} bugs)`, value: d.user_id || d.id }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* BEFORE Section */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
              BEFORE Assignment
            </span>
            <div className="space-y-2">
              {safeDevs.map(d => {
                const pct = Math.min(d.workload_percentage || (d.open_workload * 20), 100);
                return (
                  <div key={d.user_id || d.id} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300 font-semibold">
                      <span>{d.full_name}</span>
                      <span>{pct}% ({d.open_workload} bugs)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AFTER Section */}
          <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/40 space-y-3">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
              AFTER Simulated Assignment (+1 Defect)
            </span>
            <div className="space-y-2">
              {safeDevs.map(d => {
                const isTarget = Number(d.user_id || d.id) === Number(selectedDevId);
                const openCnt = d.open_workload + (isTarget ? 1 : 0);
                const pct = Math.min(openCnt * 20, 100);
                return (
                  <div key={d.user_id || d.id} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300 font-semibold">
                      <span className={isTarget ? 'text-indigo-300 font-bold' : ''}>
                        {d.full_name} {isTarget && '(+1 Defect)'}
                      </span>
                      <span className={isTarget ? 'text-indigo-300 font-bold' : ''}>{pct}% ({openCnt} bugs)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isTarget ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 animate-pulse' : 'bg-indigo-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
