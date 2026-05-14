/**
 * React hook for dashboard analytics data
 * Provides real-time dashboard metrics with loading states and error handling
 */

import { reportsService } from '@/services/reportsService';
import { DashboardAnalytics } from '@/types/inventory';
import { useCallback, useEffect, useState } from 'react';

export function useDashboardAnalytics() {
    const [data, setData] = useState<DashboardAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await reportsService.getDashboardAnalytics();
            setData(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch dashboard analytics');
            console.error('Error fetching dashboard analytics:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const refresh = useCallback(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return {
        data,
        loading,
        error,
        refresh,
    };
}
