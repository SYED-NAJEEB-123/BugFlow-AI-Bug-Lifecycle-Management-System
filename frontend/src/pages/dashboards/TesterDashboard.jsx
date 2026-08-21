import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { issueService } from '../../services/issueService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { IssueModal } from '../../components/issues/IssueModal';
import { VisionAnalyzerModal } from '../../components/ai/VisionAnalyzerModal';
import { TestTube, Camera, Sparkles, Plus, Bug, CheckCircle2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TesterDashboard = () => {
  const { user } = useAuth();
  const [reportedIssues, setReportedIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);

  const fetchTesterData = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        const res = await issueService.getIssues({ reporter_id: user.id });
        setReportedIssues(res.issues || []);
      }
    } catch (err) {
      console.error('Error fetching tester reported defects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTesterData();
  }, [user?.id]);

  const handleCreateDefect = async (formData) => {
    try {
      await issueService.createIssue(formData);
      setIsReportModalOpen(false);
      fetchTesterData();
    } catch (err) {
      console.error('Failed to create defect:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const visionEnhancedCount = reportedIssues.filter(i => i.vision_analyzed || i.ai_enhanced).length;
  const verifiedCount = reportedIssues.filter(i => ['Verified', 'Closed'].includes(i.status)).length;

  return (
    <div className="space-y-6">
      {/* QA Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <span>Quality Assurance & Testing Workspace</span>
            <TestTube className="w-5 h-5 text-emerald-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Welcome back, {user?.full_name}. Report defects & upload screenshots for Gemini Vision OCR parsing.
          </p>
        </div>
        <Button variant="gradient" icon={Plus} onClick={() => setIsReportModalOpen(true)}>
          Report New Defect
        </Button>
      </div>

      {/* Gemini Vision Banner Callout */}
      <Card className="p-6 bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
            <Camera className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">AI Vision Screenshot Auto-Defect Reporter</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xl">
              Upload bug screenshots (PNG, JPG). Gemini Vision reads stack traces, UI errors, environment specs, and populates defect titles, steps to reproduce, and root causes automatically!
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          icon={Sparkles}
          className="bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 shrink-0"
          onClick={() => setIsVisionModalOpen(true)}
        >
          Upload Screenshot OCR
        </Button>
      </Card>

      {/* Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">My Reported Defects</p>
            <h3 className="text-2xl font-black text-slate-100 mt-1">{reportedIssues.length}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Bug className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">AI Enhanced / OCR</p>
            <h3 className="text-2xl font-black text-cyan-400 mt-1">{visionEnhancedCount}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verified Fixed</p>
            <h3 className="text-2xl font-black text-purple-400 mt-1">{verifiedCount}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Reported Defects List */}
      <Card className="p-6">
        <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Bug className="w-4 h-4 text-emerald-400" />
          <span>My Reported Defect History ({reportedIssues.length})</span>
        </h3>

        {reportedIssues.length === 0 ? (
          <div className="p-10 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Bug className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">No Defects Reported Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Start testing applications and click "Report New Defect" or "Upload Screenshot OCR" to create your first defect report.
            </p>
            <Button variant="primary" icon={Plus} onClick={() => setIsReportModalOpen(true)} className="mt-2">
              Report First Defect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {reportedIssues.map((b) => (
              <div key={b.id} className="p-4 rounded-xl glass-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">{b.issue_key}</span>
                    <span className="text-[11px] text-slate-400">• {b.project?.name || 'Project'}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">{b.title}</h4>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={b.severity.toLowerCase()}>{b.severity}</Badge>
                  <Badge variant={b.status === 'Resolved' ? 'resolved' : 'in_progress'}>{b.status}</Badge>
                  <Link to={`/issues/${b.id}`}>
                    <Button variant="outline" size="sm" icon={ExternalLink}>
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modals */}
      <IssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleCreateDefect}
      />

      <VisionAnalyzerModal
        isOpen={isVisionModalOpen}
        onClose={() => setIsVisionModalOpen(false)}
        onAcceptAnalysis={handleCreateDefect}
      />
    </div>
  );
};
