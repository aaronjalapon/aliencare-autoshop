/**
 * Custom hook for managing audit log state with backend data
 */

import { auditService } from '@/services/auditService';
import { AuditLog, AuditLogFilters, AuditStats, AuditTransaction } from '@/types/inventory';
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

    // Filters
    filters: AuditLogFilters;

    // Status
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

    // Initial data fetch
    useEffect(() => {
        fetchAuditData();
    }, [fetchAuditData]);

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

        // Filters
        filters,

        // Status
        lastUpdated
    };
}