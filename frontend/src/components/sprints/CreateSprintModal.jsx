import React, { useState, useEffect } from 'react';
import { sprintService } from '../../services/sprintService';
import { projectService } from '../../services/projectService';
import { useNotification } from '../../context/NotificationContext';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Rocket, Calendar, Target, Briefcase } from 'lucide-react';

export const CreateSprintModal = ({ isOpen, onClose, onSprintCreated, initialProjectId = null }) => {
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    project_id: initialProjectId || '',
    name: '',
    goal: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Planned'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { addNotification } = useNotification();

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects();
      const prjs = data.projects || [];
      setProjects(prjs);
      if (!formData.project_id && prjs.length > 0) {
        setFormData(prev => ({ ...prev, project_id: initialProjectId || prjs[0].id }));
      }
    } catch (err) {
      console.error("Failed to load projects for sprint creation:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.project_id || !formData.name || !formData.start_date || !formData.end_date) {
      setError('Please fill in all required fields: Project, Sprint Name, Start Date, and End Date');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError('End date cannot be earlier than start date');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sprintService.createSprint(formData);
      addNotification({
        title: 'Sprint Created!',
        message: `Created "${res.sprint.name}"`,
        type: 'success'
      });
      if (onSprintCreated) onSprintCreated(res.sprint);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create sprint. Please check details.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Sprint" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-medium">
            {error}
          </div>
        )}

        <Select
          label="Project *"
          value={formData.project_id}
          onChange={(e) => setFormData({ ...formData, project_id: parseInt(e.target.value) })}
          options={projects.map(p => ({ value: p.id, label: `${p.name} (${p.key})` }))}
          required
        />

        <Input
          label="Sprint Name *"
          placeholder="e.g. Sprint 01 — Authentication & Security"
          icon={Rocket}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sprint Goal / Scope</span>
          </label>
          <textarea
            rows={3}
            placeholder="Describe the primary goal, feature deliverables, or bug resolution target for this sprint..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            value={formData.goal}
            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Date *"
            type="date"
            icon={Calendar}
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />

          <Input
            label="End Date *"
            type="date"
            icon={Calendar}
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
          />
        </div>

        <Select
          label="Initial Status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          options={[
            { value: 'Planned', label: 'Planned' },
            { value: 'Active', label: 'Active (Starts Sprint Immediately)' }
          ]}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="gradient" isLoading={isLoading} icon={Rocket}>
            Create Sprint
          </Button>
        </div>
      </form>
    </Modal>
  );
};
