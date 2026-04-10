/**
 * Hook for customer job orders
 * Fetches job orders linked to the authenticated customer
 */

import { useAuth } from '@/context/AuthContext';
import { customerService } from '@/services/customerService';
import { JobOrder } from '@/types/customer';
import { useCallback, useEffect, useState } from 'react';

export function useCustomerJobOrders() {
    const { user } = useAuth();
    const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchJobOrders = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            setError(null);
            const response = await customerService.getJobOrders(user.id);
            const data = (response?.data ?? []) as JobOrder[];
            setJobOrders(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch job orders');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchJobOrders();
    }, [fetchJobOrders]);

    const activeJobOrders = jobOrders.filter((jo) => ['created', 'pending_approval', 'approved', 'in_progress'].includes(jo.status));

    const completedJobOrders = jobOrders.filter((jo) => ['completed', 'settled'].includes(jo.status));

    return {
        jobOrders,
        activeJobOrders,
        completedJobOrders,
        loading,
        error,
        refresh: fetchJobOrders,
    };
}
