import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/common/Spinner';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleNorm = (user?.role || '').trim().toUpperCase();
    const hasRole = allowedRoles.some(r => r.trim().toUpperCase() === userRoleNorm);
    if (!hasRole) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Access Denied</h2>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            Your role (<span className="font-semibold text-rose-400">{user?.role}</span>) does not have authorization to view this enterprise module. Required permissions: {allowedRoles.join(', ')}.
          </p>
          <Button variant="secondary" icon={ArrowLeft} onClick={() => window.history.back()}>
            Return Previous Page
          </Button>
        </div>
      );
    }
  }

  return children;
};
