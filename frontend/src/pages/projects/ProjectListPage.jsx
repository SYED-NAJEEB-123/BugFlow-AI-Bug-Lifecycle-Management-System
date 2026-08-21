import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { projectService } from '../../services/projectService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { ProjectModal } from '../../components/projects/ProjectModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { 
  FolderKanban, Plus, Search, Filter, Users, Calendar, 
  Edit3, Trash2, MoreVertical, Sparkles, ExternalLink 
} from 'lucide-react';

export const ProjectListPage = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const canManageProjects = user?.role === 'Admin' || user?.role === 'Project Manager';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await projectService.getProjects(searchQuery, statusFilter);
      setProjects(data.projects || []);
    } catch (err) {
      addNotification({
        title: 'Error Loading Projects',
        message: err.response?.data?.error || 'Failed to fetch project repository',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (prj) => {
    setEditingProject(prj);
    setIsModalOpen(true);
  };

  const handleDeletePrompt = (prj) => {
    setDeletingProject(prj);
    setIsDeleteModalOpen(true);
  };

  const handleSaveProject = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingProject) {
        await projectService.updateProject(editingProject.id, formData);
        addNotification({
          title: 'Project Updated',
          message: `Project "${formData.name}" has been updated`,
          type: 'success'
        });
      } else {
        await projectService.createProject(formData);
        addNotification({
          title: 'Project Created',
          message: `New project "${formData.name}" initialized`,
          type: 'success'
        });
      }
      setIsModalOpen(false);
      fetchProjects();
    } catch (err) {
      addNotification({
        title: 'Save Failed',
        message: err.response?.data?.error || 'Could not save project',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    setIsSubmitting(true);
    try {
      await projectService.deleteProject(deletingProject.id);
      addNotification({
        title: 'Project Deleted',
        message: `Project "${deletingProject.name}" removed`,
        type: 'success'
      });
      setIsDeleteModalOpen(false);
      setDeletingProject(null);
      fetchProjects();
    } catch (err) {
      addNotification({
        title: 'Delete Failed',
        message: err.response?.data?.error || 'Could not delete project',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <span>Enterprise Projects Portfolio</span>
            <FolderKanban className="w-5 h-5 text-indigo-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage repository scopes, developer teams, and milestone completion percentages
          </p>
        </div>

        {canManageProjects && (
          <Button variant="gradient" icon={Plus} onClick={handleCreateProject}>
            Create New Project
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, key, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: '', name: 'All Statuses' },
            { id: 'Active', name: 'Active' },
            { id: 'Completed', name: 'Completed' },
            { id: 'Archived', name: 'Archived' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st.id
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              {st.name}
            </button>
          ))}
        </div>
      </Card>

      {/* Projects Grid */}
      {loading ? (
        <Spinner size="lg" className="py-12" />
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Projects Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter
              ? 'No projects matched your search filters.'
              : 'No project repositories have been initialized yet.'}
          </p>
          {canManageProjects && !searchQuery && (
            <Button variant="primary" icon={Plus} onClick={handleCreateProject} className="mt-2">
              Create First Project
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <Card key={p.id} className="p-6 flex flex-col justify-between hoverable group">
              <div className="space-y-3">
                {/* Card Top Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      {p.key}
                    </span>
                    <Badge variant={p.status === 'Active' ? 'developer' : p.status === 'Completed' ? 'resolved' : 'default'}>
                      {p.status}
                    </Badge>
                  </div>

                  {canManageProjects && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditProject(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="Edit Project"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {p.description || 'No description provided.'}
                </p>
              </div>

              {/* Progress & Team Footer */}
              <div className="space-y-3 mt-6 pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  {/* Team Avatars */}
                  <div className="flex items-center -space-x-2 overflow-hidden">
                    {p.members && p.members.length > 0 ? (
                      p.members.slice(0, 4).map((m, idx) => (
                        <img
                          key={idx}
                          src={m.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user_id}`}
                          alt={m.user?.full_name || 'Member'}
                          title={`${m.user?.full_name} (${m.role_in_project})`}
                          className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 object-cover bg-slate-900"
                        />
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> No members
                      </span>
                    )}
                    {p.members && p.members.length > 4 && (
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-800 ring-2 ring-slate-900 text-[9px] font-bold text-slate-300">
                        +{p.members.length - 4}
                      </span>
                    )}
                  </div>

                  <span className="font-bold text-indigo-400">{Math.round(p.progress_percentage)}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, p.progress_percentage))}%` }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveProject}
        project={editingProject}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Project Repository"
        itemName={deletingProject ? `${deletingProject.name} (${deletingProject.key})` : 'project'}
        isLoading={isSubmitting}
      />
    </div>
  );
};
