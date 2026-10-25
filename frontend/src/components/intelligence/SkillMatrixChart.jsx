import React, { useState } from 'react';
import { Star, User, Activity, CheckCircle2, ShieldAlert, Award } from 'lucide-react';

export const SkillMatrixChart = ({ developers }) => {
  const safeDevs = Array.isArray(developers) ? developers : [];
  const [selectedDev, setSelectedDev] = useState(null);

  const getCoordinates = (dev) => {
    if (!dev) return { x: 50, y: 50, skillScore: 50 };
    // X axis: Workload percentage (0% to 100%) mapped to 10% - 90% plot width
    const x = Math.min(Math.max(dev.workload_percentage || ((dev.open_workload || 0) * 20) || 10, 5), 95);

    // Y axis: Skill & Experience score (0% to 100%) mapped to 10% - 90% plot height (inverted SVG Y)
    const rating = dev.skill_profile?.experience_rating || 3;
    const skillScore = Math.min(rating * 20, 100);
    const y = 100 - Math.min(Math.max(skillScore, 10), 90);

    return { x, y, skillScore };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OVERLOADED': return 'bg-rose-500 border-rose-400 text-white shadow-rose-500/50';
      case 'HIGH': return 'bg-amber-500 border-amber-400 text-slate-950 shadow-amber-500/50';
      case 'MEDIUM': return 'bg-blue-500 border-blue-400 text-white shadow-blue-500/50';
      default: return 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/50';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-400" />
            Skill × Workload Capacity Matrix
          </h3>
          <p className="text-xs text-slate-400">
            Interactive 4-quadrant scatter plot balancing Technical Expertise vs Current Capacity
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-300">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Low Load</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Medium</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> High</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Overloaded</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Matrix Canvas Container */}
        <div className="lg:col-span-2 relative h-[360px] bg-slate-950 border border-slate-800/90 rounded-xl p-4 overflow-hidden select-none">
          {/* Quadrant Axes Labels */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-slate-400 tracking-widest bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            HIGH SKILL / SPECIALIST
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-slate-400 tracking-widest bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            ENTRY / GENERALIST
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] uppercase font-bold text-slate-400 tracking-widest bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            LOW WORKLOAD
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[10px] uppercase font-bold text-slate-400 tracking-widest bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            HIGH WORKLOAD
          </div>

          {/* Quadrant Divider Grid Lines */}
          <div className="absolute inset-x-8 top-1/2 border-b border-dashed border-slate-800/80" />
          <div className="absolute inset-y-8 left-1/2 border-r border-dashed border-slate-800/80" />

          {/* Quadrant Labels */}
          <div className="absolute top-6 left-10 text-[10px] font-bold text-emerald-400/50 uppercase">⭐ Prime Target (High Skill, Low Workload)</div>
          <div className="absolute top-6 right-10 text-[10px] font-bold text-rose-400/50 uppercase">🔴 Overload Risk (High Skill, High Load)</div>
          <div className="absolute bottom-6 left-10 text-[10px] font-bold text-blue-400/50 uppercase">🟢 Available Capacity (Low Skill, Low Load)</div>
          <div className="absolute bottom-6 right-10 text-[10px] font-bold text-amber-400/50 uppercase">🟡 Capacity Strained (Low Skill, High Load)</div>

          {/* Plot Developer Nodes */}
          {safeDevs.map((dev) => {
            const { x, y, skillScore } = getCoordinates(dev);
            const isSelected = selectedDev?.user_id === dev.user_id || selectedDev?.id === dev.id;

            return (
              <button
                key={dev.user_id || dev.id}
                onClick={() => setSelectedDev(dev)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-200 z-10`}
                title={`${dev.full_name}: Workload ${dev.open_workload || 0}, Skill Rating ${skillScore}%`}
              >
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg transition-transform ${getStatusColor(dev.workload_status)} ${isSelected ? 'scale-125 ring-4 ring-indigo-400' : 'group-hover:scale-110'}`}>
                  <span className="text-xs font-bold">{dev.full_name?.charAt(0) || 'D'}</span>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-9 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold text-slate-200 whitespace-nowrap opacity-90 group-hover:opacity-100 shadow-md">
                  {dev.full_name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Developer Card */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3">
          {selectedDev ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-lg">
                  {selectedDev.full_name?.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{selectedDev.full_name}</h4>
                  <span className="text-xs text-slate-400">{selectedDev.role} • {selectedDev.department}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Active Workload:</span>
                  <strong className="text-slate-100">{selectedDev.open_workload} defects</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Workload Percentage:</span>
                  <strong className="text-slate-100">{selectedDev.workload_percentage}%</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Workload Status:</span>
                  <strong className="text-indigo-400">{selectedDev.workload_status || (selectedDev.is_overloaded ? 'OVERLOADED' : 'OPTIMAL')}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Skill Experience Rating:</span>
                  <strong className="text-amber-400">{selectedDev.skill_profile?.experience_rating || 3} / 5 Stars</strong>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400 block mb-1">Declared Languages & Frameworks:</span>
                  <div className="flex flex-wrap gap-1">
                    {(selectedDev.skill_profile?.primary_languages || selectedDev.skills || '').split(',').map((s, i) => (
                      <span key={i} className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-900 border border-slate-800 text-indigo-300">
                        {s.strip ? s.strip() : s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-[11px] text-indigo-200">
                <strong>Load Balancer Insight:</strong>{' '}
                {selectedDev.open_workload >= 5
                  ? 'High workload penalty reduces allocation score despite strong technical expertise to prevent burnout.'
                  : 'Low workload penalty ensures developer is favored for upcoming assignments.'}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2 p-4">
              <User className="w-8 h-8 text-slate-600" />
              <p className="text-xs">Click any developer node on the matrix canvas to inspect capacity & allocation suitability.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
