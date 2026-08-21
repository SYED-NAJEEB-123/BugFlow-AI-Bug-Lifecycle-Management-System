import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { Badge } from '../common/Badge';
import { 
  Search, Bell, Sparkles, Sun, Moon, Palette, User, 
  Settings, LogOut, ChevronDown, ShieldCheck, Bug
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleVariant = (role) => {
    switch (role) {
      case 'Admin': return 'admin';
      case 'Developer': return 'developer';
      case 'Tester': return 'tester';
      case 'Project Manager': return 'manager';
      default: return 'default';
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 glass-panel border-b border-slate-800/80 px-6 flex items-center justify-between">
      {/* Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bugs, projects, team members... (Ctrl+K)"
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Gemini AI Status Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>Gemini 2.5 Flash Engine Active</span>
        </div>

        {/* Theme Picker Dropdown */}
        <div className="relative">
          <button
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title="Change Theme"
          >
            <Palette className="w-4 h-4" />
          </button>

          {themeMenuOpen && (
            <div 
              className="absolute right-0 mt-2 w-40 glass-panel rounded-xl shadow-2xl p-2 z-50 border border-slate-800 text-xs"
              onMouseLeave={() => setThemeMenuOpen(false)}
            >
              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-slate-400 border-b border-slate-800/80 mb-1">
                Select Theme
              </div>
              <button
                onClick={() => { setTheme(THEMES.DEFAULT); setThemeMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 ${theme === THEMES.DEFAULT || !theme ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
              >
                <span>Default (Original)</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </button>
              <button
                onClick={() => { setTheme(THEMES.DARK); setThemeMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 ${theme === THEMES.DARK ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
              >
                <span>Dark Mode</span>
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setTheme(THEMES.LIGHT); setThemeMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 ${theme === THEMES.LIGHT ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
              >
                <span>Light Mode</span>
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setTheme(THEMES.BLUE); setThemeMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 ${theme === THEMES.BLUE ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}
              >
                <span>Deep Blue</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              </button>
              <button
                onClick={() => { setTheme(THEMES.PURPLE); setThemeMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 ${theme === THEMES.PURPLE ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}
              >
                <span>Neon Purple</span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              </button>
              <button
                onClick={() => { setTheme(THEMES.EMERALD); setThemeMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 ${theme === THEMES.EMERALD ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}
              >
                <span>Emerald Forest</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <button 
          className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
        </button>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-slate-800 mx-1"></div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-800"
          >
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'user'}`}
              alt={user?.full_name}
              className="w-8 h-8 rounded-full ring-2 ring-indigo-500/40 object-cover bg-slate-900"
            />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-200 leading-tight">
                {user?.full_name}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight flex items-center gap-1 mt-0.5">
                <Badge variant={getRoleVariant(user?.role)} size="sm">
                  {user?.role}
                </Badge>
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div 
              className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl shadow-2xl p-2 z-50 border border-slate-800"
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <div className="p-3 border-b border-slate-800/80 mb-1">
                <p className="text-xs font-semibold text-slate-200">{user?.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email}</p>
                <div className="mt-2">
                  <Badge variant={getRoleVariant(user?.role)} size="sm">
                    Role: {user?.role}
                  </Badge>
                </div>
              </div>

              <Link
                to="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <User className="w-4 h-4 text-indigo-400" />
                <span>Profile & Settings</span>
              </Link>

              <Link
                to="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Preferences</span>
              </Link>

              <div className="my-1 border-t border-slate-800"></div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
