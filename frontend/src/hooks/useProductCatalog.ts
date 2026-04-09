/**
 * Hook for customer-facing product catalog
 * Fetches inventory items for the product shop page
 */

import { InventoryFilters, inventoryService } from '@/services/inventoryService';
import { InventoryItem } from '@/types/inventory';
import { useCallback, useEffect, useState } from 'react';

export function useProductCatalog(initialFilters: InventoryFilters = {}) {
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<InventoryFilters>(initialFilters);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await inventoryService.getInventoryItems({ ...filters, per_page: 100 });
            const data = response?.data?.data ?? [];
            setProducts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const categories = ['All', ...new Set(products.map((p) => p.category))];

    const updateFilters = useCallback((newFilters: Partial<InventoryFilters>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    }, []);

    return {
        products,
        categories,
        loading,
        error,
        filters,
        updateFilters,
        refresh: fetchProducts,
    };
}
