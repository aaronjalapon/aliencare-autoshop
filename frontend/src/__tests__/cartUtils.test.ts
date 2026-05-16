import { getGuestCart, getUserCart, migrateGuestCartToUser, setGuestCart } from '@/utils/cartUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sampleCart = [
    {
        product: { id: 1, name: 'Oil', description: '', price: 100, category: 'Oil & Fluids', inStock: true },
        quantity: 2,
    },
];

describe('cartUtils', () => {
    beforeEach(() => {
        // provide a lightweight localStorage mock for test environment
        const store: Record<string, string> = {};
        const mockLocalStorage = {
            getItem: (k: string) => (k in store ? store[k] : null),
            setItem: (k: string, v: string) => {
                store[k] = v;
            },
            removeItem: (k: string) => {
                delete store[k];
            },
            clear: () => {
                for (const k of Object.keys(store)) delete store[k];
            },
        } as Storage;

        vi.stubGlobal('localStorage', mockLocalStorage);
    });

    it('migrates guest cart into user cart and clears guest', () => {
        setGuestCart(sampleCart as unknown as Parameters<typeof setGuestCart>[0]);
        expect(getGuestCart()).toHaveLength(1);

        migrateGuestCartToUser(42);

        expect(getGuestCart()).toHaveLength(0);
        const userCart = getUserCart(42);
        expect(userCart).toHaveLength(1);
        expect(userCart[0].product.id).toBe(1);
        expect(userCart[0].quantity).toBe(2);
    });
});
