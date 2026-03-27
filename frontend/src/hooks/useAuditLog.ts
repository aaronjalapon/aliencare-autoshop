/**
 * Custom hook for managing audit log state and real-time updates
 */

import { auditService } from '@/services/auditService';
import { AuditLog, AuditLogFilters, AuditStats, AuditTransaction } from '@/types/inventory';
import { inventoryEvents } from '@/utils/inventoryEvents';
import { useCallback, useEffect, useState } from 'react';

interface UseAuditLogReturn {
    // Data
    transactions: AuditTransaction[];
    archives: AuditLog[];
    stats: AuditStats;

    // State
    loading: boolean;
    error: string | null;
    refreshing: boolean;

    // Actions
    refresh: () => Promise<void>;
    updateFilters: (filters: AuditLogFilters) => void;
    setAutoRefresh: (enabled: boolean) => void;

    // Filters
    filters: AuditLogFilters;

    // Real-time status
    isRealTime: boolean;
    lastUpdated: Date | null;
}

const DEFAULT_FILTERS: AuditLogFilters = {
    per_page: 50,
    page: 1,
    entity_type: 'all'
};

const DEFAULT_STATS: AuditStats = {
    total_transactions: 0,
    today_transactions: 0,
    week_transactions: 0,
    month_transactions: 0,
    unique_users: 0,
    transaction_types: [],
    users: []
};

export function useAuditLog(initialFilters: AuditLogFilters = {}): UseAuditLogReturn {
    // State management
    const [transactions, setTransactions] = useState<AuditTransaction[]>([]);
    const [archives, setArchives] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats>(DEFAULT_STATS);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<AuditLogFilters>({ ...DEFAULT_FILTERS, ...initialFilters });
    const [isRealTime, setIsRealTime] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Fetch audit data
    const fetchAuditData = useCallback(async (showRefreshing = false) => {
        try {
            if (showRefreshing) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const data = await auditService.getCombinedAuditData(filters);

            setTransactions(data.transactions);
            setArchives(data.archives);
            setStats(data.stats);
            setLastUpdated(new Date());

        } catch (err) {
            console.error('Error fetching audit data:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while fetching audit data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filters]);

    // Manual refresh function
    const refresh = useCallback(async () => {
        await fetchAuditData(true);
    }, [fetchAuditData]);

    // Update filters
    const updateFilters = useCallback((newFilters: AuditLogFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    // Auto-refresh functionality
    const setAutoRefresh = useCallback((enabled: boolean) => {
        setIsRealTime(enabled);
    }, []);

    // Initial data fetch
    useEffect(() => {
        fetchAuditData();
    }, [fetchAuditData]);

    // Auto-refresh when real-time is enabled
    useEffect(() => {
        if (!isRealTime) return;

        const interval = setInterval(() => {
            fetchAuditData(true);
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [isRealTime, fetchAuditData]);

    // Real-time updates using event dispatcher
    useEffect(() => {
        if (!isRealTime) return;

        // Listen for inventory events that should trigger audit log refresh
        const cleanup = inventoryEvents.listenMultiple(
            ['inventory-updated', 'reservation-updated', 'stock-transaction', 'audit-log-updated'],
            (eventData) => {
                console.log('Audit log received event:', eventData.type, eventData.data);
                // Small delay to ensure backend has processed the change
                setTimeout(() => {
                    fetchAuditData(true);
                }, 1000);
            }
        );

        // Listen for window focus to refresh data when user returns to tab
        const handleWindowFocus = () => {
            if (document.visibilityState === 'visible') {
                fetchAuditData(true);
            }
        };

        document.addEventListener('visibilitychange', handleWindowFocus);

        return () => {
            cleanup();
            document.removeEventListener('visibilitychange', handleWindowFocus);
        };
    }, [isRealTime, fetchAuditData]);

    return {
        // Data
        transactions,
        archives,
        stats,

        // State
        loading,
        error,
        refreshing,

        // Actions
        refresh,
        updateFilters,
        setAutoRefresh,

        // Filters
        filters,

        // Real-time status
        isRealTime,
        lastUpdated
    };
}
