import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Settings, Palette, Bell, Shield, Check, Info } from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { addNotification } = useNotification();

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [aiAlerts, setAiAlerts] = useState(true);

  const handleSavePreferences = () => {
    addNotification({
      title: 'Preferences Saved',
      message: 'Your system and notification settings have been updated.',
      type: 'success'
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <span>Preferences & Workspace Settings</span>
          <Settings className="w-5 h-5 text-cyan-400" />
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Customize your BugFlow theme, notification frequencies, and account defaults
        </p>
      </div>

      {/* Theme Settings */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Palette className="w-4 h-4 text-indigo-400" />
          <span>Visual Theme Customization</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: THEMES.DARK, name: 'Dark Mode', desc: 'Sleek dark slate with glassmorphism', color: 'bg-slate-900 border-slate-700' },
            { id: THEMES.LIGHT, name: 'Light Mode', desc: 'High contrast clean white canvas', color: 'bg-slate-100 border-slate-300 text-slate-900' },
            { id: THEMES.BLUE, name: 'Deep Blue', desc: 'Azure DevOps & AWS style blue accent', color: 'bg-blue-950 border-blue-800' },
            { id: THEMES.PURPLE, name: 'Neon Purple', desc: 'Vibrant Linear & Cyberpunk purple glow', color: 'bg-purple-950 border-purple-800' },
            { id: THEMES.EMERALD, name: 'Emerald Forest', desc: 'Refreshing forest emerald accent', color: 'bg-emerald-950 border-emerald-800' },
          ].map((t) => (
            <div
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${t.color} ${
                theme === t.id ? 'ring-2 ring-indigo-500 font-bold shadow-lg' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold">{t.name}</span>
                {theme === t.id && <Check className="w-4 h-4 text-indigo-400" />}
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Bell className="w-4 h-4 text-amber-400" />
          <span>Notification Alerts</span>
        </h3>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl glass-card cursor-pointer">
            <div>
              <p className="font-semibold text-slate-200">Email Notifications on Bug Assignment</p>
              <p className="text-[10px] text-slate-400">Receive instant alerts when a bug is assigned to you</p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl glass-card cursor-pointer">
            <div>
              <p className="font-semibold text-slate-200">Gemini AI Automated Solution Alerts</p>
              <p className="text-[10px] text-slate-400">Notify when Gemini completes root cause & solution reports</p>
            </div>
            <input
              type="checkbox"
              checked={aiAlerts}
              onChange={(e) => setAiAlerts(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500"
            />
          </label>
        </div>

        <Button variant="primary" onClick={handleSavePreferences}>
          Save Preferences
        </Button>
      </Card>

      {/* Account Info Card */}
      <Card className="p-6 space-y-3">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Info className="w-4 h-4 text-emerald-400" />
          <span>System Information</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-slate-400 font-medium">Platform</p>
            <p className="text-slate-200 font-mono mt-0.5">BugFlow Enterprise v1.0</p>
          </div>
          <div>
            <p className="text-slate-400 font-medium">AI Engine</p>
            <p className="text-indigo-400 font-mono mt-0.5">Google Gemini 2.5 Flash</p>
          </div>
          <div>
            <p className="text-slate-400 font-medium">User Role</p>
            <Badge variant="default" size="sm">{user?.role}</Badge>
          </div>
          <div>
            <p className="text-slate-400 font-medium">Authentication</p>
            <p className="text-emerald-400 font-mono mt-0.5">JWT Secured</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
