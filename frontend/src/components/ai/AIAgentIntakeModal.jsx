import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/aiService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { Spinner } from '../common/Spinner';
import { 
  Sparkles, Upload, Eye, CheckCircle2, AlertTriangle, 
  UserCheck, ShieldAlert, Cpu, ArrowRight, Layers, RefreshCw
} from 'lucide-react';

export const AIAgentIntakeModal = ({ isOpen, onClose, projects = [], onDefectCreated = () => {} }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [projectId, setProjectId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [agentResult, setAgentResult] = useState(null);
  const [error, setError] = useState(null);
  const [allDevs, setAllDevs] = useState([]);
  const [selectedOverrideDev, setSelectedOverrideDev] = useState('');
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch devs for human override
      aiService.getDeveloperSkills()
        .then((res) => {
          if (res && res.developers) {
            setAllDevs(res.developers);
          }
        })
        .catch((err) => console.error('Failed to load developers:', err));
    } else {
      // Reset modal state
      setFile(null);
      setPreviewUrl(null);
      setProjectId('');
      setProcessing(false);
      setAgentResult(null);
      setError(null);
      setSelectedOverrideDev('');
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const res = await aiService.processScreenshotAgent(file, projectId || null);
      setAgentResult(res);
      onDefectCreated(res.defect);
    } catch (err) {
      console.error('Agent processing failed:', err);
      setError(err.response?.data?.error || 'Failed to process screenshot intake agent.');
    } fontFinally: {
      setProcessing(false);
    }
  };

  const handleReassign = async () => {
    if (!agentResult || !agentResult.defect || !selectedOverrideDev) return;
    setReassigning(true);

    try {
      const res = await aiService.assignDefectAgent(agentResult.defect.id, selectedOverrideDev);
      setAgentResult((prev) => ({
        ...prev,
        assignment: res.assignment,
        defect: { ...prev.defect, assignee_id: selectedOverrideDev, assignee_name: res.assignment.assigned_to }
      }));
    } catch (err) {
      console.error('Reassignment failed:', err);
    } finally {
      setReassigning(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
    if (score >= 60) return 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60';
    return 'text-amber-400 bg-amber-950/60 border-amber-800/60';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Autonomous AI Screenshot Intake Agent"
      size="xl"
    >
      <div className="space-y-5">
        {/* Header Description */}
        <div className="bg-slate-900 border border-indigo-900/50 p-4 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400 border border-indigo-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Autonomous Intake Pipeline
              <Badge variant="indigo" size="sm">Vision + RAG + Auto-Assign</Badge>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Upload a bug screenshot. The AI agent extracts defect details, checks for duplicates, creates the issue, and auto-assigns the best developer using skill-workload scoring.
            </p>
          </div>
        </div>

        {/* Step 1: Upload Form */}
        {!agentResult && !processing && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Project (Optional)
              </label>
              <Select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-slate-950 border-slate-800"
              >
                <option value="">Auto-Detect / Default Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                ))}
              </Select>
            </div>

            {/* File Upload Box */}
            <div className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 bg-slate-950/60 p-6 rounded-xl text-center transition-all cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {previewUrl ? (
                <div className="space-y-3">
                  <img
                    src={previewUrl}
                    alt="Bug Screenshot Preview"
                    className="max-h-48 mx-auto rounded-lg border border-slate-800 shadow-md object-contain"
                  />
                  <p className="text-xs text-slate-400">Click or drag a new image to replace</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    Drop bug screenshot here, or <span className="text-indigo-400 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500">Supports PNG, JPG, WEBP formats</p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleProcess}
                disabled={!file}
                className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 px-5"
              >
                <Sparkles className="w-4 h-4" />
                Run Intake Agent
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Processing Spinner Visual */}
        {processing && (
          <div className="py-12 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <Cpu className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-200">Autonomous Agent Executing...</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Analyzing visual evidence, evaluating duplicate vector index, and computing optimal developer skill score.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Agent Result Cards */}
        {agentResult && !processing && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Created Defect Summary */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                    {agentResult.defect.defect_key}
                  </span>
                  <h4 className="text-sm font-bold text-slate-100">{agentResult.defect.title}</h4>
                </div>
                <Badge variant="success" size="sm">
                  {agentResult.defect.status}
                </Badge>
              </div>

              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                {agentResult.defect.description}
              </p>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <Badge variant="secondary" size="sm">Category: {agentResult.defect.category}</Badge>
                <Badge variant="outline" size="sm">Severity: {agentResult.defect.severity}</Badge>
              </div>
            </div>

            {/* Duplicate Detection Warning if present */}
            {agentResult.duplicate_check && agentResult.duplicate_check.is_duplicate && (
              <div className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-amber-300 font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Potential Duplicate Defect Detected ({Math.round(agentResult.duplicate_check.max_similarity * 100)}% Match)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/issues/${agentResult.duplicate_check.similar_defects[0].id}`)}
                    className="text-xs border-amber-700/60 text-amber-300 hover:bg-amber-900/50"
                  >
                    View Existing Defect
                  </Button>
                </div>
                <p className="text-xs text-amber-200/80">
                  Matches &ldquo;<span className="font-semibold">{agentResult.duplicate_check.similar_defects[0].title}</span>&rdquo; ({agentResult.duplicate_check.similar_defects[0].defect_key}).
                </p>
              </div>
            )}

            {/* Developer Skill-Based Auto-Assignment Card */}
            {agentResult.assignment && (
              <div className="p-4 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-800/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-sm font-bold text-slate-100">
                      Developer Auto-Assignment
                    </h4>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-black border ${getScoreColor(agentResult.assignment.match_score)}`}>
                    Match Score: {agentResult.assignment.match_score}/100
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 block">Assigned Developer</span>
                    <span className="text-sm font-bold text-indigo-300">{agentResult.assignment.assigned_to}</span>
                  </div>
                  <span className="text-xs text-slate-400 italic">
                    Reason: {agentResult.assignment.reasoning || 'Highest domain skill & workload availability'}
                  </span>
                </div>

                {/* Score Breakdown Bar */}
                {agentResult.assignment.score_breakdown && (
                  <div className="space-y-2 pt-1">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Transparent Scoring Formula Breakdown
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Skill (35%)</span>
                        <span className="font-bold text-emerald-400">
                          {agentResult.assignment.score_breakdown.skill_score}/35
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Category (25%)</span>
                        <span className="font-bold text-indigo-400">
                          {agentResult.assignment.score_breakdown.category_score}/25
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">History (20%)</span>
                        <span className="font-bold text-purple-400">
                          {agentResult.assignment.score_breakdown.history_score}/20
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Workload (20%)</span>
                        <span className="font-bold text-amber-400">
                          {agentResult.assignment.score_breakdown.workload_score}/20
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Human Override Controls */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Human Override: Reassign Developer
              </label>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedOverrideDev}
                  onChange={(e) => setSelectedOverrideDev(e.target.value)}
                  className="flex-1 bg-slate-950 border-slate-800 text-xs"
                >
                  <option value="">Select manual developer override...</option>
                  {allDevs.map((dev) => (
                    <option key={dev.user_id} value={dev.user_id}>
                      {dev.full_name} ({dev.role}) - Open Defects: {dev.open_defects_count}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReassign}
                  disabled={!selectedOverrideDev || reassigning}
                  className="text-xs border-indigo-700/60 text-indigo-300 hover:bg-indigo-950/50 flex items-center gap-1 shrink-0"
                >
                  {reassigning ? <Spinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Reassign
                </Button>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/issues/${agentResult.defect.id}`)}
                className="text-xs text-indigo-300 border-indigo-800 hover:bg-indigo-950/50 flex items-center gap-1.5"
              >
                View Full Defect Details <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
export default AIAgentIntakeModal;
