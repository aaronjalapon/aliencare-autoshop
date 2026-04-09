/**
 * Hook for customer transaction logs
 * Fetches all transaction types and provides filtering
 */

import { useAuth } from '@/context/AuthContext';
import { customerService, CustomerTransactionFilters } from '@/services/customerService';
import { CustomerTransaction } from '@/types/customer';
import { useCallback, useEffect, useState } from 'react';

export function useCustomerLogs(initialFilters: CustomerTransactionFilters = {}) {
    const { user } = useAuth();
    const [logs, setLogs] = useState<CustomerTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<CustomerTransactionFilters>(initialFilters);

    const fetchLogs = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            setError(null);
            const response = await customerService.getTransactions(user.id, { ...filters, per_page: 100 });
            const data = response?.data?.data ?? [];
            setLogs(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch transaction logs');
        } finally {
            setLoading(false);
        }
    }, [user?.id, filters]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const updateFilters = useCallback((newFilters: Partial<CustomerTransactionFilters>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    }, []);

    return {
        logs,
        loading,
        error,
        filters,
        updateFilters,
        refresh: fetchLogs,
    };
}
