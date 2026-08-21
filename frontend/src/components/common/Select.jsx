import React, { forwardRef } from 'react';

export const Select = forwardRef(({
  label,
  options = [],
  error,
  icon: Icon,
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
          <div className="absolute left-3.5 text-slate-400 pointer-events-none z-10">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <select
          ref={ref}
          className={`w-full bg-slate-900/90 border text-slate-100 text-sm rounded-lg py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer ${
            Icon ? 'pl-10 pr-8' : 'px-4 pr-8'
          } ${
            error
              ? 'border-rose-500/80 focus:border-rose-500'
              : 'border-slate-800 focus:border-indigo-500/80'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 pointer-events-none text-slate-400">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
      {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
    </div>
  );
});

Select.displayName = 'Select';
