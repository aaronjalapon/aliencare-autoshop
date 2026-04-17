import { customerService } from '@/services/customerService';
import type { CustomerProfile } from '@/types/customer';
import { useCallback, useEffect, useState } from 'react';

interface UseCustomerProfileResult {
    customer: CustomerProfile | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useCustomerProfile(enabled = true): UseCustomerProfileResult {
    const [customer, setCustomer] = useState<CustomerProfile | null>(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (!enabled) {
            setCustomer(null);
            setError(null);
            return;
        }

        try {
            setError(null);
            const response = await customerService.getMe();
            setCustomer(response.data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load profile.';
            setError(message);
            setCustomer(null);
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) {
            setCustomer(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        refetch().finally(() => setLoading(false));
    }, [enabled, refetch]);

    return { customer, loading, error, refetch };
}
