import React from 'react';
import { 
  Bug, Layers, Database, Calendar, User, 
  AlertTriangle, ShieldAlert, ArrowRight, CheckCircle2, ChevronRight 
} from 'lucide-react';

export const DefectImpactGraph = ({ defectData = {}, impactAnalysis = null }) => {
  const title = defectData.title || impactAnalysis?.defect_title || 'Target Defect';
  const category = defectData.category || impactAnalysis?.database_facts?.category || 'General';
  const module = defectData.module || impactAnalysis?.database_facts?.module || 'General';
  const riskLevel = impactAnalysis?.risk_level || 'MEDIUM';
  const riskScore = impactAnalysis?.risk_score || 50;
  const dependentCount = impactAnalysis?.database_facts?.dependent_defects_count || 0;
  const assigneeName = impactAnalysis?.database_facts?.assignee_workload || 'Unassigned';

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'border-rose-500 bg-rose-950/40 text-rose-300';
      case 'HIGH': return 'border-amber-500 bg-amber-950/40 text-amber-300';
      case 'MEDIUM': return 'border-blue-500 bg-blue-950/40 text-blue-300';
      default: return 'border-emerald-500 bg-emerald-950/40 text-emerald-300';
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          Defect Dependency & Architectural Impact Graph
        </h4>
        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${getRiskColor(riskLevel)}`}>
          Risk Score: {riskScore}/100 ({riskLevel})
        </span>
      </div>

      {/* Interactive Visual Graph Flowchart */}
      <div className="overflow-x-auto py-4">
        <div className="min-w-[650px] flex items-center justify-between gap-3">
          {/* Node 1: Defect */}
          <div className="flex-1 p-3 rounded-xl bg-slate-900 border border-indigo-500/40 space-y-1 text-center shadow-lg">
            <div className="w-7 h-7 mx-auto rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bug className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Root Defect</span>
            <p className="text-xs font-bold text-slate-100 truncate" title={title}>{title}</p>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />

          {/* Node 2: Affected Component */}
          <div className="flex-1 p-3 rounded-xl bg-slate-900 border border-purple-500/40 space-y-1 text-center shadow-lg">
            <div className="w-7 h-7 mx-auto rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Database className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Affected Component</span>
            <p className="text-xs font-bold text-purple-300 truncate">{category} / {module}</p>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />

          {/* Node 3: Dependent Defects */}
          <div className="flex-1 p-3 rounded-xl bg-slate-900 border border-amber-500/40 space-y-1 text-center shadow-lg">
            <div className="w-7 h-7 mx-auto rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Dependent Defects</span>
            <p className="text-xs font-bold text-amber-300">{dependentCount} Related Bugs</p>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />

          {/* Node 4: Assigned Developer */}
          <div className="flex-1 p-3 rounded-xl bg-slate-900 border border-blue-500/40 space-y-1 text-center shadow-lg">
            <div className="w-7 h-7 mx-auto rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <User className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Developer</span>
            <p className="text-xs font-bold text-blue-300 truncate">{assigneeName}</p>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />

          {/* Node 5: Architectural Impact */}
          <div className={`flex-1 p-3 rounded-xl border space-y-1 text-center shadow-lg ${getRiskColor(riskLevel)}`}>
            <div className="w-7 h-7 mx-auto rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold opacity-80 block">Potential Impact</span>
            <p className="text-xs font-bold uppercase">{riskLevel} RISK</p>
          </div>
        </div>
      </div>
    </div>
  );
};
