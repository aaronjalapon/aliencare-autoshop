import { getApiErrorMessage } from '@/lib/api-error-message';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertFilters, alertService, AlertStatistics } from '../services/alertService';
import type { AlertGenerationResult } from '../services/inventoryWorkspaceNormalizers';

interface UseAlertsState {
    alerts: Alert[];
    statistics: AlertStatistics | null;
    loading: boolean;
    error: string | null;
    pagination: {
        currentPage: number;
        lastPage: number;
        perPage: number;
        total: number;
    };
}

interface UseAlertsReturn extends UseAlertsState {
    fetchAlerts: (filters?: AlertFilters) => Promise<void>;
    fetchStatistics: () => Promise<void>;
    acknowledgeAlert: (alertId: number) => Promise<void>;
    bulkAcknowledgeAlerts: (alertIds: number[]) => Promise<{ acknowledged_count: number }>;
    generateLowStockAlerts: () => Promise<AlertGenerationResult>;
    cleanupAlerts: (days?: number) => Promise<{ deleted_count: number }>;
    refresh: () => Promise<void>;
}

export const useAlerts = (initialFilters: AlertFilters = {}): UseAlertsReturn => {
    const [state, setState] = useState<UseAlertsState>({
        alerts: [], // Ensure this is always an array
        statistics: null,
        loading: false,
        error: null,
        pagination: {
            currentPage: 1,
            lastPage: 1,
            perPage: 10,
            total: 0,
        },
    });

    const [currentFilters, setCurrentFilters] = useState<AlertFilters>(initialFilters);

    const setLoading = (loading: boolean) => {
        setState((prev) => ({ ...prev, loading }));
    };

    const setError = (error: string | null) => {
        setState((prev) => ({ ...prev, error }));
    };

    const fetchAlerts = useCallback(
        async (filters: AlertFilters = {}) => {
            try {
                setLoading(true);
                setError(null);

                const hasIncomingFilters = Object.keys(filters).length > 0;
                const newFilters = hasIncomingFilters ? { ...currentFilters, ...filters } : currentFilters;

                // Avoid updating filter state on every fetch call to prevent render loops.
                if (hasIncomingFilters) {
                    setCurrentFilters(newFilters);
                }

                const response = await alertService.getAlerts(newFilters);

                if (response.success && response.data) {
                    const alertsData = Array.isArray(response.data.data) ? response.data.data : [];

                    setState((prev) => ({
                        ...prev,
                        alerts: alertsData,
                        pagination: {
                            currentPage: response.data.current_page || 1,
                            lastPage: response.data.last_page || 1,
                            perPage: response.data.per_page || 10,
                            total: response.data.total || 0,
                        },
                    }));

                    if (alertsData.length === 0 && response.data.total === 0) {
                        try {
                            const generateResponse = await alertService.generateLowStockAlerts();
                            if (generateResponse.success && generateResponse.data.alerts_created > 0) {
                                const updatedResponse = await alertService.getAlerts(newFilters);
                                if (updatedResponse.success && updatedResponse.data) {
                                    const updatedAlertsData = Array.isArray(updatedResponse.data.data) ? updatedResponse.data.data : [];
                                    setState((prev) => ({
                                        ...prev,
                                        alerts: updatedAlertsData,
                                        pagination: {
                                            currentPage: updatedResponse.data.current_page || 1,
                                            lastPage: updatedResponse.data.last_page || 1,
                                            perPage: updatedResponse.data.per_page || 10,
                                            total: updatedResponse.data.total || 0,
                                        },
                                    }));
                                }
                            }
                        } catch {
                            // Generation failure should not block the page from rendering the empty state.
                        }
                    }
                } else {
                    setError(response.message || 'Failed to fetch alerts');
                    setState((prev) => ({ ...prev, alerts: [] }));
                }
            } catch (error) {
                setError(getApiErrorMessage(error, 'Failed to fetch alerts'));
                setState((prev) => ({ ...prev, alerts: [] }));
            } finally {
                setLoading(false);
            }
        },
        [currentFilters],
    );

    const fetchStatistics = useCallback(async () => {
        try {
            setError(null);
            const response = await alertService.getAlertStatistics();

            if (response.success) {
                setState((prev) => ({
                    ...prev,
                    statistics: response.data,
                }));
            } else {
                setError(response.message || 'Failed to fetch statistics');
            }
        } catch (error) {
            setError(getApiErrorMessage(error, 'Failed to fetch alert statistics'));
        }
    }, []);

    const acknowledgeAlert = useCallback(
        async (alertId: number) => {
            try {
                setError(null);
                const response = await alertService.acknowledgeAlert(alertId);

                if (response.success) {
                    // Update the alert in the local state
                    setState((prev) => ({
                        ...prev,
                        alerts: Array.isArray(prev.alerts)
                            ? prev.alerts.map((alert) =>
                                  alert.id === alertId ? { ...alert, acknowledged: true, acknowledged_at: new Date().toISOString() } : alert,
                              )
                            : [],
                    }));

                    // Refresh statistics to reflect the change
                    await fetchStatistics();
                } else {
                    setError(response.message || 'Failed to acknowledge alert');
                    throw new Error(response.message || 'Failed to acknowledge alert');
                }
            } catch (error) {
                setError(getApiErrorMessage(error, 'Failed to acknowledge alert'));
                throw error;
            }
        },
        [fetchStatistics],
    );

    const bulkAcknowledgeAlerts = useCallback(
        async (alertIds: number[]) => {
            try {
                setError(null);
                const response = await alertService.bulkAcknowledgeAlerts(alertIds);

                if (response.success) {
                    // Update alerts in local state
                    setState((prev) => ({
                        ...prev,
                        alerts: Array.isArray(prev.alerts)
                            ? prev.alerts.map((alert) =>
                                  alertIds.includes(alert.id) ? { ...alert, acknowledged: true, acknowledged_at: new Date().toISOString() } : alert,
                              )
                            : [],
                    }));

                    // Refresh statistics to reflect the changes
                    await fetchStatistics();

                    return response.data;
                } else {
                    setError(response.message || 'Failed to acknowledge alerts');
                    throw new Error(response.message || 'Failed to acknowledge alerts');
                }
            } catch (error) {
                setError(getApiErrorMessage(error, 'Failed to acknowledge alerts'));
                throw error;
            }
        },
        [fetchStatistics],
    );

    const generateLowStockAlerts = useCallback(async () => {
        try {
            setError(null);
            const response = await alertService.generateLowStockAlerts();

            if (response.success) {
                await Promise.all([fetchAlerts(), fetchStatistics()]);
                return response.data;
            } else {
                setError(response.message || 'Failed to generate alerts');
                throw new Error(response.message || 'Failed to generate alerts');
            }
        } catch (error) {
            setError(getApiErrorMessage(error, 'Failed to generate low stock alerts'));
            throw error;
        }
    }, [fetchAlerts, fetchStatistics]);

    const cleanupAlerts = useCallback(
        async (days: number = 30) => {
            try {
                setError(null);
                const response = await alertService.cleanupAlerts(days);

                if (response.success) {
                    await Promise.all([fetchAlerts(), fetchStatistics()]);
                    return response.data;
                } else {
                    setError(response.message || 'Failed to cleanup alerts');
                    throw new Error(response.message || 'Failed to cleanup alerts');
                }
            } catch (error) {
                setError(getApiErrorMessage(error, 'Failed to cleanup alerts'));
                throw error;
            }
        },
        [fetchAlerts, fetchStatistics],
    );

    const refresh = useCallback(async () => {
        await Promise.all([fetchAlerts(), fetchStatistics()]);
    }, [fetchAlerts, fetchStatistics]);

    // Initial data fetch
    useEffect(() => {
        fetchAlerts();
        fetchStatistics();
    }, [fetchAlerts, fetchStatistics]);

    return {
        ...state,
        alerts: Array.isArray(state.alerts) ? state.alerts : [],
        fetchAlerts,
        fetchStatistics,
        acknowledgeAlert,
        bulkAcknowledgeAlerts,
        generateLowStockAlerts,
        cleanupAlerts,
        refresh,
    };
};

export default useAlerts;
