import React, { useState } from 'react';
import { aiService } from '../../services/aiService';
import { Button } from '../common/Button';
import { Sparkles, UserCheck, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Activity, Brain } from 'lucide-react';

export const DeveloperAllocationPanel = ({ defectData, onSelectDeveloper, currentAssigneeId }) => {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const fetchRecommendation = async () => {
    if (!defectData.title && !defectData.description) {
      setError('Please enter a title or description first to calculate developer recommendations.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await aiService.recommendDeveloper(defectData);
      setRecommendation(res);
    } catch (err) {
      console.error('Failed to fetch developer recommendation:', err);
      setError(err.response?.data?.error || 'Failed to analyze developer workload & skills.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'LOW':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">LOW LOAD</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">MEDIUM LOAD</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">HIGH LOAD</span>;
      case 'OVERLOADED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">OVERLOADED</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 60) return 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10';
    if (score >= 40) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  const best = recommendation?.best_candidate;

  return (
    <div className="bg-slate-900/90 border border-indigo-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              Developer Allocation Agent
              <span className="text-[10px] font-normal text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                Multi-Factor AI
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">Scores candidates on Skills (35%), Module/Category (25%), History (20%), Workload (20%)</p>
          </div>
        </div>

        <Button
          type="button"
          variant="gradient"
          size="sm"
          isLoading={loading}
          icon={Sparkles}
          onClick={fetchRecommendation}
        >
          {recommendation ? 'Re-Analyze Allocation' : 'Recommend Developer'}
        </Button>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {recommendation && best && (
        <div className="space-y-3 pt-2 border-t border-slate-800">
          {/* Best Candidate Summary */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center font-bold ${getScoreColor(best.score)}`}>
                <span className="text-base leading-none">{best.score}</span>
                <span className="text-[9px] uppercase font-semibold opacity-70">Match</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">{best.developer_name}</span>
                  {getStatusBadge(best.workload_status)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Active Workload: <strong className="text-slate-200">{best.active_workload} defects</strong> ({best.high_critical_count} High/Critical)
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant={Number(currentAssigneeId) === Number(best.developer_id) ? "secondary" : "primary"}
              size="sm"
              icon={UserCheck}
              onClick={() => onSelectDeveloper && onSelectDeveloper(best.developer_id)}
            >
              {Number(currentAssigneeId) === Number(best.developer_id) ? 'Currently Assigned' : 'Assign Developer'}
            </Button>
          </div>

          {/* Reasoning Highlights */}
          {best.reasoning && best.reasoning.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AI Reasoning:</span>
              <ul className="space-y-1">
                {best.reasoning.map((reason, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Expandable Breakdown & Alternatives */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showBreakdown ? 'Hide Detailed Score Breakdown & Alternatives' : `View Full Candidate Rankings (${recommendation.rankings?.length || 0}) & Score Breakdown`}
            </button>

            {showBreakdown && (
              <div className="mt-3 space-y-3 text-xs border-t border-slate-800 pt-3">
                {/* Score Formula Components */}
                {best.breakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Skills (35%)</span>
                      <span className="font-bold text-slate-200">{best.breakdown.skill_match_score} / 35</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Category/Module (25%)</span>
                      <span className="font-bold text-slate-200">{best.breakdown.category_module_score} / 25</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">History (20%)</span>
                      <span className="font-bold text-slate-200">{best.breakdown.historical_experience_score} / 20</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Availability (20%)</span>
                      <span className="font-bold text-slate-200">{best.breakdown.workload_availability_score} / 20</span>
                    </div>
                  </div>
                )}

                {/* Ranked Alternatives Table */}
                <div>
                  <h5 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Ranked Developer Candidates
                  </h5>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {recommendation.rankings?.map((item, idx) => (
                      <div
                        key={item.developer_id}
                        className={`p-2 rounded-lg border flex items-center justify-between transition-colors ${
                          item.developer_id === best.developer_id
                            ? 'bg-indigo-950/40 border-indigo-500/40'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 w-4">#{idx + 1}</span>
                          <div>
                            <span className="text-xs font-semibold text-slate-200">{item.developer_name}</span>
                            <span className="text-[11px] text-slate-400 ml-2">Workload: {item.active_workload}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusBadge(item.workload_status)}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(item.score)}`}>
                            {item.score}%
                          </span>
                          <button
                            type="button"
                            onClick={() => onSelectDeveloper && onSelectDeveloper(item.developer_id)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline ml-1"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
