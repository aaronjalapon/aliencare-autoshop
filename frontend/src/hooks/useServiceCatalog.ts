/**
 * Hook for service catalog data
 * Fetches services from public API endpoint
 */

import { ServiceCatalogFilters, serviceCatalogService } from '@/services/serviceCatalogService';
import { ServiceCatalogItem } from '@/types/customer';
import { useCallback, useEffect, useState } from 'react';

export function useServiceCatalog(initialFilters: ServiceCatalogFilters = {}) {
    const [services, setServices] = useState<ServiceCatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<ServiceCatalogFilters>(initialFilters);

    const fetchServices = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await serviceCatalogService.getServices({ ...filters, per_page: 50 });
            const data = response?.data?.data ?? [];
            setServices(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch services');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const recommended = services.find((s) => s.recommended);

    const updateFilters = useCallback((newFilters: Partial<ServiceCatalogFilters>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    }, []);

    return {
        services,
        recommended,
        loading,
        error,
        filters,
        updateFilters,
        refresh: fetchServices,
    };
}
