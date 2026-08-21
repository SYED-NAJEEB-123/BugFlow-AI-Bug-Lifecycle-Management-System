import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ProfilePage } from '../pages/auth/ProfilePage';

import { DashboardContainer } from '../pages/dashboards/DashboardContainer';
import { ProjectListPage } from '../pages/projects/ProjectListPage';
import { IssueListPage } from '../pages/issues/IssueListPage';
import { IssueDetailPage } from '../pages/issues/IssueDetailPage';
import { SprintsPage } from '../pages/sprints/SprintsPage';
import { SprintDetailPage } from '../pages/sprints/SprintDetailPage';
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage';
import { SettingsPage } from '../pages/settings/SettingsPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected Enterprise Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardContainer />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/sprints" element={<SprintsPage />} />
        <Route path="/sprints/:id" element={<SprintDetailPage />} />
        <Route path="/issues" element={<IssueListPage />} />
        <Route path="/defects" element={<IssueListPage />} />
        <Route path="/bugs" element={<IssueListPage />} />
        <Route path="/report" element={<IssueListPage autoOpenReportModal={true} />} />
        <Route path="/report-issue" element={<IssueListPage autoOpenReportModal={true} />} />
        <Route path="/issues/:id" element={<IssueDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />

        {/* Role Specific Shortcuts */}
        <Route
          path="/users-management"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'ADMIN']}>
              <DashboardContainer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assigned-issues"
          element={
            <ProtectedRoute allowedRoles={['Developer', 'DEVELOPER', 'Admin', 'ADMIN']}>
              <IssueListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-solutions"
          element={
            <ProtectedRoute allowedRoles={['Developer', 'DEVELOPER', 'Admin', 'ADMIN']}>
              <IssueListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vision-analyzer"
          element={
            <ProtectedRoute allowedRoles={['Tester', 'QA_TESTER', 'REPORTER', 'Admin', 'ADMIN']}>
              <IssueListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bugs"
          element={
            <ProtectedRoute allowedRoles={['Tester', 'QA_TESTER', 'REPORTER', 'Admin', 'ADMIN']}>
              <IssueListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project-health"
          element={
            <ProtectedRoute allowedRoles={['Project Manager', 'PROJECT_MANAGER', 'Admin', 'ADMIN']}>
              <DashboardContainer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/release-notes"
          element={
            <ProtectedRoute allowedRoles={['Project Manager', 'PROJECT_MANAGER', 'Admin', 'ADMIN']}>
              <DashboardContainer />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Default Catch-All Redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
