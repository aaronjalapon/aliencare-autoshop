import { useAuth } from '@/context/AuthContext';
import { getRoleHome } from '@/router';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
    const { user, loading, refreshUser } = useAuth();
    const [searchParams] = useSearchParams();
    const processed = useRef(false);
    const status = searchParams.get('status');
    const errorMessage = searchParams.get('message');

    useEffect(() => {
        if (processed.current || loading) return;
        processed.current = true;

        if (status === 'success') {
            refreshUser();
        }
    }, [status, loading, refreshUser]);

    useEffect(() => {
        if (loading) return;

        if (user) {
            window.location.href = getRoleHome(user.role);
        } else if (status === 'error') {
            const params = new URLSearchParams();
            params.set('error', errorMessage || 'Social login failed. Please try again.');
            window.location.href = '/login?' + params.toString();
        } else {
            window.location.href = '/login';
        }
    }, [user, loading, status, errorMessage]);

    return (
        <div className="flex min-h-dvh items-center justify-center bg-[#050505]">
            <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-8 w-8 animate-spin text-[#d4af37]" />
                <p className="text-sm text-white/60">
                    {status === 'error' ? 'Authentication failed. Redirecting...' : 'Completing sign in...'}
                </p>
            </div>
        </div>
    );
}
