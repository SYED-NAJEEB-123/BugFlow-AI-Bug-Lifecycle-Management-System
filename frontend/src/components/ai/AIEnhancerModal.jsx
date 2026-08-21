import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { aiService } from '../../services/aiService';
import { Sparkles, Check, RefreshCw, Wand2, FileText, AlertCircle } from 'lucide-react';

export const AIEnhancerModal = ({
  isOpen,
  onClose,
  onApply,
  initialDescription = '',
  initialEnvironment = 'Development'
}) => {
  const [rawInput, setRawInput] = useState(initialDescription);
  const [environment, setEnvironment] = useState(initialEnvironment);
  const [isLoading, setIsLoading] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState(null);

  const handleGenerate = async () => {
    if (!rawInput.trim()) return;
    setIsLoading(true);
    try {
      const result = await aiService.enhanceDescription(rawInput, environment);
      setEnhancedResult(result);
    } catch (err) {
      console.error('Enhancement error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (enhancedResult) {
      onApply(enhancedResult);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✨ Gemini AI Defect Description Enhancer"
      subtitle="Transform vague bug descriptions into clear, structured, technical defect reports"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {!enhancedResult ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                Enter Brief or Vague Bug Notes
              </label>
              <textarea
                rows={4}
                placeholder="e.g., Login is broken when I click submit button on mobile Chrome"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 text-slate-100 text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <Button
              variant="gradient"
              className="w-full"
              isLoading={isLoading}
              icon={Sparkles}
              onClick={handleGenerate}
              disabled={!rawInput.trim()}
            >
              Generate Technical Defect Report
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                AI Report Generated — Review and Edit Before Applying
              </span>
              <button
                onClick={() => setEnhancedResult(null)}
                className="text-xs text-slate-400 hover:text-slate-200 underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>

            <Input
              label="Suggested Title"
              value={enhancedResult.title}
              onChange={(e) => setEnhancedResult({ ...enhancedResult, title: e.target.value })}
            />

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                Technical Description
              </label>
              <textarea
                rows={3}
                value={enhancedResult.description}
                onChange={(e) => setEnhancedResult({ ...enhancedResult, description: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                  Steps to Reproduce
                </label>
                <textarea
                  rows={3}
                  value={enhancedResult.steps_to_reproduce}
                  onChange={(e) => setEnhancedResult({ ...enhancedResult, steps_to_reproduce: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                  Expected vs Actual Result
                </label>
                <textarea
                  rows={3}
                  value={`EXPECTED: ${enhancedResult.expected_result}\nACTUAL: ${enhancedResult.actual_result}`}
                  onChange={(e) => setEnhancedResult({ ...enhancedResult, actual_result: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="outline" onClick={() => setEnhancedResult(null)}>
                Discard
              </Button>
              <Button variant="gradient" icon={Check} onClick={handleAccept}>
                Accept & Use AI Report
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
