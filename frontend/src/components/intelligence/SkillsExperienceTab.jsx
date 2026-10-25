import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { EditSkillsModal } from './EditSkillsModal';
import { SkillMatrixChart } from './SkillMatrixChart';
import { 
  Code, Wrench, BookOpen, User, Edit, Award, 
  CheckCircle2, Activity, Layers, Database 
} from 'lucide-react';

export const SkillsExperienceTab = ({ developers, onSkillsUpdated }) => {
  const safeDevs = Array.isArray(developers) ? developers : [];
  const [editingDev, setEditingDev] = useState(null);

  return (
    <div className="space-y-6">
      {/* Skill x Workload Scatter Matrix */}
      <SkillMatrixChart developers={safeDevs} />

      {/* Developer Skill Profiles Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-400" />
              Developer Expertise Profiles & Historical Experience
            </h3>
            <p className="text-xs text-slate-400">Declared technical skills, inferred domain categories, and historical defect resolution counts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeDevs.map((dev) => {
            const profile = dev.skill_profile || {};
            const langs = Array.isArray(profile.primary_languages)
              ? profile.primary_languages
              : (profile.primary_languages || dev.skills || 'Python, JavaScript').split(',');
            const frameworks = Array.isArray(profile.frameworks)
              ? profile.frameworks
              : (profile.frameworks || 'React, Flask').split(',');

            return (
              <div key={dev.user_id || dev.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-sm">
                        {dev.full_name?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{dev.full_name}</h4>
                        <span className="text-xs text-slate-400">{dev.role} • Rating: <strong className="text-amber-400">{profile.experience_rating || 3}/5 Stars</strong></span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={Edit}
                      onClick={() => setEditingDev(dev)}
                    >
                      Edit Skills
                    </Button>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Languages & Tech:</span>
                      <div className="flex flex-wrap gap-1">
                        {langs.map((l, i) => (
                          <span key={i} className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-900 border border-slate-800 text-indigo-300">
                            {typeof l === 'string' ? l.trim() : l}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Frameworks & Modules:</span>
                      <div className="flex flex-wrap gap-1">
                        {frameworks.map((f, i) => (
                          <span key={i} className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-900 border border-slate-800 text-cyan-300">
                            {typeof f === 'string' ? f.trim() : f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Completed: <strong className="text-emerald-400">{dev.completed_count} defects</strong></span>
                  <span>Active Workload: <strong className="text-amber-400">{dev.open_workload} bugs</strong></span>
                  <span>Completion Rate: <strong className="text-slate-200">{dev.completion_rate}%</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Skills Modal */}
      {editingDev && (
        <EditSkillsModal
          isOpen={!!editingDev}
          onClose={() => setEditingDev(null)}
          developer={editingDev}
          onUpdated={onSkillsUpdated}
        />
      )}
    </div>
  );
};
