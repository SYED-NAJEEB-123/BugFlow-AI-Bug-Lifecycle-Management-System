import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  helperText,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-slate-900/80 border text-slate-100 placeholder-slate-500 text-sm rounded-lg py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
            Icon ? 'pl-10 pr-4' : 'px-4'
          } ${
            error
              ? 'border-rose-500/80 focus:border-rose-500'
              : 'border-slate-800 focus:border-indigo-500/80'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
      {helperText && !error && <span className="text-xs text-slate-500">{helperText}</span>}
    </div>
  );
});

Input.displayName = 'Input';
