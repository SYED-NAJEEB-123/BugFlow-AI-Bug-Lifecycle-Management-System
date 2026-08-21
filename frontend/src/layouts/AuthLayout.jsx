import React from 'react';
import { Outlet } from 'react-router-dom';
import { Bug, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-950 text-slate-100">
      {/* Background Animated Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}></div>
      <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left Hero Pitch Branding (Hidden on mobile) */}
        <div className="hidden md:flex md:col-span-5 flex-col justify-between space-y-8 pr-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-xl shadow-indigo-500/40">
                <Bug className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-white via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
                BugFlow
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 leading-tight">
              Enterprise AI-Powered Bug Lifecycle Platform
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accelerate your engineering workflow with Google Gemini AI triaging, automated screenshot analysis, solution generation, and role-based permissions.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl glass-card text-xs">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-slate-300">Google Gemini 2.5 Description Rewriting</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl glass-card text-xs">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-300">Instant AI Priority & Severity Prediction</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl glass-card text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">Role-Based Access Control (Admin, Dev, QA, PM)</span>
            </div>
          </div>
        </div>

        {/* Right Authentication Card Form */}
        <div className="col-span-1 md:col-span-7">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
