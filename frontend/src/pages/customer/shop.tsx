import CustomerLayout from '@/components/layout/customer-layout';
import { type BreadcrumbItem } from '@/types';
import { ArrowRight, Check, CircleDot, Droplets, type LucideIcon, Minus, Package, Plus, Search, ShoppingCart, Wind, X } from 'lucide-react';
import { type ReactNode, useMemo, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/customer' },
    { title: 'Shop', href: '/customer/shop' },
];

const productCategories = ['All', 'Oil & Fluids', 'Filters', 'Brakes', 'Accessories'] as const;

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    'Oil & Fluids': Droplets,
    Filters: Wind,
    Brakes: CircleDot,
    Accessories: Package,
};

// Decorative background images for each product (right-side fade effect)
// loremflickr.com returns real keyword-matched photos from Flickr
const PRODUCT_IMAGES: Record<number, string> = {
    1: 'https://images.pexels.com/photos/9381059/pexels-photo-9381059.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Synthetic Engine Oil 5W-30 — Motul engine oil packaging
    2: 'https://images.pexels.com/photos/10490621/pexels-photo-10490621.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Oil Filter Standard — mechanic at engine oil filler cap
    3: 'https://images.pexels.com/photos/13350018/pexels-photo-13350018.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Brake Pad Set (Front) — close-up brake pads on wheel
    4: 'https://images.pexels.com/photos/7854084/pexels-photo-7854084.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Coolant Fluid 1L — hands pouring coolant into engine
    5: 'https://images.pexels.com/photos/11074558/pexels-photo-11074558.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Air Filter — automotive air intake filter product shot
    6: 'https://images.pexels.com/photos/8985706/pexels-photo-8985706.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Brake Fluid DOT 4 — mechanic checking brake fluid container
    7: 'https://images.pexels.com/photos/4022543/pexels-photo-4022543.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Brake Disc Rotor (Rear) — steel disc brake without wheel
    8: 'https://images.pexels.com/photos/7541975/pexels-photo-7541975.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Cabin Air Filter — mechanic holding cabin air filter
    9: 'https://images.pexels.com/photos/13536013/pexels-photo-13536013.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Car Phone Mount — magnetic phone holder on car air vent
    10: 'https://images.pexels.com/photos/8946956/pexels-photo-8946956.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Dash Camera HD — camera mounted on vehicle dashboard
    11: 'https://images.pexels.com/photos/4116171/pexels-photo-4116171.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Transmission Fluid ATF — automotive fluid cans on garage workbench
    12: 'https://images.pexels.com/photos/15389084/pexels-photo-15389084.jpeg?auto=compress&cs=tinysrgb&w=480&h=300&dpr=1', // Wiper Blades (Pair) — wiper blade on classic red car
};

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    inStock: boolean;
}

interface CartItem {
    product: Product;
    quantity: number;
}

const sampleProducts: Product[] = [
    {
        id: 1,
        name: 'Synthetic Engine Oil 5W-30',
        description: '1 Liter - Full synthetic motor oil',
        price: 650,
        category: 'Oil & Fluids',
        inStock: true,
    },
    { id: 2, name: 'Oil Filter Standard', description: 'Universal fit oil filter', price: 280, category: 'Filters', inStock: true },
    { id: 3, name: 'Brake Pad Set (Front)', description: 'Ceramic brake pads for front axle', price: 1800, category: 'Brakes', inStock: true },
    { id: 4, name: 'Coolant Fluid 1L', description: 'Long-life antifreeze coolant', price: 350, category: 'Oil & Fluids', inStock: true },
    { id: 5, name: 'Air Filter', description: 'Engine air filter replacement', price: 450, category: 'Filters', inStock: true },
    { id: 6, name: 'Brake Fluid DOT 4', description: '500ml high-performance brake fluid', price: 320, category: 'Oil & Fluids', inStock: true },
    { id: 7, name: 'Brake Disc Rotor (Rear)', description: 'Ventilated disc rotor pair', price: 3200, category: 'Brakes', inStock: false },
    { id: 8, name: 'Cabin Air Filter', description: 'Activated carbon cabin filter', price: 550, category: 'Filters', inStock: true },
    { id: 9, name: 'Car Phone Mount', description: 'Magnetic dashboard phone holder', price: 450, category: 'Accessories', inStock: true },
    { id: 10, name: 'Dash Camera HD', description: '1080p front-facing dash cam', price: 2800, category: 'Accessories', inStock: true },
    {
        id: 11,
        name: 'Transmission Fluid ATF',
        description: '1 Liter automatic transmission fluid',
        price: 580,
        category: 'Oil & Fluids',
        inStock: true,
    },
    { id: 12, name: 'Wiper Blades (Pair)', description: 'All-weather silicone wiper blades', price: 750, category: 'Accessories', inStock: true },
];

type ShopModalStep = 'invoice' | 'payment' | 'success' | null;
type PayMethod = 'gcash' | 'maya' | 'card' | 'bank';

export default function Shop() {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [shopModal, setShopModal] = useState<ShopModalStep>(null);
    const [payMethod, setPayMethod] = useState<PayMethod>('gcash');
    const orderNum = useRef(`ORD-${String(Math.floor(10000 + Math.random() * 90000)).slice(0, 5)}`).current;
    const invoiceNum = useRef(`INV-${String(Math.floor(10000 + Math.random() * 90000)).slice(0, 5)}`).current;
    const today = useMemo(() => new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }), []);

    const filtered = sampleProducts.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => (item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item))
                .filter((item) => item.quantity > 0),
        );
    };

    const removeFromCart = (productId: number) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CustomerLayout breadcrumbs={breadcrumbs}>
            <div className="grid min-h-full grid-cols-1 items-start gap-5 p-5 xl:grid-cols-[1fr_340px]">
                {/* ── LEFT: Products ──────────────────────────────────────── */}
                <div className="flex flex-col gap-5">
                    {/* Search & Filters */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {productCategories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                                        activeCategory === cat
                                            ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                                            : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/50 hover:text-foreground'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filtered.map((product) => {
                            const Icon = CATEGORY_ICONS[product.category] ?? Package;
                            return (
                                <div
                                    key={product.id}
                                    className="profile-card relative overflow-hidden rounded-xl p-5 transition-all hover:shadow-[0_0_0_1px_rgba(212,175,55,0.3)]"
                                >
                                    {/* Product photo — right-half background */}
                                    <img
                                        src={PRODUCT_IMAGES[product.id]}
                                        alt=""
                                        aria-hidden="true"
                                        loading="lazy"
                                        className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 object-cover object-center opacity-55 select-none"
                                    />
                                    {/* Gradient fade: transparent on right → dark on left */}
                                    <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 bg-linear-to-l from-[#1e1e22] via-[#1e1e22]/70 to-transparent" />

                                    {/* Card content */}
                                    <div className="relative z-10">
                                        {/* Icon + badges row */}
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d4af37]/10">
                                                <Icon className="h-4 w-4 text-[#d4af37]" />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="rounded-md bg-[#d4af37]/10 px-2 py-0.5 text-xs font-medium text-[#d4af37]">
                                                    {product.category}
                                                </span>
                                                {!product.inStock && (
                                                    <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                                                        Out of Stock
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-sm leading-snug font-bold">{product.name}</h3>
                                        <p className="mt-1 text-xs text-muted-foreground">{product.description}</p>

                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="text-base font-bold">₱{product.price.toLocaleString()}</span>
                                            <button
                                                onClick={() => addToCart(product)}
                                                disabled={!product.inStock}
                                                className="rounded-lg bg-[#d4af37] px-3 py-1.5 text-xs font-bold text-black shadow-[0_2px_8px_rgba(212,175,55,0.25)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Add to Cart
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filtered.length === 0 && (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <p className="text-sm">No products found matching your criteria.</p>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Cart panel ────────────────────────────────────── */}
                <div className="profile-card sticky top-5 flex max-h-[calc(100vh-2.5rem)] flex-col gap-4 rounded-xl p-5">
                    {/* Cart header */}
                    <div className="flex shrink-0 items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-bold">
                            <ShoppingCart className="h-4 w-4 text-[#d4af37]" />
                            Cart
                            {cartCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d4af37] text-xs font-bold text-black">
                                    {cartCount}
                                </span>
                            )}
                        </h2>
                        {cartCount > 0 && (
                            <button onClick={() => setCart([])} className="text-xs text-muted-foreground transition-colors hover:text-red-400">
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="h-px shrink-0 bg-[#2a2a2e]" />

                    {/* Cart items — scrollable area */}
                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <ShoppingCart className="mb-2 h-8 w-8 opacity-20" />
                                <p className="text-sm">Your cart is empty</p>
                            </div>
                        ) : (
                            cart.map((item) => {
                                const Icon = CATEGORY_ICONS[item.product.category] ?? Package;
                                return (
                                    <div key={item.product.id} className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10]/60 p-3">
                                        <div className="flex items-start gap-2">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d4af37]/10">
                                                <Icon className="h-3.5 w-3.5 text-[#d4af37]" />
                                            </div>
                                            <div className="flex min-w-0 flex-1 flex-col">
                                                <p className="truncate text-xs font-semibold">{item.product.name}</p>
                                                <p className="text-xs text-muted-foreground">₱{item.product.price.toLocaleString()}</p>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="shrink-0 text-muted-foreground transition-colors hover:text-red-500"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, -1)}
                                                    className="flex h-6 w-6 items-center justify-center rounded border border-[#2a2a2e] transition-colors hover:border-[#d4af37]/50 hover:text-foreground"
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="min-w-6 text-center text-xs font-semibold">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, 1)}
                                                    className="flex h-6 w-6 items-center justify-center rounded border border-[#2a2a2e] transition-colors hover:border-[#d4af37]/50 hover:text-foreground"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <span className="text-xs font-bold">₱{(item.product.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {cart.length > 0 && (
                        <>
                            <div className="h-px shrink-0 bg-[#2a2a2e]" />

                            {/* Order summary */}
                            <div className="rounded-lg border border-[#2a2a2e] p-3">
                                <p className="mb-2 text-xs font-semibold text-foreground">Order Summary</p>
                                <div className="flex flex-col gap-1.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Items ({cartCount})</span>
                                        <span className="font-medium">₱{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Service fee</span>
                                        <span className="font-medium text-green-400">Free</span>
                                    </div>
                                    <div className="my-0.5 h-px bg-[#2a2a2e]" />
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">Total</span>
                                        <span className="text-base font-bold">₱{cartTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShopModal('invoice')}
                                className="w-full rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black shadow-[0_4px_16px_rgba(212,175,55,0.35)] transition-opacity hover:opacity-90"
                            >
                                Proceed to Checkout
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Modal: Invoice ──────────────────────────────────────────── */}
            {shopModal === 'invoice' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShopModal(null)} />
                    <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[#2a2a2e] bg-[#18181b] shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#2a2a2e] px-6 py-4">
                            <h2 className="text-base font-bold">Invoice</h2>
                            <button
                                onClick={() => setShopModal(null)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col gap-4 px-6 py-5">
                            {/* Invoice meta */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Date: <span className="font-medium text-foreground">{today}</span>
                                </span>
                                <span className="font-mono text-xs font-semibold text-[#d4af37]">Invoice #{invoiceNum}</span>
                            </div>

                            {/* Line items table */}
                            <div className="overflow-hidden rounded-lg border border-[#2a2a2e]">
                                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-[#2a2a2e] bg-[#0d0d10] px-4 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    <span>Order</span>
                                    <span className="text-right">Rate</span>
                                    <span className="text-right">Qty</span>
                                    <span className="text-right">Line total</span>
                                </div>
                                <div className="flex flex-col divide-y divide-[#2a2a2e]">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-3 text-sm">
                                            <div>
                                                <p className="font-semibold">{item.product.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.product.description}</p>
                                            </div>
                                            <span className="self-center text-right">₱{item.product.price.toLocaleString()}</span>
                                            <span className="self-center text-right">{item.quantity}</span>
                                            <span className="self-center text-right font-semibold">
                                                ₱{(item.product.price * item.quantity).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {/* Totals */}
                                <div className="flex flex-col gap-1.5 border-t border-[#2a2a2e] bg-[#0d0d10]/60 px-4 py-3 text-sm">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span>₱{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>Tax (0%)</span>
                                        <span>₱0.00</span>
                                    </div>
                                    <div className="my-0.5 h-px bg-[#2a2a2e]" />
                                    <div className="flex items-center justify-between font-semibold">
                                        <span>Total</span>
                                        <span>₱{cartTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Amount due */}
                            <div className="flex items-center justify-between rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 px-4 py-3">
                                <span className="text-sm font-bold">Amount due</span>
                                <span className="text-lg font-bold text-[#d4af37]">₱{cartTotal.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-[#2a2a2e] px-6 py-4">
                            <button
                                onClick={() => setShopModal(null)}
                                className="rounded-lg border border-[#2a2a2e] px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#2a2a2e]"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setShopModal('payment')}
                                className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-5 py-2 text-sm font-bold text-black shadow-[0_4px_12px_rgba(212,175,55,0.3)] transition-opacity hover:opacity-90"
                            >
                                Continue <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Pay Order ────────────────────────────────────────── */}
            {shopModal === 'payment' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShopModal(null)} />
                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2a2e] bg-[#18181b] shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#2a2a2e] px-6 py-4">
                            <h2 className="text-base font-bold">Pay Order</h2>
                            <button
                                onClick={() => setShopModal(null)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col gap-4 px-6 py-5">
                            {/* Order info */}
                            <div className="flex flex-col gap-1.5 text-sm">
                                <p>
                                    <span className="text-muted-foreground">Order: </span>
                                    <span className="font-mono font-semibold">{orderNum}</span>
                                </p>
                                <p>
                                    <span className="text-muted-foreground">Items: </span>
                                    <span className="font-semibold">
                                        {cartCount} item{cartCount !== 1 ? 's' : ''}
                                    </span>
                                </p>
                            </div>

                            <div className="h-px bg-[#2a2a2e]" />

                            <div>
                                <p className="text-sm font-bold text-[#d4af37]">Total: ₱{cartTotal.toLocaleString()}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">Select your payment method to complete the order</p>
                            </div>

                            <div className="h-px bg-[#2a2a2e]" />

                            {/* Payment methods */}
                            <div className="flex flex-col gap-2">
                                {(
                                    [
                                        {
                                            key: 'gcash' as PayMethod,
                                            label: 'GCash',
                                            icon: <img src="/images/gcash.png" alt="GCash" className="h-4 w-auto max-w-5 object-contain" />,
                                        },
                                        {
                                            key: 'maya' as PayMethod,
                                            label: 'Maya',
                                            icon: <img src="/images/Maya.png" alt="Maya" className="h-3 w-auto max-w-11 object-contain" />,
                                        },
                                        {
                                            key: 'card' as PayMethod,
                                            label: 'Credit/Debit Card',
                                            icon: (
                                                <img src="/images/debit.png" alt="Credit/Debit Card" className="h-6 w-auto max-w-10 object-contain" />
                                            ),
                                        },
                                        {
                                            key: 'bank' as PayMethod,
                                            label: 'Bank Transfer',
                                            icon: (
                                                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                                                    <path d="M16 4L3 11h26L16 4z" fill="#9ca3af" />
                                                    <rect x="5" y="14" width="3.5" height="9" rx="0.5" fill="#9ca3af" />
                                                    <rect x="14.25" y="14" width="3.5" height="9" rx="0.5" fill="#9ca3af" />
                                                    <rect x="23.5" y="14" width="3.5" height="9" rx="0.5" fill="#9ca3af" />
                                                    <rect x="3" y="24" width="26" height="2.5" rx="1" fill="#9ca3af" />
                                                    <rect x="3" y="11" width="26" height="2.5" fill="#6b7280" />
                                                </svg>
                                            ),
                                        },
                                    ] as { key: PayMethod; label: string; icon: ReactNode }[]
                                ).map((m) => (
                                    <button
                                        key={m.key}
                                        onClick={() => setPayMethod(m.key)}
                                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                                            payMethod === m.key ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-[#2a2a2e] hover:border-[#d4af37]/40'
                                        }`}
                                    >
                                        <div
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                                payMethod === m.key ? 'border-[#d4af37]' : 'border-[#3a3a3e]'
                                            }`}
                                        >
                                            {payMethod === m.key && <div className="h-2.5 w-2.5 rounded-full bg-[#d4af37]" />}
                                        </div>
                                        <div className="flex w-10 shrink-0 items-center justify-center">{m.icon}</div>
                                        <span className="text-sm font-medium">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-[#2a2a2e] px-6 py-4">
                            <button
                                onClick={() => setShopModal('invoice')}
                                className="rounded-lg border border-[#2a2a2e] px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#2a2a2e]"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setShopModal('success')}
                                className="rounded-lg bg-[#d4af37] px-5 py-2 text-sm font-bold text-black shadow-[0_4px_12px_rgba(212,175,55,0.3)] transition-opacity hover:opacity-90"
                            >
                                Pay Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Payment Successful ────────────────────────────────── */}
            {shopModal === 'success' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2a2e] bg-[#18181b] shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#2a2a2e] px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                                    <Check className="h-3.5 w-3.5 text-white" />
                                </div>
                                <h2 className="text-base font-bold">Payment Successful</h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShopModal(null);
                                    setCart([]);
                                }}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col gap-4 px-6 py-5">
                            <p className="text-center text-sm text-muted-foreground">
                                Your payment has been received.
                                <br />
                                Your order is now being processed.
                            </p>

                            <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] px-5 py-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Order #:</span>
                                    <span className="font-mono text-sm font-bold text-[#d4af37]">{orderNum}</span>
                                </div>
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Invoice:</span>
                                    <span className="font-mono text-sm font-semibold">{invoiceNum}</span>
                                </div>
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Date:</span>
                                    <span className="text-sm font-semibold">{today}</span>
                                </div>
                                <div className="my-2 h-px bg-[#2a2a2e]" />
                                <div className="flex flex-col gap-1">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                {item.product.name} &times; {item.quantity}
                                            </span>
                                            <span className="font-medium">₱{(item.product.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 border-t border-[#2a2a2e] pt-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">Amount Paid</span>
                                        <span className="text-base font-bold text-[#d4af37]">₱{cartTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col gap-3 border-t border-[#2a2a2e] px-6 py-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setShopModal(null);
                                        setCart([]);
                                    }}
                                    className="flex-1 rounded-lg border border-[#2a2a2e] py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[#2a2a2e]"
                                >
                                    Back to Shop
                                </button>
                                <button
                                    onClick={() => {
                                        setShopModal(null);
                                        setCart([]);
                                    }}
                                    className="flex-1 rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black shadow-[0_4px_16px_rgba(212,175,55,0.35)] transition-opacity hover:opacity-90"
                                >
                                    Done
                                </button>
                            </div>
                            <p className="text-center text-xs text-muted-foreground">
                                You'll receive a notification once your order is ready for pick-up.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </CustomerLayout>
    );
}
