import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { aiService } from '../../services/aiService';
import { Camera, Sparkles, UploadCloud, Check, X, FileImage, AlertTriangle } from 'lucide-react';

export const VisionAnalyzerModal = ({
  isOpen,
  onClose,
  onAcceptAnalysis
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const result = await aiService.analyzeScreenshot(selectedFile);
      setAnalysisResult(result);
    } catch (err) {
      console.error('Vision OCR Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmSubmit = () => {
    if (analysisResult) {
      onAcceptAnalysis({
        ...analysisResult,
        screenshotFile: selectedFile,
        vision_analyzed: true
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📷 Gemini Vision Screenshot Defect OCR"
      subtitle="Upload bug screenshots, stack traces, or UI errors for multimodal AI analysis"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {!analysisResult ? (
          <div className="space-y-4">
            {/* File Upload Drop Area */}
            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center transition-colors bg-slate-900/60 cursor-pointer relative">
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-200">
                {selectedFile ? selectedFile.name : 'Click or Drag & Drop Bug Screenshot'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Supports PNG, JPG, JPEG up to 16MB</p>
            </div>

            {imagePreviewUrl && (
              <div className="rounded-xl overflow-hidden max-h-48 border border-slate-800 flex justify-center bg-slate-950">
                <img src={imagePreviewUrl} alt="Bug Preview" className="object-contain h-48" />
              </div>
            )}

            <Button
              variant="gradient"
              className="w-full"
              isLoading={isAnalyzing}
              icon={Camera}
              onClick={handleAnalyze}
              disabled={!selectedFile}
            >
              Analyze Screenshot with Gemini Vision
            </Button>
          </div>
        ) : (
          /* Preview & Edit Screen Before Defect Submission */
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Gemini Vision Draft Generated — Edit values before final submission
              </span>
            </div>

            <Input
              label="Generated Defect Title"
              value={analysisResult.title}
              onChange={(e) => setAnalysisResult({ ...analysisResult, title: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Category"
                value={analysisResult.category || 'UI/UX'}
                onChange={(e) => setAnalysisResult({ ...analysisResult, category: e.target.value })}
                options={[
                  { label: 'UI/UX', value: 'UI/UX' },
                  { label: 'API', value: 'API' },
                  { label: 'Authentication', value: 'Authentication' },
                  { label: 'Database', value: 'Database' },
                  { label: 'Performance', value: 'Performance' },
                  { label: 'Security', value: 'Security' }
                ]}
              />

              <Select
                label="Severity"
                value={analysisResult.severity || 'High'}
                onChange={(e) => setAnalysisResult({ ...analysisResult, severity: e.target.value })}
                options={[
                  { label: 'Critical', value: 'Critical' },
                  { label: 'High', value: 'High' },
                  { label: 'Medium', value: 'Medium' },
                  { label: 'Low', value: 'Low' }
                ]}
              />

              <Select
                label="Priority"
                value={analysisResult.priority || 'High'}
                onChange={(e) => setAnalysisResult({ ...analysisResult, priority: e.target.value })}
                options={[
                  { label: 'Urgent / Critical', value: 'Critical' },
                  { label: 'High', value: 'High' },
                  { label: 'Medium', value: 'Medium' },
                  { label: 'Low', value: 'Low' }
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                Extracted Error & Trace
              </label>
              <textarea
                rows={2}
                value={analysisResult.error_message}
                onChange={(e) => setAnalysisResult({ ...analysisResult, error_message: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                Detailed Defect Description
              </label>
              <textarea
                rows={3}
                value={analysisResult.description}
                onChange={(e) => setAnalysisResult({ ...analysisResult, description: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                Possible Root Cause & Suggested Investigation Areas
              </label>
              <textarea
                rows={2}
                value={`${analysisResult.possible_root_cause}\n${analysisResult.suggested_fix}`}
                onChange={(e) => setAnalysisResult({ ...analysisResult, possible_root_cause: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="outline" onClick={() => setAnalysisResult(null)}>
                Discard Analysis
              </Button>
              <Button variant="gradient" icon={Check} onClick={handleConfirmSubmit}>
                Confirm & Create Defect
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
