import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { Button } from '../common/Button';
import { 
  AlertTriangle, ShieldAlert, Activity, CheckCircle2, 
  Layers, Database, FileText, Cpu, ArrowRight, RefreshCw, BarChart2
} from 'lucide-react';
import { WhatIfLoadBalanceModal } from './WhatIfLoadBalanceModal';

export const ImpactAnalysisPanel = ({ defectData, issueId = null }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = issueId ? issueId : defectData;
      const res = await aiService.getImpactAnalysis(payload);
      setAnalysis(res);
    } catch (err) {
      console.error('Impact analysis error:', err);
      setError(err.response?.data?.error || 'Failed to generate impact analysis report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (issueId) {
      runAnalysis();
    }
  }, [issueId]);

  const getRiskLevelBadge = (level, score) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">CRITICAL RISK ({score}/100)</span>;
      case 'HIGH':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">HIGH RISK ({score}/100)</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">MEDIUM RISK ({score}/100)</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">LOW RISK ({score}/100)</span>;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              Defect Impact Analysis & Risk Scoring
              <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                AI Agent
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">Evaluates architectural scope, database facts, regression risks, and developer workload</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={loading}
            icon={RefreshCw}
            onClick={runAnalysis}
          >
            {analysis ? 'Re-Analyze Impact' : 'Run Impact Analysis'}
          </Button>

          {analysis && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={BarChart2}
              onClick={() => setIsWhatIfOpen(true)}
            >
              What-If Simulation
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          {/* Top Score Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-center pr-3 border-r border-slate-800">
                <span className="text-2xl font-black text-slate-100 block leading-none">{analysis.risk_score}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Risk Score</span>
              </div>
              <div>
                <div className="mb-1">{getRiskLevelBadge(analysis.risk_level, analysis.risk_score)}</div>
                <p className="text-xs text-slate-300 font-medium">{analysis.risk_summary}</p>
              </div>
            </div>
          </div>

          {/* Grid of Database Facts & Calculated Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Real Database Facts */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h5 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Database Facts
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Category / Module:</span>
                  <span className="font-semibold text-slate-200">{analysis.database_facts?.category} / {analysis.database_facts?.module}</span>
                </li>
                <li className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Affected Scope:</span>
                  <span className="font-semibold text-slate-200">{analysis.database_facts?.affected_scope}</span>
                </li>
                <li className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Dependent Defects in Module:</span>
                  <span className="font-semibold text-slate-200">{analysis.database_facts?.dependent_defects_count} defects</span>
                </li>
                <li className="flex justify-between pb-1">
                  <span className="text-slate-400">Assigned Dev Workload:</span>
                  <span className="font-semibold text-slate-200">{analysis.database_facts?.assignee_workload}</span>
                </li>
              </ul>
            </div>

            {/* Calculated Risk Metrics */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h5 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Calculated Risk Metrics
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Severity Weight:</span>
                  <span className="font-semibold text-slate-200">{analysis.calculated_metrics?.severity_weight} / 35</span>
                </li>
                <li className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Priority Weight:</span>
                  <span className="font-semibold text-slate-200">{analysis.calculated_metrics?.priority_weight} / 25</span>
                </li>
                <li className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Module Complexity Weight:</span>
                  <span className="font-semibold text-slate-200">{analysis.calculated_metrics?.module_complexity_weight} / 20</span>
                </li>
                <li className="flex justify-between pb-1">
                  <span className="text-slate-400">Workload Risk Multiplier:</span>
                  <span className="font-semibold text-slate-200">{analysis.calculated_metrics?.workload_multiplier}x</span>
                </li>
              </ul>
            </div>
          </div>

          {/* AI Inferences & Regression Recommendations */}
          {analysis.ai_inferences && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <h5 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> AI Risk Inferences & Mitigation
              </h5>

              {analysis.ai_inferences.potential_regression_areas && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Potential Regression Areas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.ai_inferences.potential_regression_areas.map((area, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-xs rounded bg-slate-900 border border-slate-800 text-slate-300">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.ai_inferences.recommended_test_suites && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Recommended Regression Test Suites:</span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {analysis.ai_inferences.recommended_test_suites.map((test, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{test}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.ai_inferences.deployment_warning && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span><strong>Deployment Note:</strong> {analysis.ai_inferences.deployment_warning}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* What-If Load Balance Simulation Modal */}
      <WhatIfLoadBalanceModal
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
        defectData={defectData || { issue_id: issueId }}
      />
    </div>
  );
};
