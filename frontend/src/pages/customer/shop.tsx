import CustomerLayout from '@/components/layout/customer-layout';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { paymentService } from '@/services/paymentService';
import { type BreadcrumbItem } from '@/types';
import { InventoryItem } from '@/types/inventory';
import {
    AlertCircle,
    ArrowRight,
    Banknote,
    CircleDot,
    CreditCard,
    Droplets,
    type LucideIcon,
    Minus,
    Package,
    Plus,
    Search,
    ShoppingCart,
    Wind,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/customer' },
    { title: 'Shop', href: '/customer/shop' },
];

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

// Map InventoryItem → Product display shape
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

const itemToProduct = (item: InventoryItem): Product => ({
    id: item.id,
    name: item.item_name,
    description: item.description,
    price: item.unit_price,
    category: item.category,
    inStock: item.stock > 0,
});

type ShopModalStep = 'invoice' | 'processing' | null;

type ShopPaymentOption = 'online' | 'cash';

export default function Shop() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [shopModal, setShopModal] = useState<ShopModalStep>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [paymentOption, setPaymentOption] = useState<ShopPaymentOption>('online');
    const today = useMemo(() => new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }), []);

    const { products: rawProducts, categories: apiCategories, loading: productsLoading, error: productsError } = useProductCatalog();
    const allProducts: Product[] = rawProducts.map(itemToProduct);
    const categories = ['All', ...apiCategories.filter((c) => c !== 'All')];

    const filtered = allProducts.filter((p) => {
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

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsCheckingOut(true);
        setCheckoutError(null);
        const notes = 'Shop Order: ' + cart.map((i) => `${i.product.name} x${i.quantity}`).join(', ');

        if (paymentOption === 'cash') {
            try {
                await paymentService.shopPayAtShop(cartTotal, notes + ' (pay at shop)');
                setCart([]);
                setShopModal(null);
                navigate('/customer/billing');
            } catch (err) {
                setCheckoutError(err instanceof Error ? err.message : 'Order failed. Please try again.');
                setIsCheckingOut(false);
            }
            return;
        }

        try {
            const response = await paymentService.shopCheckout(cartTotal, notes);
            window.location.href = response.data.payment_url;
        } catch (err) {
            setCheckoutError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
            setIsCheckingOut(false);
        }
    };

    return (
        <CustomerLayout breadcrumbs={breadcrumbs}>
            <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 xl:grid-cols-[1fr_340px] xl:items-stretch xl:overflow-hidden">
                {/* ── LEFT: Products ──────────────────────────────────────── */}
                <div className="flex min-h-0 flex-col gap-5">
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
                            {categories.map((cat) => (
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

                    {/* Error state */}
                    {productsError && (
                        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {productsError}
                        </div>
                    )}

                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                        {/* Products Grid */}
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {productsLoading
                                ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="profile-card h-48 animate-pulse rounded-xl" />)
                                : filtered.map((product) => {
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

                        {!productsLoading && filtered.length === 0 && (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                <p className="text-sm">No products found matching your criteria.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Cart panel ────────────────────────────────────── */}
                <div className="profile-card flex min-h-0 flex-col gap-4 rounded-xl p-5 xl:self-stretch">
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
                                <span className="font-mono text-xs font-semibold text-[#d4af37]">Generated at checkout</span>
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

                            {/* Payment method selection */}
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Payment Method</p>
                                <button
                                    onClick={() => setPaymentOption('online')}
                                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                                        paymentOption === 'online' ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-[#2a2a2e] hover:border-[#d4af37]/40'
                                    }`}
                                >
                                    <div
                                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                            paymentOption === 'online' ? 'border-[#d4af37]' : 'border-[#3a3a3e]'
                                        }`}
                                    >
                                        {paymentOption === 'online' && <div className="h-2 w-2 rounded-full bg-[#d4af37]" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-[#d4af37]" />
                                        <div>
                                            <p className="text-sm font-semibold">Pay Online</p>
                                            <p className="text-xs text-muted-foreground">GCash, Maya, Card, Bank — via Xendit</p>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setPaymentOption('cash')}
                                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                                        paymentOption === 'cash' ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-[#2a2a2e] hover:border-[#d4af37]/40'
                                    }`}
                                >
                                    <div
                                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                            paymentOption === 'cash' ? 'border-[#d4af37]' : 'border-[#3a3a3e]'
                                        }`}
                                    >
                                        {paymentOption === 'cash' && <div className="h-2 w-2 rounded-full bg-[#d4af37]" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Banknote className="h-4 w-4 text-[#d4af37]" />
                                        <div>
                                            <p className="text-sm font-semibold">Pay at Shop (Cash)</p>
                                            <p className="text-xs text-muted-foreground">Full amount will be due upon pickup</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col gap-3 border-t border-[#2a2a2e] px-6 py-4">
                            {checkoutError && (
                                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    {checkoutError}
                                </div>
                            )}
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setShopModal(null)}
                                    disabled={isCheckingOut}
                                    className="rounded-lg border border-[#2a2a2e] px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#2a2a2e] disabled:opacity-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    disabled={isCheckingOut}
                                    className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-5 py-2 text-sm font-bold text-black shadow-[0_4px_12px_rgba(212,175,55,0.3)] transition-opacity hover:opacity-90 disabled:opacity-60"
                                >
                                    {isCheckingOut ? (
                                        'Processing…'
                                    ) : paymentOption === 'cash' ? (
                                        <>
                                            Place Order <ArrowRight className="h-4 w-4" />
                                        </>
                                    ) : (
                                        <>
                                            Pay with Xendit <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </CustomerLayout>
    );
}
