import { authService } from '@/services/authService';
import type { User } from '@/types';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string, remember?: boolean) => Promise<void>;
    register: (name: string, email: string, password: string, password_confirmation: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const userData = await authService.getUser();
            setUser(userData);
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        refreshUser().finally(() => setLoading(false));
    }, [refreshUser]);

    const login = async (email: string, password: string, remember?: boolean) => {
        const response = await authService.login({ email, password, remember });
        setUser(response.user);
    };

    const register = async (name: string, email: string, password: string, password_confirmation: string) => {
        const response = await authService.register({ name, email, password, password_confirmation });
        setUser(response.user);
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    return <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
