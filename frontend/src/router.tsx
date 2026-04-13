import { useAuth } from '@/context/AuthContext';
import { customerService } from '@/services/customerService';
import type { UserRole } from '@/types';
import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

function getRoleHome(role: UserRole): string {
    switch (role) {
        case 'admin':
            return '/admin';
        case 'customer':
            return '/customer';
        default:
            return '/dashboard';
    }
}

function FullScreenLoading() {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );
}

export function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: UserRole[] }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <FullScreenLoading />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={getRoleHome(user.role)} replace />;
    }

    return <>{children}</>;
}

export function GuestRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <FullScreenLoading />;
    }

    if (user) {
        return <Navigate to={getRoleHome(user.role)} replace />;
    }

    return <>{children}</>;
}

function CustomerOnboardingGate({ children, requireCompleted }: { children: ReactNode; requireCompleted: boolean }) {
    const { user, loading } = useAuth();
    const [checking, setChecking] = useState(true);
    const [onboardingCompleted, setOnboardingCompleted] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const checkStatus = async () => {
            if (!user || user.role !== 'customer') {
                if (!cancelled) {
                    setOnboardingCompleted(true);
                    setChecking(false);
                }
                return;
            }

            setChecking(true);

            try {
                const response = await customerService.getOnboardingStatus();
                if (!cancelled) {
                    setOnboardingCompleted(response.data.onboarding_completed);
                }
            } catch {
                if (!cancelled) {
                    // Fail-safe: treat errors as incomplete so onboarding can recover profile linkage.
                    setOnboardingCompleted(false);
                }
            } finally {
                if (!cancelled) {
                    setChecking(false);
                }
            }
        };

        checkStatus();

        return () => {
            cancelled = true;
        };
    }, [user]);

    if (loading || checking) {
        return <FullScreenLoading />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'customer') {
        return <Navigate to={getRoleHome(user.role)} replace />;
    }

    if (requireCompleted && !onboardingCompleted) {
        return <Navigate to="/customer/onboarding" replace />;
    }

    if (!requireCompleted && onboardingCompleted) {
        return <Navigate to="/customer" replace />;
    }

    return <>{children}</>;
}

export function CustomerOnboardingOnlyRoute({ children }: { children: ReactNode }) {
    return <CustomerOnboardingGate requireCompleted={false}>{children}</CustomerOnboardingGate>;
}
