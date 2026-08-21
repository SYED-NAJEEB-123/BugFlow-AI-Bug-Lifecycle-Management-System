import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { DevDashboard } from './DevDashboard';
import { TesterDashboard } from './TesterDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { ReporterDashboard } from './ReporterDashboard';

export const DashboardContainer = () => {
  const { user } = useAuth();

  switch (user?.role) {
    case 'Admin':
      return <AdminDashboard />;
    case 'Developer':
      return <DevDashboard />;
    case 'Tester':
      return <TesterDashboard />;
    case 'Project Manager':
      return <ManagerDashboard />;
    case 'Reporter':
      return <ReporterDashboard />;
    default:
      return <DevDashboard />;
  }
};
