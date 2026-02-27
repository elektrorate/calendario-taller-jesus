import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { session, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-base">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
                    <p className="text-[12px] text-neutral-textHelper uppercase tracking-widest font-light">
                        Verificando acceso...
                    </p>
                </div>
            </div>
        );
    }

    // No session → redirect to login
    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Session exists but profile hasn't loaded → send to login
    // (this prevents an infinite limbo state)
    if (!profile) {
        console.warn('ProtectedRoute: session exists but profile is null, redirecting to login');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role permissions
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
        if (profile.role === 'super_admin') {
            return <Navigate to="/admin" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
