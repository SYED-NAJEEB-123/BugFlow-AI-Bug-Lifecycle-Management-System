import React from 'react';

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    developer: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    tester: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    manager: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    critical: 'bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse',
    high: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    medium: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
    low: 'bg-slate-500/15 text-slate-400 border-slate-500/40',
    open: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    in_progress: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1 text-sm font-semibold'
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variants[variant] || variants.default} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};
