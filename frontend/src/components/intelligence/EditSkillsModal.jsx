import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { aiService } from '../../services/aiService';
import { Code, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const EditSkillsModal = ({ isOpen, onClose, developer, onUpdated }) => {
  const [formData, setFormData] = useState({
    primary_languages: '',
    frameworks: '',
    preferred_categories: '',
    preferred_modules: '',
    experience_rating: 3
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (developer) {
      const profile = developer.skill_profile || {};
      const langs = Array.isArray(profile.primary_languages)
        ? profile.primary_languages.join(', ')
        : (profile.primary_languages || developer.skills || '');
      const frameworks = Array.isArray(profile.frameworks)
        ? profile.frameworks.join(', ')
        : (profile.frameworks || '');
      const categories = Array.isArray(profile.preferred_categories)
        ? profile.preferred_categories.join(', ')
        : (profile.preferred_categories || '');
      const modules = Array.isArray(profile.preferred_modules)
        ? profile.preferred_modules.join(', ')
        : (profile.preferred_modules || '');

      setFormData({
        primary_languages: langs,
        frameworks: frameworks,
        preferred_categories: categories,
        preferred_modules: modules,
        experience_rating: profile.experience_rating || 3
      });
      setError('');
      setSuccessMsg('');
    }
  }, [developer, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!developer) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await aiService.updateDeveloperSkills(developer.user_id || developer.id, formData);
      setSuccessMsg('Developer skill profile updated successfully!');
      if (onUpdated) onUpdated();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update skills:', err);
      setError(err.response?.data?.error || 'Failed to update skill profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Maintain Skill Profile: ${developer?.full_name || developer?.username}`}
      subtitle="Update languages, frameworks, preferred modules, and experience ratings"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            {successMsg}
          </div>
        )}

        <Input
          label="Primary Languages (comma separated)"
          placeholder="e.g. Python, JavaScript, SQL, C++"
          value={formData.primary_languages}
          onChange={(e) => setFormData({ ...formData, primary_languages: e.target.value })}
        />

        <Input
          label="Frameworks & Tools (comma separated)"
          placeholder="e.g. React, Flask, Node.js, Pytest, Docker"
          value={formData.frameworks}
          onChange={(e) => setFormData({ ...formData, frameworks: e.target.value })}
        />

        <Input
          label="Preferred Defect Categories (comma separated)"
          placeholder="e.g. Authentication, API, Payment, Database"
          value={formData.preferred_categories}
          onChange={(e) => setFormData({ ...formData, preferred_categories: e.target.value })}
        />

        <Input
          label="Preferred Component Modules (comma separated)"
          placeholder="e.g. AuthController, PaymentGateway, UI"
          value={formData.preferred_modules}
          onChange={(e) => setFormData({ ...formData, preferred_modules: e.target.value })}
        />

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
            Experience & Expertise Rating (1 to 5)
          </label>
          <select
            value={formData.experience_rating}
            onChange={(e) => setFormData({ ...formData, experience_rating: Number(e.target.value) })}
            className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl p-2.5 outline-none focus:border-indigo-500"
          >
            <option value={1}>1 - Junior / Entry Level</option>
            <option value={2}>2 - Intermediate Developer</option>
            <option value={3}>3 - Experienced Specialist</option>
            <option value={4}>4 - Senior Software Engineer</option>
            <option value={5}>5 - Lead Architect / Subject Expert</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="gradient" isLoading={loading} icon={Save} type="submit">
            Save Skill Profile
          </Button>
        </div>
      </form>
    </Modal>
  );
};
