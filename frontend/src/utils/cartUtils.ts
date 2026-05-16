import type { CartItem } from '@/pages/customer/shop';

const GUEST_KEY = 'guest_cart';
const userKey = (userId: number | string) => `user_cart_${userId}`;

export function getGuestCart(): CartItem[] {
    try {
        const raw = localStorage.getItem(GUEST_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as CartItem[];
    } catch {
        return [];
    }
}

export function setGuestCart(cart: CartItem[]) {
    try {
        if (cart.length === 0) localStorage.removeItem(GUEST_KEY);
        else localStorage.setItem(GUEST_KEY, JSON.stringify(cart));
    } catch { /* noop */ }
}

export function clearGuestCart() {
    try {
        localStorage.removeItem(GUEST_KEY);
    } catch { /* noop */ }
}

export function getUserCart(id: number | string): CartItem[] {
    try {
        const raw = localStorage.getItem(userKey(id));
        if (!raw) return [];
        return JSON.parse(raw) as CartItem[];
    } catch {
        return [];
    }
}

export function setUserCart(id: number | string, cart: CartItem[]) {
    try {
        if (cart.length === 0) localStorage.removeItem(userKey(id));
        else localStorage.setItem(userKey(id), JSON.stringify(cart));
    } catch { /* noop */ }
}

// Migrate guest cart into the user's cart by summing quantities for like products.
export function migrateGuestCartToUser(id: number | string) {
    try {
        const guest = getGuestCart();
        if (guest.length === 0) return;
        const existing = getUserCart(id);
        const mergedMap = new Map<number, import('@/pages/customer/shop').Product & { quantity: number }>();

        const upsert = (item: CartItem) => {
            const id = item.product.id;
            const prev = mergedMap.get(id);
            if (prev) {
                mergedMap.set(id, { ...prev, quantity: prev.quantity + item.quantity });
            } else {
                mergedMap.set(id, { ...item.product, quantity: item.quantity });
            }
        };

        existing.forEach((it) => upsert(it));
        guest.forEach((it) => upsert(it));

        const merged: CartItem[] = Array.from(mergedMap.values()).map((p) => ({ product: p, quantity: p.quantity }));
        setUserCart(id, merged as CartItem[]);
        clearGuestCart();
    } catch { /* noop */ }
}

export default {};
