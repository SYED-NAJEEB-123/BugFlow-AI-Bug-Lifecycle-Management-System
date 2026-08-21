import React from 'react';

export const Card = ({
  children,
  className = '',
  glass = true,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl transition-all duration-200 ${
        glass ? 'glass-panel shadow-xl' : 'bg-slate-900 border border-slate-800'
      } ${
        hoverable ? 'hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-indigo-500/10' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
