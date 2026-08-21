import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Bug, FolderKanban, Users, Sparkles, 
  Camera, BarChart3, Settings, Shield, ChevronRight, FileText, CheckCircle, Rocket, Plus
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const getRoleNavItems = (role) => {
    const normRole = (role || '').toUpperCase();

    const common = [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Report Defect', path: '/report', icon: Plus },
      { name: 'Projects', path: '/projects', icon: FolderKanban },
      { name: 'Sprints', path: '/sprints', icon: Rocket },
      { name: 'Defects & Bugs', path: '/issues', icon: Bug },
      { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    ];

    if (normRole.includes('ADMIN')) {
      return [
        ...common,
        { name: 'User Management', path: '/users-management', icon: Users },
        { name: 'System Settings', path: '/settings', icon: Settings },
      ];
    } else if (normRole.includes('DEV')) {
      return [
        ...common,
        { name: 'Assigned Defects', path: '/assigned-issues', icon: CheckCircle },
      ];
    } else if (normRole.includes('REPORT')) {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Report Defect', path: '/report', icon: Plus },
        { name: 'My Reported Defects', path: '/my-bugs', icon: Bug },
        { name: 'Defect Hub', path: '/issues', icon: Bug },
        { name: 'Projects', path: '/projects', icon: FolderKanban },
      ];
    } else if (normRole.includes('TEST') || normRole.includes('QA')) {
      return [
        ...common,
        { name: 'Reported Defects', path: '/my-bugs', icon: Bug },
      ];
    } else if (normRole.includes('MANAGER')) {
      return [
        ...common,
        { name: 'Project Health', path: '/project-health', icon: BarChart3 },
      ];
    }
    return common;
  };

  const navItems = getRoleNavItems(user?.role);

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Bug className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wider bg-gradient-to-r from-white via-indigo-200 to-slate-400 bg-clip-text text-transparent">
              BugFlow<span className="text-xs text-indigo-400 font-normal ml-1">AI</span>
            </h1>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block -mt-1">
              Enterprise v1.0
            </span>
          </div>
        </div>

        {/* User Role Badge Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
          <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Active Scope
            </span>
            <span className="text-xs font-semibold text-slate-200 truncate block">
              {user?.role} Workspace
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="px-3 space-y-1 mt-2">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-lg shadow-indigo-500/10 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isActive ? 'text-indigo-400 translate-x-0.5' : 'text-transparent group-hover:text-slate-500'
                  }`}
                />
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer User Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/60 transition-colors"
        >
          <img
            src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
            alt={user?.full_name}
            className="w-8 h-8 rounded-full border border-slate-700 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.department || user?.email}</p>
          </div>
        </NavLink>
      </div>
    </aside>
  );
};
