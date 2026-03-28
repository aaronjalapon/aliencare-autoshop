import { User } from '@/types';
import { api } from './api';

export interface LoginData {
    email: string;
    password: string;
    remember?: boolean;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export interface ResetPasswordData {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
}

class AuthService {
    async login(data: LoginData): Promise<{ message: string; user: User }> {
        await api.getCsrfCookie();
        return api.post('/auth/login', {
            ...data,
            email: data.email.trim(),
        });
    }

    async register(data: RegisterData): Promise<{ message: string; user: User }> {
        await api.getCsrfCookie();
        return api.post('/auth/register', data);
    }

    async logout(): Promise<{ message: string }> {
        return api.post('/auth/logout');
    }

    async getUser(): Promise<User> {
        return api.get('/user');
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        await api.getCsrfCookie();
        return api.post('/auth/forgot-password', { email });
    }

    async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
        await api.getCsrfCookie();
        return api.post('/auth/reset-password', data);
    }

    async confirmPassword(password: string): Promise<{ message: string }> {
        return api.post('/auth/confirm-password', { password });
    }

    async sendVerificationEmail(): Promise<{ message: string }> {
        return api.post('/auth/email/verification-notification');
    }

    async getProfile(): Promise<{ user: User; mustVerifyEmail: boolean }> {
        return api.get('/settings/profile');
    }

    async updateProfile(data: { name: string; email: string }): Promise<{ user: User; message: string }> {
        return api.patch('/settings/profile', data);
    }

    async updatePassword(data: { current_password: string; password: string; password_confirmation: string }): Promise<{ message: string }> {
        return api.put('/settings/password', data);
    }

    async deleteAccount(password: string): Promise<{ message: string }> {
        return api.delete('/settings/profile', { password });
    }
}

export const authService = new AuthService();
