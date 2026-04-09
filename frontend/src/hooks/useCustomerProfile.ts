import { customerService } from '@/services/customerService';
import type { CustomerProfile } from '@/types/customer';
import { useCallback, useEffect, useState } from 'react';

interface UseCustomerProfileResult {
    customer: CustomerProfile | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useCustomerProfile(): UseCustomerProfileResult {
    const [customer, setCustomer] = useState<CustomerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        try {
            setError(null);
            const response = await customerService.getMe();
            setCustomer(response.data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load profile.';
            setError(message);
            setCustomer(null);
        }
    }, []);

    useEffect(() => {
        refetch().finally(() => setLoading(false));
    }, [refetch]);

    return { customer, loading, error, refetch };
}
