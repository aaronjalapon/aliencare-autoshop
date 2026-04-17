/**
 * Hook for customer transaction logs
 * Fetches all transaction types and provides filtering
 */

import { customerService, CustomerTransactionFilters } from '@/services/customerService';
import { CustomerTransaction } from '@/types/customer';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_PER_PAGE = 20;

interface LogsPagination {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
}

export function useCustomerLogs(initialFilters: CustomerTransactionFilters = {}) {
    const [logs, setLogs] = useState<CustomerTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<CustomerTransactionFilters>({
        per_page: DEFAULT_PER_PAGE,
        page: 1,
        ...initialFilters,
    });
    const [pagination, setPagination] = useState<LogsPagination>({
        currentPage: 1,
        lastPage: 1,
        perPage: initialFilters.per_page ?? DEFAULT_PER_PAGE,
        total: 0,
    });

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await customerService.getMyTransactions(filters);
            const paginated = response?.data;
            const data = paginated?.data ?? [];

            setLogs(data);
            setPagination({
                currentPage: paginated?.current_page ?? 1,
                lastPage: paginated?.last_page ?? 1,
                perPage: paginated?.per_page ?? filters.per_page ?? DEFAULT_PER_PAGE,
                total: paginated?.total ?? data.length,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch transaction logs');
            setLogs([]);
            setPagination((prev) => ({
                ...prev,
                currentPage: 1,
                lastPage: 1,
                total: 0,
            }));
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const updateFilters = useCallback((newFilters: Partial<CustomerTransactionFilters>) => {
        setFilters((prev) => {
            const merged: CustomerTransactionFilters = {
                ...prev,
                ...newFilters,
            };

            const shouldResetPage = Object.keys(newFilters).some((key) => key !== 'page' && key !== 'per_page');

            if (shouldResetPage) {
                merged.page = 1;
            }

            if (merged.search !== undefined && merged.search.trim() === '') {
                delete merged.search;
            }

            if (merged.per_page === undefined || merged.per_page <= 0) {
                merged.per_page = DEFAULT_PER_PAGE;
            }

            if (merged.page === undefined || merged.page <= 0) {
                merged.page = 1;
            }

            return merged;
        });
    }, []);

    const setPage = useCallback(
        (page: number) => {
            updateFilters({ page: Math.max(1, page) });
        },
        [updateFilters],
    );

    return {
        logs,
        loading,
        error,
        filters,
        pagination,
        updateFilters,
        setPage,
        refresh: fetchLogs,
    };
}
