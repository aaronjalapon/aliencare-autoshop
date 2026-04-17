import AppLayout from '@/components/layout/app-layout';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { inventoryService, type NewInventoryItem } from '@/services/inventoryService';
import { frontdeskJobOrderService } from '@/services/jobOrderService';
import { posService, type PosPaymentMode } from '@/services/posService';
import { type BreadcrumbItem } from '@/types';
import type { CustomerProfile, CustomerTransaction } from '@/types/customer';
import type { InventoryItem } from '@/types/inventory';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, PencilLine, Plus, ReceiptText, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Point of Sale', href: '/pos' }];

type CategoryFilter = 'all' | string;
type ProductFormMode = 'create' | 'edit';

interface ProductRecord {
    id: number;
    sku: string;
    name: string;
    category: string;
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
    category: string;
    unitPrice: string;
    stock: string;
    minStock: string;
    description: string;
    isActive: boolean;
}

interface WalkInFormState {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
}

const initialFormState: ProductFormState = {
    sku: '',
    name: '',
    category: '',
    unitPrice: '',
    stock: '',
    minStock: '',
    description: '',
    isActive: true,
};

const initialWalkInFormState: WalkInFormState = {
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
};

function formatPeso(amount: number): string {
    return `P${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function categoryLabel(value: string): string {
    return value
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
        .join(' ');
}

function customerLabel(customer: CustomerProfile): string {
    const fullName = customer.full_name?.trim();
    if (fullName) {
        return fullName;
    }

    const fallback = `${customer.first_name} ${customer.last_name}`.trim();
    return fallback || customer.email;
}

function toProductRecord(item: InventoryItem): ProductRecord {
    return {
        id: item.item_id,
        sku: item.sku ?? `INV-${String(item.item_id).padStart(6, '0')}`,
        name: item.item_name,
        category: item.category,
        unitPrice: Number(item.unit_price),
        stock: item.stock,
        minStock: item.reorder_level,
        isActive: item.status === 'active',
        description: item.description ?? '',
    };
}

function mapProductValidationErrors(flatErrors: Record<string, string>): Record<string, string> {
    const mapped: Record<string, string> = {};

    if (flatErrors.sku) mapped.sku = flatErrors.sku;
    if (flatErrors.item_name) mapped.name = flatErrors.item_name;
    if (flatErrors.category) mapped.category = flatErrors.category;
    if (flatErrors.unit_price) mapped.unitPrice = flatErrors.unit_price;
    if (flatErrors.stock) mapped.stock = flatErrors.stock;
    if (flatErrors.reorder_level) mapped.minStock = flatErrors.reorder_level;
    if (flatErrors.description) mapped.description = flatErrors.description;

    return mapped;
}

function mapWalkInValidationErrors(flatErrors: Record<string, string>): Record<string, string> {
    const mapped: Record<string, string> = {};

    if (flatErrors.first_name) mapped.firstName = flatErrors.first_name;
    if (flatErrors.last_name) mapped.lastName = flatErrors.last_name;
    if (flatErrors.phone_number) mapped.phoneNumber = flatErrors.phone_number;
    if (flatErrors.email) mapped.email = flatErrors.email;

    return mapped;
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
    const [products, setProducts] = useState<ProductRecord[]>([]);
    const [customers, setCustomers] = useState<CustomerProfile[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<CustomerTransaction[]>([]);

    const [cart, setCart] = useState<CartLine[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [category, setCategory] = useState<CategoryFilter>('all');
    const [selectedId, setSelectedId] = useState<number>(0);

    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [paymentMode, setPaymentMode] = useState<PosPaymentMode>('cash');
    const [checkoutNotes, setCheckoutNotes] = useState('');

    const [showProductModal, setShowProductModal] = useState(false);
    const [showWalkInModal, setShowWalkInModal] = useState(false);
    const [productMode, setProductMode] = useState<ProductFormMode>('create');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formState, setFormState] = useState<ProductFormState>(initialFormState);
    const [walkInFormState, setWalkInFormState] = useState<WalkInFormState>(initialWalkInFormState);
    const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);

    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [isSavingWalkInCustomer, setIsSavingWalkInCustomer] = useState(false);
    const [isDeletingProduct, setIsDeletingProduct] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const [pageError, setPageError] = useState<string | null>(null);
    const [productFormErrors, setProductFormErrors] = useState<Record<string, string>>({});
    const [walkInFormErrors, setWalkInFormErrors] = useState<Record<string, string>>({});
    const [productFormErrorMessage, setProductFormErrorMessage] = useState<string | null>(null);
    const [walkInFormErrorMessage, setWalkInFormErrorMessage] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
    const [checkoutPaymentUrl, setCheckoutPaymentUrl] = useState<string | null>(null);

    const loadProducts = useCallback(async () => {
        setIsLoadingProducts(true);

        try {
            const response = await inventoryService.getInventoryItems({ per_page: 200 });
            setProducts((response.data.data ?? []).map(toProductRecord));
            setPageError(null);
        } catch {
            setPageError('Unable to load POS products right now. Please try again.');
        } finally {
            setIsLoadingProducts(false);
        }
    }, []);

    const loadCustomers = useCallback(async () => {
        setIsLoadingCustomers(true);

        try {
            const response = await frontdeskJobOrderService.getCustomers({ per_page: 200 });
            const nextCustomers = (response.data.data ?? []).filter(
                (customer) => customer.account_status !== 'rejected' && customer.account_status !== 'deleted',
            );
            nextCustomers.sort((a, b) => customerLabel(a).localeCompare(customerLabel(b)));
            setCustomers(nextCustomers);
        } catch {
            setCustomers([]);
        } finally {
            setIsLoadingCustomers(false);
        }
    }, []);

    const loadRecentTransactions = useCallback(async () => {
        setIsLoadingTransactions(true);

        try {
            const response = await posService.getTransactions({ per_page: 5 });
            setRecentTransactions(response.data.data ?? []);
        } catch {
            setRecentTransactions([]);
        } finally {
            setIsLoadingTransactions(false);
        }
    }, []);

    useEffect(() => {
        void loadProducts();
        void loadCustomers();
        void loadRecentTransactions();
    }, [loadProducts, loadCustomers, loadRecentTransactions]);

    const categoryOptions = useMemo(() => {
        const unique = new Set<string>();

        products.forEach((product) => {
            const value = product.category.trim();
            if (value) {
                unique.add(value);
            }
        });

        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [products]);

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
    const selectedCustomer = useMemo(() => customers.find((customer) => customer.id === selectedCustomerId) ?? null, [customers, selectedCustomerId]);

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
        const total = subtotal;

        return {
            itemCount,
            subtotal,
            total,
        };
    }, [cartLines]);

    const openCreateProductModal = () => {
        setProductMode('create');
        setEditingId(null);
        setFormState({
            ...initialFormState,
            category: categoryOptions[0] ?? 'General Parts',
        });
        setProductFormErrors({});
        setProductFormErrorMessage(null);
        setShowProductModal(true);
    };

    const openEditProductModal = (product: ProductRecord) => {
        setProductMode('edit');
        setEditingId(product.id);
        setFormState(toFormState(product));
        setProductFormErrors({});
        setProductFormErrorMessage(null);
        setShowProductModal(true);
    };

    const openWalkInModal = () => {
        setWalkInFormState(initialWalkInFormState);
        setWalkInFormErrors({});
        setWalkInFormErrorMessage(null);
        setShowWalkInModal(true);
    };

    const createWalkInCustomer = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const firstName = walkInFormState.firstName.trim();
        const lastName = walkInFormState.lastName.trim();
        const phoneNumber = walkInFormState.phoneNumber.trim();
        const email = walkInFormState.email.trim();

        const localErrors: Record<string, string> = {};
        if (!firstName) localErrors.firstName = 'First name is required.';
        if (!lastName) localErrors.lastName = 'Last name is required.';
        if (!phoneNumber) localErrors.phoneNumber = 'Phone number is required.';

        if (Object.keys(localErrors).length > 0) {
            setWalkInFormErrors(localErrors);
            return;
        }

        setIsSavingWalkInCustomer(true);
        setWalkInFormErrors({});
        setWalkInFormErrorMessage(null);

        try {
            const response = await frontdeskJobOrderService.createCustomer({
                first_name: firstName,
                last_name: lastName,
                phone_number: phoneNumber,
                email: email || null,
            });

            const createdCustomer = response.data;

            setCustomers((prev) => {
                const nextCustomers = [createdCustomer, ...prev.filter((customer) => customer.id !== createdCustomer.id)];
                nextCustomers.sort((a, b) => customerLabel(a).localeCompare(customerLabel(b)));

                return nextCustomers;
            });

            setSelectedCustomerId(createdCustomer.id);
            setCheckoutNotice(`${customerLabel(createdCustomer)} added as walk-in customer.`);
            setCheckoutError(null);
            setShowWalkInModal(false);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                const flatErrors = flattenValidationErrors(error.validationErrors);
                setWalkInFormErrors(mapWalkInValidationErrors(flatErrors));
                setWalkInFormErrorMessage(error.message || 'Please fix the walk-in customer fields.');
            } else if (error instanceof Error) {
                setWalkInFormErrorMessage(error.message || 'Unable to save walk-in customer right now.');
            } else {
                setWalkInFormErrorMessage('Unable to save walk-in customer right now.');
            }
        } finally {
            setIsSavingWalkInCustomer(false);
        }
    };

    const toPayload = (form: ProductFormState): NewInventoryItem => {
        const unitPrice = Number.parseFloat(form.unitPrice);
        const stock = Number.parseInt(form.stock, 10);
        const minStock = Number.parseInt(form.minStock, 10);

        return {
            sku: form.sku.trim() || undefined,
            item_name: form.name.trim(),
            description: form.description.trim(),
            category: form.category.trim(),
            stock: Number.isFinite(stock) ? stock : 0,
            reorder_level: Number.isFinite(minStock) ? minStock : 0,
            unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
            supplier: '',
            location: '',
            status: form.isActive ? 'active' : 'inactive',
        };
    };

    const upsertProduct = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setIsSavingProduct(true);
        setProductFormErrors({});
        setProductFormErrorMessage(null);

        try {
            const payload = toPayload(formState);

            if (productMode === 'create') {
                const response = await inventoryService.createInventoryItem(payload);
                setSelectedId(response.data.item_id);
                setCheckoutNotice(`Product ${response.data.item_name} added to inventory.`);
            } else {
                if (!editingId) {
                    return;
                }

                await inventoryService.updateInventoryItem(editingId, payload);
                setSelectedId(editingId);
                setCheckoutNotice('Product details updated.');
            }

            setShowProductModal(false);
            await loadProducts();
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                const flat = flattenValidationErrors(error.validationErrors);
                setProductFormErrors(mapProductValidationErrors(flat));
                setProductFormErrorMessage(error.message || 'Please fix the highlighted fields and try again.');
            } else if (error instanceof Error) {
                setProductFormErrorMessage(error.message || 'Unable to save product right now.');
            } else {
                setProductFormErrorMessage('Unable to save product right now.');
            }
        } finally {
            setIsSavingProduct(false);
        }
    };

    const deleteProduct = async () => {
        if (!deleteTarget) return;

        setIsDeletingProduct(true);

        try {
            await inventoryService.deleteInventoryItem(String(deleteTarget.id));

            setCart((prev) => prev.filter((line) => line.productId !== deleteTarget.id));
            setCheckoutNotice(`Product ${deleteTarget.name} was discontinued.`);

            if (selectedId === deleteTarget.id) {
                setSelectedId(0);
            }

            setDeleteTarget(null);
            await loadProducts();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to delete product right now.';
            setCheckoutError(message);
        } finally {
            setIsDeletingProduct(false);
        }
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
        setCheckoutError(null);
        setCheckoutNotice(null);
        setCheckoutPaymentUrl(null);
    };

    const checkout = async () => {
        if (!cartLines.length) {
            setCheckoutError('Add at least one product to continue checkout.');
            return;
        }

        if (!selectedCustomerId) {
            setCheckoutError('Select or add a customer before checkout.');
            return;
        }

        setIsCheckingOut(true);
        setCheckoutError(null);
        setCheckoutNotice(null);
        setCheckoutPaymentUrl(null);

        try {
            const response = await posService.checkout({
                customer_id: selectedCustomerId,
                payment_mode: paymentMode,
                notes: checkoutNotes.trim() || undefined,
                cart: cart.map((line) => ({
                    item_id: line.productId,
                    quantity: line.quantity,
                })),
            });

            const summary = response.data.checkout;

            setCart([]);
            setCheckoutNotes('');
            setCheckoutNotice(`Checkout ${summary.reference_number} completed for ${formatPeso(summary.total)}.`);
            setCheckoutPaymentUrl(summary.payment_url);

            await Promise.all([loadProducts(), loadRecentTransactions()]);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                const flatErrors = flattenValidationErrors(error.validationErrors);
                const firstError = Object.values(flatErrors)[0];
                setCheckoutError(firstError || error.message || 'Checkout failed due to validation errors.');
            } else if (error instanceof Error) {
                setCheckoutError(error.message || 'Checkout failed. Please try again.');
            } else {
                setCheckoutError('Checkout failed. Please try again.');
            }
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Frontdesk Workspace</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Run backend-connected checkout transactions and maintain the inventory-backed product catalog.
                            </p>
                        </div>
                        <button
                            onClick={openCreateProductModal}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" /> Add Product
                        </button>
                    </div>

                    {pageError && <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">{pageError}</div>}

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
                                    {[
                                        { key: 'all', label: 'All' },
                                        ...categoryOptions.map((value) => ({ key: value, label: categoryLabel(value) })),
                                    ].map((item) => (
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
                                    {isLoadingProducts ? (
                                        <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
                                        </div>
                                    ) : filteredProducts.length === 0 ? (
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
                                                        {categoryLabel(product.category)}
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

                            <div className="mt-4 rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Customer & Payment</p>

                                <select
                                    value={selectedCustomerId ? String(selectedCustomerId) : ''}
                                    onChange={(event) => setSelectedCustomerId(event.target.value ? Number(event.target.value) : null)}
                                    className="mt-2 h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                >
                                    <option value="">Select customer</option>
                                    {customers.map((customer) => (
                                        <option key={customer.id} value={customer.id}>
                                            {customerLabel(customer)}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    onClick={openWalkInModal}
                                    className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#2a2a2e] px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Walk-In Customer
                                </button>

                                {isLoadingCustomers && <p className="mt-2 text-xs text-muted-foreground">Loading customer list...</p>}
                                {!isLoadingCustomers && customers.length === 0 && (
                                    <p className="mt-2 text-xs text-amber-300">No customers available yet. Add a walk-in customer to continue.</p>
                                )}

                                {selectedCustomer && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {customerLabel(selectedCustomer)}
                                        {selectedCustomer.phone_number ? ` • ${selectedCustomer.phone_number}` : ''}
                                    </p>
                                )}

                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                    <button
                                        onClick={() => setPaymentMode('cash')}
                                        className={`rounded-md border px-3 py-2 font-semibold transition-colors ${
                                            paymentMode === 'cash'
                                                ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#f6d778]'
                                                : 'border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                        }`}
                                    >
                                        Cash
                                    </button>
                                    <button
                                        onClick={() => setPaymentMode('online')}
                                        className={`rounded-md border px-3 py-2 font-semibold transition-colors ${
                                            paymentMode === 'online'
                                                ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#f6d778]'
                                                : 'border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                        }`}
                                    >
                                        Online
                                    </button>
                                </div>

                                <textarea
                                    value={checkoutNotes}
                                    onChange={(event) => setCheckoutNotes(event.target.value)}
                                    rows={2}
                                    placeholder="Optional checkout note"
                                    className="mt-3 w-full rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] px-3 py-2 text-xs focus:border-[#d4af37] focus:outline-none"
                                />
                            </div>

                            <div className="mt-4 rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3 text-sm">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Items</span>
                                    <span>{cartSummary.itemCount}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>{formatPeso(cartSummary.subtotal)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between border-t border-[#2a2a2e] pt-2 text-base font-semibold">
                                    <span>Total</span>
                                    <span className="text-[#d4af37]">{formatPeso(cartSummary.total)}</span>
                                </div>
                            </div>

                            {checkoutError && (
                                <div className="mt-3 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                                    {checkoutError}
                                </div>
                            )}

                            {checkoutPaymentUrl && (
                                <button
                                    onClick={() => window.open(checkoutPaymentUrl, '_blank', 'noopener,noreferrer')}
                                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#d4af37]/40 px-4 py-2 text-xs font-semibold text-[#f6d778] transition-colors hover:bg-[#d4af37]/10"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" /> Open Payment Link
                                </button>
                            )}

                            <div className="mt-4 grid gap-2">
                                <button
                                    onClick={checkout}
                                    disabled={isCheckingOut}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                                >
                                    {isCheckingOut ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4" />{' '}
                                            {paymentMode === 'online' ? 'Create Payment Link' : 'Charge Customer'}
                                        </>
                                    )}
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

                            <div className="mt-4 rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3 text-sm">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Recent POS Transactions</p>

                                {isLoadingTransactions ? (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading recent sales...
                                    </div>
                                ) : recentTransactions.length === 0 ? (
                                    <p className="mt-2 text-xs text-muted-foreground">No POS transactions yet.</p>
                                ) : (
                                    <div className="mt-2 space-y-2">
                                        {recentTransactions.map((transaction) => (
                                            <div key={transaction.id} className="rounded-md border border-[#2a2a2e] px-2.5 py-2 text-xs">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-semibold text-foreground">
                                                        {transaction.reference_number ?? `Transaction #${transaction.id}`}
                                                    </p>
                                                    <p className="font-semibold text-[#d4af37]">{formatPeso(Number(transaction.amount))}</p>
                                                </div>
                                                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                                    <span>{(transaction.payment_method || 'unknown').toUpperCase()}</span>
                                                    <span>{transaction.xendit_status || 'PENDING'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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

                        {productFormErrorMessage && (
                            <div className="mb-3 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                                {productFormErrorMessage}
                            </div>
                        )}

                        {Object.values(productFormErrors).length > 0 && (
                            <div className="mb-3 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                                {Object.values(productFormErrors)
                                    .slice(0, 3)
                                    .map((message) => (
                                        <p key={message}>{message}</p>
                                    ))}
                            </div>
                        )}

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
                                <input
                                    value={formState.category}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                                    placeholder="Category"
                                    required
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
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
                                    disabled={isSavingProduct}
                                    className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
                                >
                                    {isSavingProduct ? 'Saving...' : productMode === 'create' ? 'Create Product' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showWalkInModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowWalkInModal(false)}>
                    <div className="profile-card w-full max-w-lg rounded-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-[#d4af37] uppercase">Walk-In Customer</p>
                                <h3 className="mt-1 text-lg font-semibold">Add customer details for this POS checkout</h3>
                            </div>
                            <button
                                onClick={() => setShowWalkInModal(false)}
                                className="rounded-md border border-[#2a2a2e] p-2 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {walkInFormErrorMessage && (
                            <div className="mb-3 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                                {walkInFormErrorMessage}
                            </div>
                        )}

                        <form onSubmit={createWalkInCustomer} className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <input
                                        value={walkInFormState.firstName}
                                        onChange={(event) => setWalkInFormState((prev) => ({ ...prev, firstName: event.target.value }))}
                                        placeholder="First name"
                                        required
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {walkInFormErrors.firstName && <p className="mt-1 text-xs text-red-300">{walkInFormErrors.firstName}</p>}
                                </div>
                                <div>
                                    <input
                                        value={walkInFormState.lastName}
                                        onChange={(event) => setWalkInFormState((prev) => ({ ...prev, lastName: event.target.value }))}
                                        placeholder="Last name"
                                        required
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {walkInFormErrors.lastName && <p className="mt-1 text-xs text-red-300">{walkInFormErrors.lastName}</p>}
                                </div>
                            </div>

                            <div>
                                <input
                                    value={walkInFormState.phoneNumber}
                                    onChange={(event) => setWalkInFormState((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                                    placeholder="Phone number"
                                    required
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                {walkInFormErrors.phoneNumber && <p className="mt-1 text-xs text-red-300">{walkInFormErrors.phoneNumber}</p>}
                            </div>

                            <div>
                                <input
                                    value={walkInFormState.email}
                                    onChange={(event) => setWalkInFormState((prev) => ({ ...prev, email: event.target.value }))}
                                    placeholder="Email (optional)"
                                    type="email"
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                {walkInFormErrors.email && <p className="mt-1 text-xs text-red-300">{walkInFormErrors.email}</p>}
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowWalkInModal(false)}
                                    className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingWalkInCustomer}
                                    className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
                                >
                                    {isSavingWalkInCustomer ? 'Saving...' : 'Save Customer'}
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
                                disabled={isDeletingProduct}
                                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                            >
                                {isDeletingProduct ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
