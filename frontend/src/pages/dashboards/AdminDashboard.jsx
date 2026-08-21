import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { authService } from '../../services/authService';
import { analyticsService } from '../../services/analyticsService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { 
  Users, FolderKanban, Bug, Shield, Sparkles, Activity, 
  UserCheck, ArrowUpRight, Plus, RefreshCw, UserX, AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [usersList, setUsersList] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uData, aData] = await Promise.all([
        authService.getUsers(roleFilter),
        analyticsService.getAnalytics()
      ]);
      setUsersList(uData.users || []);
      setAnalytics(aData);
    } catch (err) {
      addNotification({
        title: 'Error Loading State',
        message: err.response?.data?.error || 'Failed to fetch admin metrics',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [roleFilter]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await authService.updateUserRole(userId, { role: newRole });
      addNotification({
        title: 'Role Updated',
        message: `User role changed to ${newRole}`,
        type: 'success'
      });
      fetchAdminData();
    } catch (err) {
      addNotification({
        title: 'Failed to update role',
        message: err.response?.data?.error || 'Action forbidden',
        type: 'error'
      });
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin': return 'admin';
      case 'Developer': return 'developer';
      case 'Tester': return 'tester';
      case 'Project Manager': return 'manager';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const overview = analytics?.overview || {
    total_users: usersList.length,
    total_projects: 0,
    open_defects: 0,
    critical_defects: 0
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <span>Admin System Command Center</span>
            <Shield className="w-5 h-5 text-purple-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise overview: Manage users, roles, system health & Gemini AI services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchAdminData}>
            Refresh State
          </Button>
          <Link to="/projects">
            <Button variant="gradient" size="sm" icon={Plus}>
              Manage Projects
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registered Users</p>
            <h3 className="text-2xl font-black text-slate-100 mt-1">{usersList.length}</h3>
            <span className="text-[10px] text-purple-400 font-semibold flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3" /> Active RBAC Directory
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Projects</p>
            <h3 className="text-2xl font-black text-slate-100 mt-1">{overview.total_projects}</h3>
            <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1 mt-1">
              <FolderKanban className="w-3 h-3" /> Real DB Records
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <FolderKanban className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Open System Bugs</p>
            <h3 className="text-2xl font-black text-slate-100 mt-1">{overview.open_defects}</h3>
            <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 mt-1">
              <Bug className="w-3 h-3" /> {overview.critical_defects} Critical Triage
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Bug className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gemini AI Status</p>
            <h3 className="text-2xl font-black text-indigo-400 mt-1">Operational</h3>
            <span className="text-[10px] text-indigo-300 font-semibold flex items-center gap-1 mt-1">
              <Sparkles className="w-3 h-3" /> Vision & Text Engine
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* User Management Directory */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <span>User Directory & Role Permissions</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect user accounts and manage roles across Admin, Developer, Tester, and Project Manager
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Developer">Developer</option>
              <option value="Tester">Tester</option>
              <option value="Project Manager">Project Manager</option>
            </select>
          </div>
        </div>

        {usersList.length === 0 ? (
          <div className="p-8 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">No Registered Users</h4>
            <p className="text-xs text-slate-400">Users will appear here as team members register account credentials.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <img
                        src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                        alt={u.full_name}
                        className="w-8 h-8 rounded-full border border-slate-700 object-cover bg-slate-900"
                      />
                      <div>
                        <p className="font-semibold text-slate-200">{u.full_name}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={getRoleBadge(u.role)} size="sm">
                        {u.role}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {u.department || 'General'}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        u.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-[11px] text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        disabled={u.id === user?.id}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Developer">Developer</option>
                        <option value="Tester">Tester</option>
                        <option value="Project Manager">Project Manager</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
