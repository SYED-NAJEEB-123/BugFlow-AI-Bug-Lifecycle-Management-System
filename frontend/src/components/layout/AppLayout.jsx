import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const AppLayout = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Role-Filtered Sidebar */}
      <Sidebar />

      {/* Main Execution Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        {/* Scrollable Content Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
