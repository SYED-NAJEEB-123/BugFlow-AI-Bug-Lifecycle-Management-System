import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import { aiService } from '../../services/aiService';
import { Sparkles, X, FileText, Activity, AlertCircle, Layers } from 'lucide-react';

export const AISummaryModal = ({ isOpen, onClose, title, description }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.summarizeDefect(description, title);
      setSummaryData(res);
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
      setError(err.response?.data?.error || 'Failed to generate AI summary. Using fallback description.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">AI Executive Defect Summarizer</h3>
              <p className="text-[10px] text-slate-400">Concise technical summary generated from defect report</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {!summaryData && !loading && (
            <div className="text-center py-6 space-y-3">
              <FileText className="w-10 h-10 text-indigo-400 mx-auto" />
              <p className="text-slate-300">Generate an executive technical summary of this defect report.</p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Note: The generated summary is for developer review and will NOT overwrite the original defect description.
              </p>
              <Button variant="primary" size="sm" icon={Sparkles} onClick={handleGenerateSummary}>
                Generate AI Summary Now
              </Button>
            </div>
          )}

          {loading && (
            <div className="py-8 text-center space-y-3">
              <Spinner size="lg" className="mx-auto" />
              <p className="text-slate-400 text-xs font-mono">Analyzing defect report & generating summary...</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {summaryData && !loading && (
            <div className="space-y-4">
              {/* Short Executive Summary */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" /> Executive Short Summary
                </h4>
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 leading-relaxed">
                  {summaryData.short_summary}
                </div>
              </div>

              {/* Symptoms */}
              {summaryData.important_symptoms && summaryData.important_symptoms.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-400" /> Key Observed Symptoms
                  </h4>
                  <ul className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-slate-300">
                    {summaryData.important_symptoms.map((symptom, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Impact & Context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {summaryData.impact && (
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Business/System Impact
                    </h4>
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
                      {summaryData.impact}
                    </div>
                  </div>
                )}

                {summaryData.context && (
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" /> Technical Context
                    </h4>
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
                      {summaryData.context}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          {summaryData && (
            <Button variant="outline" size="sm" icon={Sparkles} onClick={handleGenerateSummary} isLoading={loading}>
              Re-Generate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
