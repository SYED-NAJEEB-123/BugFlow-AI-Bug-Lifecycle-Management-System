import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { issueService } from '../../services/issueService';
import { useNotification } from '../../context/NotificationContext';
import { 
  Bug, ArrowRight, CheckCircle2, Clock, AlertTriangle, 
  User, ShieldAlert, Check
} from 'lucide-react';

export const SprintKanbanBoard = ({ issues = [], onIssueStatusChanged }) => {
  const { addNotification } = useNotification();

  const columns = [
    { id: 'Reported', title: 'Backlog / Reported', statusList: ['Reported'], color: 'border-slate-700 bg-slate-900/40' },
    { id: 'Assigned', title: 'To Do / Assigned', statusList: ['Assigned'], color: 'border-blue-900/60 bg-blue-950/20' },
    { id: 'In Progress', title: 'In Progress', statusList: ['In Progress'], color: 'border-indigo-900/60 bg-indigo-950/20' },
    { id: 'In Review', title: 'In Review', statusList: ['In Review'], color: 'border-amber-900/60 bg-amber-950/20' },
    { id: 'Resolved', title: 'Resolved', statusList: ['Resolved'], color: 'border-emerald-900/60 bg-emerald-950/20' },
    { id: 'Closed', title: 'Done / Closed', statusList: ['Verified', 'Closed'], color: 'border-teal-900/60 bg-teal-950/20' }
  ];

  const handleQuickStatusChange = async (issueId, newStatus) => {
    try {
      await issueService.updateStatus(issueId, { status: newStatus });
      addNotification({
        title: 'Status Updated',
        message: `Moved issue status to ${newStatus}`,
        type: 'success'
      });
      if (onIssueStatusChanged) onIssueStatusChanged();
    } catch (err) {
      addNotification({
        title: 'Status Update Error',
        message: err.response?.data?.error || 'Failed to update issue status',
        type: 'error'
      });
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'Critical': return 'danger';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      default: return 'default';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
      {columns.map((col) => {
        const colIssues = issues.filter(i => col.statusList.includes(i.status));

        return (
          <div key={col.id} className={`rounded-xl border p-3 flex flex-col justify-between min-h-[480px] ${col.color}`}>
            <div>
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">{col.title}</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {colIssues.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-2.5">
                {colIssues.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-slate-500 italic">
                    No defects in {col.id}
                  </div>
                ) : (
                  colIssues.map((issue) => (
                    <Card key={issue.id} className="p-3 bg-slate-900/90 hover:border-indigo-500/60 transition-all shadow-md">
                      <div className="flex items-center justify-between mb-1.5">
                        <Link to={`/issues/${issue.id}`} className="text-xs font-mono font-bold text-indigo-400 hover:underline">
                          {issue.issue_key}
                        </Link>
                        <Badge variant={getSeverityBadge(issue.severity)} size="sm">
                          {issue.severity}
                        </Badge>
                      </div>

                      <Link to={`/issues/${issue.id}`} className="text-xs font-semibold text-slate-200 line-clamp-2 hover:text-indigo-300 transition-colors mb-2 block">
                        {issue.title}
                      </Link>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          {issue.assignee?.full_name?.split(' ')[0] || 'Unassigned'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {issue.category}
                        </span>
                      </div>

                      {/* Quick Move Status Controls */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                        <span className="text-[10px] text-slate-500 font-medium">Move to:</span>
                        <select
                          value={issue.status}
                          onChange={(e) => handleQuickStatusChange(issue.id, e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="Reported">Reported</option>
                          <option value="Assigned">Assigned</option>
                          <option value="In Progress">In Progress</option>
                          <option value="In Review">In Review</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
