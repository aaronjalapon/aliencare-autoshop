import AppLayout from '@/components/layout/app-layout';
import { type BreadcrumbItem } from '@/types';
import { AlertTriangle, CheckCircle2, PencilLine, Plus, ReceiptText, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Point of Sale', href: '/pos' }];

type ProductCategory = 'fluids' | 'parts' | 'accessories' | 'detailing';
type CategoryFilter = ProductCategory | 'all';
type ProductFormMode = 'create' | 'edit';

interface ProductRecord {
    id: number;
    sku: string;
    name: string;
    category: ProductCategory;
    unitPrice: number;
    stock: number;
    minStock: number;
    isActive: boolean;
    description: string;
}

interface CartLine {
    productId: number;
    quantity: number;
}

interface ProductFormState {
    sku: string;
    name: string;
    category: ProductCategory;
    unitPrice: string;
    stock: string;
    minStock: string;
    description: string;
    isActive: boolean;
}

const productSeed: ProductRecord[] = [
    {
        id: 1,
        sku: 'AC-OIL-5W30',
        name: 'Synthetic Oil 5W-30 (1L)',
        category: 'fluids',
        unitPrice: 650,
        stock: 18,
        minStock: 8,
        isActive: true,
        description: 'Premium synthetic oil for modern gasoline engines.',
    },
    {
        id: 2,
        sku: 'AC-OIL-FLTR-TY',
        name: 'Oil Filter Toyota Small',
        category: 'parts',
        unitPrice: 420,
        stock: 10,
        minStock: 6,
        isActive: true,
        description: 'Compatible with common Toyota compact platforms.',
    },
    {
        id: 3,
        sku: 'AC-BATT-NS60',
        name: 'Battery NS60 Maintenance-Free',
        category: 'parts',
        unitPrice: 4700,
        stock: 4,
        minStock: 5,
        isActive: true,
        description: '12V maintenance-free battery for sedans.',
    },
    {
        id: 4,
        sku: 'AC-WASH-PREM',
        name: 'Premium Car Wash Kit',
        category: 'detailing',
        unitPrice: 1200,
        stock: 9,
        minStock: 4,
        isActive: true,
        description: 'Foam wash solution and microfiber bundle.',
    },
    {
        id: 5,
        sku: 'AC-WIPER-24',
        name: 'Wiper Blade 24 inch',
        category: 'accessories',
        unitPrice: 390,
        stock: 14,
        minStock: 6,
        isActive: true,
        description: 'All-weather graphite-coated wiper blade.',
    },
    {
        id: 6,
        sku: 'AC-BRAKE-CLEAN',
        name: 'Brake Cleaner Spray',
        category: 'fluids',
        unitPrice: 280,
        stock: 7,
        minStock: 5,
        isActive: true,
        description: 'Quick drying cleaner for brake dust and residue.',
    },
];

const initialFormState: ProductFormState = {
    sku: '',
    name: '',
    category: 'parts',
    unitPrice: '',
    stock: '',
    minStock: '',
    description: '',
    isActive: true,
};

const categoryLabels: Record<ProductCategory, string> = {
    fluids: 'Fluids',
    parts: 'Parts',
    accessories: 'Accessories',
    detailing: 'Detailing',
};

function formatPeso(amount: number): string {
    return `P${amount.toLocaleString('en-US')}`;
}

function toProductRecord(form: ProductFormState, id: number): ProductRecord {
    const unitPrice = Number.parseFloat(form.unitPrice);
    const stock = Number.parseInt(form.stock, 10);
    const minStock = Number.parseInt(form.minStock, 10);

    return {
        id,
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        stock: Number.isFinite(stock) ? stock : 0,
        minStock: Number.isFinite(minStock) ? minStock : 0,
        isActive: form.isActive,
        description: form.description.trim(),
    };
}

function toFormState(product: ProductRecord): ProductFormState {
    return {
        sku: product.sku,
        name: product.name,
        category: product.category,
        unitPrice: product.unitPrice.toString(),
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
        description: product.description,
        isActive: product.isActive,
    };
}

export default function PointOfSale() {
    const [products, setProducts] = useState<ProductRecord[]>(productSeed);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [category, setCategory] = useState<CategoryFilter>('all');
    const [selectedId, setSelectedId] = useState<number>(productSeed[0]?.id ?? 0);

    const [showProductModal, setShowProductModal] = useState(false);
    const [productMode, setProductMode] = useState<ProductFormMode>('create');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formState, setFormState] = useState<ProductFormState>(initialFormState);
    const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);
    const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

    const filteredProducts = useMemo(() => {
        const normalized = searchValue.trim().toLowerCase();

        return products.filter((product) => {
            if (category !== 'all' && product.category !== category) return false;
            if (!normalized) return true;

            const searchable = [product.sku, product.name, product.description].join(' ').toLowerCase();
            return searchable.includes(normalized);
        });
    }, [products, searchValue, category]);

    useEffect(() => {
        if (!filteredProducts.length) {
            setSelectedId(0);
            return;
        }

        if (!filteredProducts.some((product) => product.id === selectedId)) {
            setSelectedId(filteredProducts[0].id);
        }
    }, [filteredProducts, selectedId]);

    const selectedProduct = useMemo(() => products.find((product) => product.id === selectedId) ?? null, [products, selectedId]);

    const totals = useMemo(() => {
        const lowStock = products.filter((product) => product.stock <= product.minStock).length;
        const active = products.filter((product) => product.isActive).length;
        const inventoryValue = products.reduce((sum, product) => sum + product.unitPrice * product.stock, 0);

        return {
            totalProducts: products.length,
            activeProducts: active,
            lowStockProducts: lowStock,
            inventoryValue,
        };
    }, [products]);

    const cartLines = useMemo(() => {
        return cart
            .map((line) => {
                const product = products.find((candidate) => candidate.id === line.productId);
                if (!product) return null;

                return {
                    product,
                    quantity: line.quantity,
                    lineTotal: line.quantity * product.unitPrice,
                };
            })
            .filter((line): line is { product: ProductRecord; quantity: number; lineTotal: number } => line != null);
    }, [cart, products]);

    const cartSummary = useMemo(() => {
        const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
        const subtotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0);
        const tax = subtotal * 0.12;
        const total = subtotal + tax;

        return {
            itemCount,
            subtotal,
            tax,
            total,
        };
    }, [cartLines]);

    const openCreateProductModal = () => {
        setProductMode('create');
        setEditingId(null);
        setFormState(initialFormState);
        setShowProductModal(true);
    };

    const openEditProductModal = (product: ProductRecord) => {
        setProductMode('edit');
        setEditingId(product.id);
        setFormState(toFormState(product));
        setShowProductModal(true);
    };

    const upsertProduct = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (productMode === 'create') {
            const nextId = products.length ? Math.max(...products.map((product) => product.id)) + 1 : 1;
            const created = toProductRecord(formState, nextId);
            setProducts((prev) => [created, ...prev]);
            setSelectedId(created.id);
            setShowProductModal(false);
            return;
        }

        if (!editingId) return;

        setProducts((prev) => prev.map((product) => (product.id === editingId ? toProductRecord(formState, product.id) : product)));
        setSelectedId(editingId);
        setShowProductModal(false);
    };

    const deleteProduct = () => {
        if (!deleteTarget) return;

        setProducts((prev) => prev.filter((product) => product.id !== deleteTarget.id));
        setCart((prev) => prev.filter((line) => line.productId !== deleteTarget.id));
        if (selectedId === deleteTarget.id) {
            setSelectedId(0);
        }
        setDeleteTarget(null);
    };

    const addToCart = (product: ProductRecord) => {
        if (!product.isActive) return;

        setCart((prev) => {
            const existing = prev.find((line) => line.productId === product.id);
            if (!existing) {
                if (product.stock <= 0) return prev;
                return [...prev, { productId: product.id, quantity: 1 }];
            }

            if (existing.quantity >= product.stock) return prev;
            return prev.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line));
        });
    };

    const updateCartQuantity = (productId: number, nextQuantity: number) => {
        const product = products.find((item) => item.id === productId);
        if (!product) return;

        if (nextQuantity <= 0) {
            setCart((prev) => prev.filter((line) => line.productId !== productId));
            return;
        }

        const boundedQuantity = Math.min(nextQuantity, product.stock);
        setCart((prev) => prev.map((line) => (line.productId === productId ? { ...line, quantity: boundedQuantity } : line)));
    };

    const clearCart = () => {
        setCart([]);
        setCheckoutNotice(null);
    };

    const checkout = () => {
        if (!cartLines.length) {
            setCheckoutNotice('Add at least one product to continue checkout.');
            return;
        }

        setProducts((prev) =>
            prev.map((product) => {
                const line = cart.find((entry) => entry.productId === product.id);
                if (!line) return product;

                return {
                    ...product,
                    stock: Math.max(0, product.stock - line.quantity),
                };
            }),
        );

        setCart([]);
        setCheckoutNotice(`Checkout completed. ${cartSummary.itemCount} item(s) settled for ${formatPeso(cartSummary.total)}.`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Frontdesk Workspace</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Run checkout transactions and maintain the shop product catalog from one station.
                            </p>
                        </div>
                        <button
                            onClick={openCreateProductModal}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" /> Add Product
                        </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Catalog Size</p>
                            <p className="mt-2 text-3xl font-bold">{totals.totalProducts}</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Active Products</p>
                            <p className="mt-2 text-3xl font-bold">{totals.activeProducts}</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Low Stock Lines</p>
                            <p className="mt-2 text-3xl font-bold">{totals.lowStockProducts}</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Inventory Value</p>
                            <p className="mt-2 text-3xl font-bold">{formatPeso(totals.inventoryValue)}</p>
                        </div>
                    </div>

                    <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[1.45fr_1fr]">
                        <div className="profile-card rounded-xl p-5">
                            <div className="mb-4 flex flex-col gap-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={searchValue}
                                        onChange={(event) => setSearchValue(event.target.value)}
                                        placeholder="Search by SKU, product, or description"
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {(
                                        [
                                            { key: 'all', label: 'All' },
                                            { key: 'parts', label: 'Parts' },
                                            { key: 'fluids', label: 'Fluids' },
                                            { key: 'accessories', label: 'Accessories' },
                                            { key: 'detailing', label: 'Detailing' },
                                        ] as Array<{ key: CategoryFilter; label: string }>
                                    ).map((item) => (
                                        <button
                                            key={item.key}
                                            onClick={() => setCategory(item.key)}
                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                category === item.key
                                                    ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                                                    : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-[#2a2a2e]">
                                <div className="hidden grid-cols-[1.1fr_0.9fr_0.7fr_0.7fr_1fr_1fr] border-b border-[#2a2a2e] bg-[#0d0d10] px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase lg:grid">
                                    <span>Product</span>
                                    <span>Category</span>
                                    <span>Price</span>
                                    <span>Stock</span>
                                    <span>Status</span>
                                    <span>Actions</span>
                                </div>

                                <div className="max-h-140 overflow-y-auto">
                                    {filteredProducts.length === 0 ? (
                                        <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                                            No products matched your search and filters.
                                        </div>
                                    ) : (
                                        filteredProducts.map((product) => {
                                            const selected = selectedId === product.id;
                                            const isLow = product.stock <= product.minStock;
                                            return (
                                                <button
                                                    key={product.id}
                                                    onClick={() => setSelectedId(product.id)}
                                                    className={`grid w-full border-b border-[#1b1d22] px-4 py-3 text-left transition-colors last:border-b-0 lg:grid-cols-[1.1fr_0.9fr_0.7fr_0.7fr_1fr_1fr] ${
                                                        selected
                                                            ? 'bg-[#d4af37]/7 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.55)]'
                                                            : 'hover:bg-[#1a1b20]/65'
                                                    }`}
                                                >
                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm font-semibold">{product.name}</p>
                                                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                                                    </div>

                                                    <div className="mb-2 text-xs text-muted-foreground lg:mb-0">
                                                        {categoryLabels[product.category]}
                                                    </div>

                                                    <div className="mb-2 text-sm font-semibold text-[#d4af37] lg:mb-0">
                                                        {formatPeso(product.unitPrice)}
                                                    </div>

                                                    <div className="mb-2 text-sm lg:mb-0">{product.stock}</div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <span
                                                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                                                !product.isActive
                                                                    ? 'border-zinc-500/35 bg-zinc-500/12 text-zinc-300'
                                                                    : isLow
                                                                      ? 'border-amber-500/35 bg-amber-500/12 text-amber-300'
                                                                      : 'border-emerald-500/35 bg-emerald-500/12 text-emerald-300'
                                                            }`}
                                                        >
                                                            {!product.isActive ? 'Inactive' : isLow ? 'Low Stock' : 'Ready'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                addToCart(product);
                                                            }}
                                                            disabled={!product.isActive || product.stock <= 0}
                                                            className="inline-flex items-center gap-1 rounded-md border border-[#2a2a2e] px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <ShoppingCart className="h-3.5 w-3.5" /> Add
                                                        </button>
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                openEditProductModal(product);
                                                            }}
                                                            className="inline-flex items-center gap-1 rounded-md border border-[#2a2a2e] px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                                        >
                                                            <PencilLine className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setDeleteTarget(product);
                                                            }}
                                                            className="inline-flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <aside className="profile-card min-h-0 overflow-y-auto rounded-xl p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-base font-semibold">Current Ticket</h2>
                                <ReceiptText className="h-4 w-4 text-[#d4af37]" />
                            </div>

                            {checkoutNotice && (
                                <div className="mb-3 rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/10 px-3 py-2 text-xs text-[#f3d886]">
                                    {checkoutNotice}
                                </div>
                            )}

                            {cartLines.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-[#2a2a2e] p-5 text-center text-sm text-muted-foreground">
                                    No product added to ticket yet.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {cartLines.map((line) => (
                                        <div key={line.product.id} className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold">{line.product.name}</p>
                                                    <p className="text-xs text-muted-foreground">{formatPeso(line.product.unitPrice)} each</p>
                                                </div>
                                                <button
                                                    onClick={() => updateCartQuantity(line.product.id, 0)}
                                                    className="rounded-md border border-[#2a2a2e] p-1 text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between">
                                                <div className="inline-flex items-center rounded-md border border-[#2a2a2e] bg-[#0a0b0f]">
                                                    <button
                                                        onClick={() => updateCartQuantity(line.product.id, line.quantity - 1)}
                                                        className="px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="px-2 text-sm font-semibold">{line.quantity}</span>
                                                    <button
                                                        onClick={() => updateCartQuantity(line.product.id, line.quantity + 1)}
                                                        className="px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <p className="text-sm font-semibold text-[#d4af37]">{formatPeso(line.lineTotal)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3 text-sm">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Items</span>
                                    <span>{cartSummary.itemCount}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>{formatPeso(cartSummary.subtotal)}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-muted-foreground">
                                    <span>VAT (12%)</span>
                                    <span>{formatPeso(cartSummary.tax)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between border-t border-[#2a2a2e] pt-2 text-base font-semibold">
                                    <span>Total</span>
                                    <span className="text-[#d4af37]">{formatPeso(cartSummary.total)}</span>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-2">
                                <button
                                    onClick={checkout}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                                >
                                    <CheckCircle2 className="h-4 w-4" /> Charge Customer
                                </button>
                                <button
                                    onClick={clearCart}
                                    className="rounded-lg border border-[#2a2a2e] px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    Clear Ticket
                                </button>
                            </div>

                            {selectedProduct && (
                                <div className="mt-4 rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3 text-sm">
                                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Selected Product</p>
                                    <p className="mt-2 font-semibold">{selectedProduct.name}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{selectedProduct.description || 'No description set.'}</p>
                                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                        <span>SKU: {selectedProduct.sku}</span>
                                        <span>Stock: {selectedProduct.stock}</span>
                                    </div>
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>

            {showProductModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowProductModal(false)}>
                    <div className="profile-card w-full max-w-3xl rounded-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-[#d4af37] uppercase">
                                    {productMode === 'create' ? 'Create Product' : 'Edit Product'}
                                </p>
                                <h3 className="mt-1 text-lg font-semibold">
                                    {productMode === 'create' ? 'Add item to shop catalog' : 'Update product details'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowProductModal(false)}
                                className="rounded-md border border-[#2a2a2e] p-2 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={upsertProduct} className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                                <input
                                    value={formState.sku}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, sku: event.target.value }))}
                                    placeholder="SKU"
                                    required
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                <input
                                    value={formState.name}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                                    placeholder="Product name"
                                    required
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                <select
                                    value={formState.category}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value as ProductCategory }))}
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                >
                                    <option value="parts">Parts</option>
                                    <option value="fluids">Fluids</option>
                                    <option value="accessories">Accessories</option>
                                    <option value="detailing">Detailing</option>
                                </select>
                                <input
                                    value={formState.unitPrice}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, unitPrice: event.target.value }))}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Unit price"
                                    required
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                <input
                                    value={formState.stock}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, stock: event.target.value }))}
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="Stock quantity"
                                    required
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                <input
                                    value={formState.minStock}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, minStock: event.target.value }))}
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="Low stock threshold"
                                    required
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                            </div>

                            <textarea
                                value={formState.description}
                                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                                rows={3}
                                placeholder="Description"
                                className="w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
                            />

                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                <input
                                    checked={formState.isActive}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, isActive: event.target.checked }))}
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-[#2a2a2e] bg-[#18181b] text-[#d4af37]"
                                />
                                Product is active for POS
                            </label>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowProductModal(false)}
                                    className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
                                >
                                    {productMode === 'create' ? 'Create Product' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="profile-card w-full max-w-md rounded-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-3 flex items-center gap-2 text-red-400">
                            <AlertTriangle className="h-5 w-5" />
                            <h3 className="text-base font-semibold">Delete product</h3>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            You are deleting <span className="font-semibold text-foreground">{deleteTarget.name}</span>. This action cannot be undone.
                        </p>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteProduct}
                                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
