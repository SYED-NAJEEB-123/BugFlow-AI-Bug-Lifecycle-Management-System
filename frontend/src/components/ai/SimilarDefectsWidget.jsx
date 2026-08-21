import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { issueService } from '../../services/issueService';
import { AlertTriangle, ExternalLink, ShieldAlert, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SimilarDefectsWidget = ({ title, description, projectId, onIgnoreDuplicates }) => {
  const [duplicateList, setDuplicateList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDuplicates = async () => {
      if (!title && !description) {
        setDuplicateList([]);
        return;
      }
      setLoading(true);
      try {
        const res = await issueService.checkDuplicates({
          title,
          description,
          project_id: projectId
        });
        setDuplicateList(res.duplicates || []);
      } catch (err) {
        console.error('Duplicate check error:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchDuplicates, 350);
    return () => clearTimeout(timer);
  }, [title, description, projectId]);

  if (duplicateList.length === 0) return null;

  const topMatch = duplicateList[0];

  return (
    <Card className="p-4 bg-amber-500/10 border border-amber-500/40 space-y-3 rounded-2xl">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>⚠ Possible Duplicate Defect Detected</span>
        </h4>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
          {topMatch.similarity_score}% {topMatch.similarity_level}
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        This defect appears semantically similar to an existing report in the project database:
      </p>

      <div className="space-y-2">
        {duplicateList.slice(0, 3).map((item) => (
          <div key={item.id} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-indigo-400">{item.issue_key}</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.similarity_score}% Score
                </span>
                <Badge variant={item.status === 'Resolved' || item.status === 'Closed' ? 'resolved' : 'in_progress'} size="sm">
                  {item.status}
                </Badge>
                {item.sprint && (
                  <span className="text-[9px] font-medium text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    {item.sprint.name}
                  </span>
                )}
              </div>

              <p className="font-semibold text-slate-100 truncate">{item.title}</p>
              
              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span>Assigned to: <strong className="text-slate-200">{item.assignee?.full_name || 'Unassigned'}</strong></span>
                <span>Category: <strong className="text-slate-200">{item.category}</strong></span>
              </div>
            </div>

            <a
              href={`/issues/${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <span>View Defect</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
        <span className="text-[11px] text-slate-400">
          Would you like to continue reporting this issue?
        </span>
        {onIgnoreDuplicates && (
          <button
            type="button"
            onClick={onIgnoreDuplicates}
            className="text-xs font-bold text-amber-300 hover:text-amber-200 underline"
          >
            Continue Creating New Defect →
          </button>
        )}
      </div>
    </Card>
  );
};
