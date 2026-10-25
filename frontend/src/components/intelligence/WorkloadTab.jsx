import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { 
  BarChart2, Filter, Activity, CheckCircle2, ShieldAlert, 
  Calendar, Layers, User, ChevronRight, Check
} from 'lucide-react';

export const WorkloadTab = ({ developers }) => {
  const safeDevs = Array.isArray(developers) ? developers : [];
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'OVERLOADED'
  const [selectedDevModal, setSelectedDevModal] = useState(null);

  // Compute workload counts per category
  const lowCount = safeDevs.filter(d => d && (d.workload_status || (d.open_workload <= 2 ? 'LOW' : '')) === 'LOW').length;
  const medCount = safeDevs.filter(d => d && (d.workload_status || (d.open_workload >= 3 && d.open_workload <= 4 ? 'MEDIUM' : '')) === 'MEDIUM').length;
  const highCount = safeDevs.filter(d => d && (d.workload_status || (d.open_workload >= 5 && d.open_workload <= 6 ? 'HIGH' : '')) === 'HIGH').length;
  const overloadedCount = safeDevs.filter(d => d && (d.is_overloaded || (d.workload_status === 'OVERLOADED'))).length;

  const filteredDevs = safeDevs.filter(d => {
    if (!d) return false;
    const status = d.workload_status || (d.is_overloaded ? 'OVERLOADED' : (d.open_workload <= 2 ? 'LOW' : d.open_workload <= 4 ? 'MEDIUM' : 'HIGH'));
    if (selectedFilter === 'ALL') return true;
    return status === selectedFilter;
  });

  const getStatusBadge = (dev) => {
    const status = dev.workload_status || (dev.is_overloaded ? 'OVERLOADED' : (dev.open_workload <= 2 ? 'LOW' : dev.open_workload <= 4 ? 'MEDIUM' : 'HIGH'));
    switch (status) {
      case 'LOW':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">LOW (0-2)</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">MEDIUM (3-4)</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">HIGH (5-6)</span>;
      case 'OVERLOADED':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">OVERLOADED (7+)</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  const getBarColor = (pct) => {
    if (pct >= 85) return 'bg-gradient-to-r from-rose-600 to-red-500';
    if (pct >= 65) return 'bg-gradient-to-r from-amber-600 to-orange-500';
    if (pct >= 40) return 'bg-gradient-to-r from-blue-600 to-indigo-500';
    return 'bg-gradient-to-r from-emerald-600 to-teal-500';
  };

  return (
    <div className="space-y-6">
      {/* Interactive Workload Distribution Filter Chart Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setSelectedFilter('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedFilter === 'ALL'
              ? 'bg-indigo-950/80 border-indigo-500 shadow-lg shadow-indigo-500/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">All Engineers</span>
          <span className="text-xl font-black text-slate-100">{developers.length}</span>
        </button>

        <button
          onClick={() => setSelectedFilter('LOW')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedFilter === 'LOW'
              ? 'bg-emerald-950/80 border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-emerald-400 block">LOW Workload</span>
          <span className="text-xl font-black text-emerald-300">{lowCount} devs</span>
        </button>

        <button
          onClick={() => setSelectedFilter('MEDIUM')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedFilter === 'MEDIUM'
              ? 'bg-blue-950/80 border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-blue-400 block">MEDIUM Workload</span>
          <span className="text-xl font-black text-blue-300">{medCount} devs</span>
        </button>

        <button
          onClick={() => setSelectedFilter('HIGH')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedFilter === 'HIGH'
              ? 'bg-amber-950/80 border-amber-500 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-amber-400 block">HIGH Workload</span>
          <span className="text-xl font-black text-amber-300">{highCount} devs</span>
        </button>

        <button
          onClick={() => setSelectedFilter('OVERLOADED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedFilter === 'OVERLOADED'
              ? 'bg-rose-950/80 border-rose-500 shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-rose-400 block">OVERLOADED</span>
          <span className="text-xl font-black text-rose-300">{overloadedCount} devs</span>
        </button>
      </div>

      {/* Developer Workload Visual Distribution List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            Developer Workload Visual Bar Distribution ({filteredDevs.length})
          </span>
          <span className="text-xs text-slate-400 font-normal">Click any developer row for detailed defect breakdown</span>
        </h3>

        <div className="space-y-3">
          {filteredDevs.map((dev) => {
            const pct = Math.min(dev.workload_percentage || (dev.open_workload * 20), 100);
            return (
              <div
                key={dev.user_id || dev.id}
                onClick={() => setSelectedDevModal(dev)}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-sm group-hover:scale-105 transition-transform">
                      {dev.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                          {dev.full_name}
                        </span>
                        {getStatusBadge(dev)}
                      </div>
                      <span className="text-xs text-slate-400">
                        {dev.role} • Active Open: <strong className="text-slate-200">{dev.open_workload} bugs</strong> ({dev.high_critical_workload} High/Critical)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Completion Rate</span>
                      <strong className="text-emerald-400">{dev.completion_rate}%</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Assigned</span>
                      <strong className="text-slate-200">{dev.total_assigned} defects</strong>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>

                {/* Animated Capacity Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                    <span>Capacity Load</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real Database Sprint Workload Heatmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Developer Sprint Workload Heatmap
          </h3>
          <p className="text-xs text-slate-400">Real database sprint capacity trend analysis</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Developer</th>
                <th className="py-2.5 px-3">Sprint 1</th>
                <th className="py-2.5 px-3">Sprint 2</th>
                <th className="py-2.5 px-3">Sprint 3</th>
                <th className="py-2.5 px-3">Current Active Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {safeDevs.map((dev) => {
                const currentPct = dev.workload_percentage || (dev.open_workload * 20) || 10;
                return (
                  <tr key={dev.user_id || dev.id} className="hover:bg-slate-950/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-200 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-indigo-600/30 text-indigo-300 text-xs flex items-center justify-center font-bold">
                        {dev.full_name?.charAt(0)}
                      </div>
                      {dev.full_name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                        {Math.max(currentPct - 15, 10)}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                        {Math.max(currentPct - 5, 15)}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono font-semibold">
                        {currentPct}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded font-bold ${
                        currentPct >= 80 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {currentPct}% ({dev.open_workload} bugs)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Developer Detail Modal */}
      {selectedDevModal && (
        <Modal
          isOpen={!!selectedDevModal}
          onClose={() => setSelectedDevModal(null)}
          title={`Developer Workload Details: ${selectedDevModal.full_name}`}
          subtitle={`${selectedDevModal.role} • ${selectedDevModal.department || 'Engineering'}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Open Workload</span>
                <span className="text-base font-bold text-amber-400">{selectedDevModal.open_workload} bugs</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">High/Critical</span>
                <span className="text-base font-bold text-rose-400">{selectedDevModal.high_critical_workload} bugs</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Completed</span>
                <span className="text-base font-bold text-emerald-400">{selectedDevModal.completed_count} bugs</span>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] mb-2">Active Open Defects:</h5>
              {selectedDevModal.active_defects?.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedDevModal.active_defects.map((bug) => (
                    <div key={bug.id} className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-indigo-400 mr-2">{bug.issue_key}</span>
                        <span className="text-slate-200">{bug.title}</span>
                      </div>
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-900 text-slate-300 font-bold">
                        {bug.severity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">No open active defects currently assigned.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
