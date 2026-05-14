import { api } from './api';

export interface SystemSettingsResponse {
    settings: Record<string, unknown>;
    can_manage: boolean;
}

export interface UserPreferencesResponse {
    preferences: Record<string, unknown>;
}

class SettingsService {
    async getSystemSettings(group?: string): Promise<SystemSettingsResponse> {
        const params = group ? `?group=${encodeURIComponent(group)}` : '';
        return api.get(`/settings/system${params}`);
    }

    async updateSystemSettings(settings: Record<string, unknown>): Promise<SystemSettingsResponse & { message: string }> {
        return api.put('/settings/system', { settings });
    }

    async getUserPreferences(): Promise<UserPreferencesResponse> {
        return api.get('/settings/preferences');
    }

    async updateUserPreferences(preferences: Record<string, unknown>): Promise<UserPreferencesResponse & { message: string }> {
        return api.put('/settings/preferences', { preferences });
    }
}

export const settingsService = new SettingsService();
