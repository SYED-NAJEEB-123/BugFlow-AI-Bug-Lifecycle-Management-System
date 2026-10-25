import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { aiService } from '../../services/aiService';
import { authService } from '../../services/authService';
import { 
  BarChart2, ShieldAlert, ArrowRight, CheckCircle2, 
  AlertTriangle, Users, Cpu, Activity
} from 'lucide-react';

export const WhatIfLoadBalanceModal = ({ isOpen, onClose, defectData, onAssignmentConfirmed }) => {
  const [developers, setDevelopers] = useState([]);
  const [selectedDevId, setSelectedDevId] = useState('');
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDevs = async () => {
      try {
        const res = await authService.getUsers();
        const devs = (res.users || []).filter(u => ['Developer', 'DEVELOPER', 'Admin', 'Project Manager'].includes(u.role));
        setDevelopers(devs);
        if (devs.length > 0 && !selectedDevId) {
          setSelectedDevId(devs[0].id);
        }
      } catch (err) {
        console.error('Failed to load developers:', err);
      }
    };

    if (isOpen) {
      fetchDevs();
    }
  }, [isOpen]);

  const runSimulation = async () => {
    if (!selectedDevId) return;
    setLoading(true);
    setError('');
    try {
      const res = await aiService.whatIfAssignment(defectData, Number(selectedDevId));
      setSimulation(res);
    } catch (err) {
      console.error('What-if simulation error:', err);
      setError(err.response?.data?.error || 'Simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedDevId) {
      runSimulation();
    }
  }, [selectedDevId, isOpen]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'LOW':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">LOW</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">MEDIUM</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">HIGH</span>;
      case 'OVERLOADED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">OVERLOADED</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="What-If Defect Assignment Simulation"
      subtitle="Simulate assigning this defect to a target developer and project sprint impact"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-xs font-semibold text-slate-200">
            Select Target Developer for Simulation:
          </label>
          <div className="w-full sm:w-64">
            <Select
              value={selectedDevId}
              onChange={(e) => setSelectedDevId(e.target.value)}
              options={developers.map(d => ({ label: `${d.full_name} (${d.role})`, value: d.id }))}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {simulation && (
          <div className="space-y-4">
            {/* Pre vs Post Comparison Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                Target Developer: {simulation.target_developer?.full_name}
              </h4>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                {/* Pre-Assignment */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Current State</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Active Workload:</span>
                    <strong className="text-sm text-slate-100">{simulation.pre_assignment?.active_workload} defects</strong>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-300">Workload Status:</span>
                    {getStatusBadge(simulation.pre_assignment?.workload_status)}
                  </div>
                </div>

                {/* Post-Assignment */}
                <div className={`p-3 rounded-lg border space-y-1 ${
                  simulation.simulation_summary?.triggers_overload
                    ? 'bg-rose-950/30 border-rose-500/40'
                    : 'bg-indigo-950/30 border-indigo-500/40'
                }`}>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Simulated Post-Assignment</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">New Workload:</span>
                    <strong className="text-sm text-slate-100">{simulation.post_assignment?.active_workload} defects</strong>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-300">New Status:</span>
                    {getStatusBadge(simulation.post_assignment?.workload_status)}
                  </div>
                </div>
              </div>
            </div>

            {/* Overload Warning Banner */}
            {simulation.simulation_summary?.triggers_overload && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block mb-0.5">Overload Warning!</strong>
                  Assigning this defect will push {simulation.target_developer?.full_name} into <strong>OVERLOADED</strong> status. Consider assigning to another developer or rebalancing current tasks.
                </div>
              </div>
            )}

            {/* AI Recommendation & Sprint Impact */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h5 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Simulation Recommendation & Sprint Analysis
              </h5>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Assignment Suitability:</span>
                  <span className="font-semibold text-slate-200">{simulation.simulation_summary?.recommendation}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Estimated Sprint Completion Risk:</span>
                  <span className="font-semibold text-slate-200">{simulation.simulation_summary?.sprint_completion_risk}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400 block mb-1">Key Factors:</span>
                  <ul className="space-y-1">
                    {simulation.simulation_summary?.reasons?.map((reason, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="outline" onClick={onClose}>
            Close Simulation
          </Button>
          {simulation && onAssignmentConfirmed && (
            <Button
              variant="gradient"
              onClick={() => {
                onAssignmentConfirmed(Number(selectedDevId));
                onClose();
              }}
            >
              Confirm & Assign Developer
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
