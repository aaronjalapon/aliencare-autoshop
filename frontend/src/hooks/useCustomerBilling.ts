/**
 * Hook for customer billing data
 * Fetches transactions from the backend and splits into pending/paid
 */

import { useAuth } from '@/context/AuthContext';
import { customerService } from '@/services/customerService';
import { CustomerTransaction } from '@/types/customer';
import { useCallback, useEffect, useState } from 'react';

export function useCustomerBilling() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBilling = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            setError(null);
            const response = await customerService.getTransactions(user.id, { per_page: 100 });
            const data = response?.data?.data ?? [];
            setTransactions(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch billing data');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchBilling();
    }, [fetchBilling]);

    const pendingItems = transactions.filter((t) => t.type === 'invoice');
    const paidItems = transactions.filter((t) => t.type === 'payment');
    const outstandingBalance = pendingItems.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
        transactions,
        pendingItems,
        paidItems,
        outstandingBalance,
        loading,
        error,
        refresh: fetchBilling,
    };
}
