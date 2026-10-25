import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import { aiService } from '../../services/aiService';
import { Sparkles, Code, Search, ShieldCheck, CheckCircle2, RefreshCw, FileCode, Info, Database, HelpCircle } from 'lucide-react';

export const ResolutionAssistancePanel = ({ issue }) => {
  const [assistance, setAssistance] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAssistance = async () => {
    if (!issue) return;
    setLoading(true);
    try {
      const result = await aiService.ragResolution(issue.id, issue);
      setAssistance(result);
    } catch (err) {
      console.error('Failed to load resolution assistance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssistance();
  }, [issue?.id]);

  const getConfidenceBadge = (confidence) => {
    if (confidence === 'High Evidence') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">High Historical Evidence</span>;
    }
    if (confidence === 'Moderate Evidence') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">Moderate Historical Evidence</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-bold">Insufficient Historical Evidence</span>;
  };

  return (
    <Card className="p-6 border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-950 space-y-4">
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">AI RAG Resolution Co-Pilot</h3>
              {assistance && getConfidenceBadge(assistance.confidence_indicator)}
            </div>
            <p className="text-[10px] text-indigo-300">Retrieval-Augmented Generation using database knowledge base</p>
          </div>
        </div>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchAssistance} isLoading={loading}>
          Re-Analyze
        </Button>
      </div>

      {loading ? (
        <Spinner size="md" className="py-6" />
      ) : assistance ? (
        <div className="space-y-4 text-xs">
          {/* Disclaimer & Evidence Banner */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p>{assistance.disclaimer}</p>
            </div>
            {assistance.evidence_summary && (
              <div className="flex items-center gap-1.5 pt-1 text-[10px] text-indigo-300 font-mono">
                <Database className="w-3 h-3 text-cyan-400" />
                <span>RAG Retrieval: {assistance.evidence_summary}</span>
              </div>
            )}
          </div>

          {/* Investigation Areas */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-400" /> Suggested Area for Investigation
            </h4>
            <ul className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-slate-300">
              {assistance.investigation_areas && assistance.investigation_areas.map((area, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Possible Technical Root Cause */}
          <div className="space-y-1">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-amber-400" /> Potential Cause
            </h4>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 leading-relaxed font-mono text-[11px]">
              {assistance.possible_root_cause}
            </div>
          </div>

          {/* Suggested Resolution */}
          <div className="space-y-1">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-emerald-400" /> Possible Resolution
            </h4>
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 leading-relaxed">
              {assistance.suggested_resolution}
            </div>
          </div>

          {/* Suggested Testing Steps */}
          {assistance.suggested_testing_steps && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Verification Testing Steps
              </h4>
              <ul className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-slate-300">
                {assistance.suggested_testing_steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* RAG Grounded Retrieved Defects Knowledge Base */}
          {assistance.retrieved_defects && assistance.retrieved_defects.length > 0 ? (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" /> Grounded Retrieved Historical Defects ({assistance.retrieved_defects.length})
              </h4>
              <div className="space-y-2">
                {assistance.retrieved_defects.map((h) => (
                  <div key={h.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span className="text-indigo-400">{h.issue_key} ({h.similarity_score}% match)</span>
                      <span className="text-[10px] text-slate-400">{h.category}</span>
                    </div>
                    <p className="text-slate-300 font-semibold">{h.title}</p>
                    <p className="text-slate-400">Root Cause: {h.root_cause || 'Under investigation'}</p>
                    <p className="text-emerald-400 font-mono">Fix: {h.suggested_fix || 'No fix recorded'}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Insufficient historical information available for a reliable recommendation.</span>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
};
