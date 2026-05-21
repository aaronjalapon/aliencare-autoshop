import { auditService } from '@/services/auditService';
import { AuditLog } from '@/types/inventory';
import { useCallback, useEffect, useState } from 'react';

interface BillingAuditFilters {
    action?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    per_page?: number;
    page?: number;
}

interface PaginationMeta {
    currentPage: number;
    lastPage: number;
    total: number;
}

interface UseBillingAuditLogReturn {
    entries: AuditLog[];
    loading: boolean;
    error: string | null;
    refreshing: boolean;
    filters: BillingAuditFilters;
    pagination: PaginationMeta;
    refresh: () => Promise<void>;
    setFilters: (filters: BillingAuditFilters) => void;
    setPage: (page: number) => void;
}

const DEFAULT_FILTERS: BillingAuditFilters = {
    per_page: 25,
    page: 1,
};

export function useBillingAuditLog(initialFilters: BillingAuditFilters = {}): UseBillingAuditLogReturn {
    const [entries, setEntries] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFiltersState] = useState<BillingAuditFilters>({ ...DEFAULT_FILTERS, ...initialFilters });
    const [pagination, setPagination] = useState<PaginationMeta>({ currentPage: 1, lastPage: 1, total: 0 });

    const fetchEntries = useCallback(
        async (showRefreshing = false) => {
            try {
                if (showRefreshing) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }
                setError(null);

                const response = await auditService.getBillingAuditLogs(filters);

                const data = response.data;
                setEntries(data?.data ?? []);
                setPagination({
                    currentPage: data?.current_page ?? 1,
                    lastPage: data?.last_page ?? 1,
                    total: data?.total ?? 0,
                });
            } catch (err) {
                console.error('Error fetching billing audit logs:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch billing audit logs');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [filters],
    );

    const refresh = useCallback(async () => {
        await fetchEntries(true);
    }, [fetchEntries]);

    const setFilters = useCallback((newFilters: BillingAuditFilters) => {
        setFiltersState((prev) => ({ ...prev, ...newFilters, page: 1 }));
    }, []);

    const setPage = useCallback((page: number) => {
        setFiltersState((prev) => ({ ...prev, page }));
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    return {
        entries,
        loading,
        error,
        refreshing,
        filters,
        pagination,
        refresh,
        setFilters,
        setPage,
    };
}
