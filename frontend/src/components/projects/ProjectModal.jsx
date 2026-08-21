import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { authService } from '../../services/authService';
import { FolderKanban, Key, Calendar, FileText, Check, Users, Save, Plus } from 'lucide-react';

export const ProjectModal = ({
  isOpen,
  onClose,
  onSubmit,
  project = null,
  isLoading = false
}) => {
  const isEditing = !!project;

  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    status: 'Active',
    progress_percentage: 0,
    target_end_date: '',
    member_ids: []
  });

  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchSystemUsers = async () => {
      try {
        const data = await authService.getUsers();
        setUsers(data.users || []);
      } catch (err) {
        console.error('Failed to load users for project modal:', err);
      }
    };

    if (isOpen) {
      fetchSystemUsers();

      if (project) {
        setFormData({
          name: project.name || '',
          key: project.key || '',
          description: project.description || '',
          status: project.status || 'Active',
          progress_percentage: project.progress_percentage || 0,
          target_end_date: project.target_end_date ? project.target_end_date.split('T')[0] : '',
          member_ids: project.members ? project.members.map(m => m.user_id) : []
        });
      } else {
        setFormData({
          name: '',
          key: '',
          description: '',
          status: 'Active',
          progress_percentage: 0,
          target_end_date: '',
          member_ids: []
        });
      }
    }
  }, [isOpen, project]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    const autoKey = val.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
    setFormData((prev) => ({
      ...prev,
      name: val,
      key: !isEditing && (!prev.key || prev.key.length <= 4) ? autoKey : prev.key
    }));
  };

  const toggleMemberSelection = (userId) => {
    setFormData((prev) => {
      const exists = prev.member_ids.includes(userId);
      return {
        ...prev,
        member_ids: exists
          ? prev.member_ids.filter(id => id !== userId)
          : [...prev.member_ids, userId]
      };
    });
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Project: ${project.name}` : 'Create New Project'}
      subtitle={isEditing ? 'Update project settings and team members' : 'Initialize a new repository scope for tracking bugs'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmitForm} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Project Name *"
            placeholder="e.g. Mobile Client App"
            icon={FolderKanban}
            value={formData.name}
            onChange={handleNameChange}
            containerClassName="sm:col-span-2"
            required
          />

          <Input
            label="Project Key *"
            placeholder="e.g. MOB"
            icon={Key}
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
            disabled={isEditing}
            helperText={isEditing ? 'Key is immutable' : 'Unique 2-5 letter tag'}
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Detailed overview of project scope, objectives, and repositories..."
            className="w-full bg-slate-900/90 border border-slate-800 text-slate-100 text-sm rounded-lg p-3 focus:outline-none focus:border-indigo-500/80 transition-colors"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Project Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { label: 'Active', value: 'Active' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Archived', value: 'Archived' }
            ]}
          />

          <Input
            label="Target End Date"
            type="date"
            icon={Calendar}
            value={formData.target_end_date}
            onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })}
          />
        </div>

        {isEditing && (
          <div>
            <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              <span>Overall Progress Completion</span>
              <span className="text-indigo-400 font-bold">{formData.progress_percentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress_percentage}
              onChange={(e) => setFormData({ ...formData, progress_percentage: e.target.value })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        )}

        {/* Team Members Assignment Selection */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Assign Team Members ({formData.member_ids.length} Selected)</span>
          </label>

          <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-900/80 border border-slate-800 p-2 space-y-1">
            {users.map((u) => {
              const isSelected = formData.member_ids.includes(u.id);

              return (
                <div
                  key={u.id}
                  onClick={() => toggleMemberSelection(u.id)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/40'
                      : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={u.avatar_url}
                      alt={u.full_name}
                      className="w-6 h-6 rounded-full border border-slate-700 object-cover"
                    />
                    <div>
                      <span className="font-semibold">{u.full_name}</span>
                      <span className="text-[10px] text-slate-400 ml-2">({u.role})</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gradient"
            isLoading={isLoading}
            icon={isEditing ? Save : Plus}
          >
            {isEditing ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
