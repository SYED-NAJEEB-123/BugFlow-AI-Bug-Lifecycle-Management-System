import React from 'react';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { Sun, Moon, Palette, Check, Sparkles } from 'lucide-react';

export const ThemeSwitcher = ({ variant = 'dropdown' }) => {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { id: THEMES.DEFAULT, name: 'Default (Original)', icon: Sparkles, color: 'bg-slate-900 border-slate-800 text-slate-100' },
    { id: THEMES.DARK, name: 'BugFlow Dark', icon: Moon, color: 'bg-slate-950 border-slate-700 text-slate-200' },
    { id: THEMES.LIGHT, name: 'BugFlow Light', icon: Sun, color: 'bg-white border-slate-300 text-slate-900' },
    { id: THEMES.BLUE, name: 'Deep Ocean Blue', icon: Palette, color: 'bg-blue-950 border-blue-800 text-blue-200' },
    { id: THEMES.PURPLE, name: 'Neon Purple', icon: Palette, color: 'bg-purple-950 border-purple-800 text-purple-200' },
    { id: THEMES.EMERALD, name: 'Emerald Forest', icon: Palette, color: 'bg-emerald-950 border-emerald-800 text-emerald-200' },
  ];

  if (variant === 'buttons') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {themeOptions.map((t) => {
          const Icon = t.icon;
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-xs font-semibold transition-all ${t.color} ${
                isActive ? 'ring-2 ring-indigo-500 shadow-lg scale-[1.02]' : 'opacity-75 hover:opacity-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[11px] text-center">{t.name}</span>
              {isActive && <Check className="w-3.5 h-3.5 text-indigo-400 mt-0.5" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
    >
      <option value={THEMES.DEFAULT}>✨ Default (Original)</option>
      <option value={THEMES.DARK}>🌙 Dark Theme</option>
      <option value={THEMES.LIGHT}>☀️ Light Theme</option>
      <option value={THEMES.BLUE}>🌊 Deep Blue</option>
      <option value={THEMES.PURPLE}>🔮 Neon Purple</option>
      <option value={THEMES.EMERALD}>🌿 Emerald Forest</option>
    </select>
  );
};
