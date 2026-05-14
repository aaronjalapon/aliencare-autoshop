import { formatPeso } from '@/lib/jobOrderFormatters';
import { inventoryService } from '@/services/inventoryService';
import { AddJobOrderItemPayload, UpdateJobOrderItemPayload, jobOrderService } from '@/services/jobOrderService';
import type { InventoryItem } from '@/types/inventory';
import type { JobOrderItem } from '@/types/customer';
import { Loader2, Minus, Plus, Search, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Props {
    jobOrderId: number;
    items: JobOrderItem[];
    onItemsChanged: () => void;
}

export default function JobOrderItemsEditor({ jobOrderId, items, onItemsChanged }: Props) {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState('1');
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // ── Load inventory ────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsLoadingInventory(true);
            try {
                const response = await inventoryService.getInventoryItems({ per_page: 200 });
                if (!cancelled) {
                    setInventory((response.data.data ?? []).filter(
                        (item) => item.status === 'active' && item.stock > 0,
                    ));
                }
            } catch {
                if (!cancelled) setInventory([]);
            } finally {
                if (!cancelled) setIsLoadingInventory(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // ── Filtered inventory ────────────────────────────────────────────────
    const filteredInventory = useMemo(() => {
        const normalized = searchTerm.trim().toLowerCase();
        if (!normalized) return inventory.slice(0, 25);
        return inventory
            .filter((item) => {
                const haystack = [item.item_name, item.sku ?? '', item.description ?? '']
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(normalized);
            })
            .slice(0, 25);
    }, [inventory, searchTerm]);

    const showDropdown = searchTerm.trim().length > 0 && !selectedItem;

    const selectItem = useCallback((item: InventoryItem) => {
        setSelectedItem(item);
        setSearchTerm(item.item_name);
        setAddError(null);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedItem(null);
        setSearchTerm('');
        setQuantity('1');
        setAddError(null);
    }, []);

    // ── Add item ──────────────────────────────────────────────────────────
    const handleAddItem = async (event: FormEvent) => {
        event.preventDefault();

        if (!selectedItem) {
            setAddError('Search and select an inventory item first.');
            return;
        }

        const qty = Number.parseInt(quantity, 10);
        if (!Number.isFinite(qty) || qty < 1) {
            setAddError('Quantity must be at least 1.');
            return;
        }

        if (qty > selectedItem.stock) {
            setAddError(`Only ${selectedItem.stock} in stock.`);
            return;
        }

        setIsAdding(true);
        setAddError(null);

        try {
            const payload: AddJobOrderItemPayload = {
                item_type: 'part',
                item_id: selectedItem.item_id,
                description: selectedItem.item_name,
                quantity: qty,
                unit_price: selectedItem.unit_price,
            };

            await jobOrderService.addItemToJobOrder(jobOrderId, payload);
            clearSelection();
            onItemsChanged();
        } catch (error) {
            setAddError(error instanceof Error ? error.message : 'Failed to add item.');
        } finally {
            setIsAdding(false);
        }
    };

    // ── Quantity change handler ───────────────────────────────────────────
    const handleQuantityChange = async (itemId: number, newQty: number) => {
        if (newQty < 1) return;

        setUpdatingId(itemId);
        setActionError(null);

        try {
            const payload: UpdateJobOrderItemPayload = { quantity: newQty };
            await jobOrderService.updateJobOrderItem(jobOrderId, itemId, payload);
            onItemsChanged();
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to update quantity.');
        } finally {
            setUpdatingId(null);
        }
    };

    // ── Remove item ───────────────────────────────────────────────────────
    const handleRemoveItem = async (itemId: number, description: string) => {
        if (!window.confirm(`Remove "${description}" from this job order?`)) return;

        setActionError(null);
        try {
            await jobOrderService.removeJobOrderItem(jobOrderId, itemId);
            onItemsChanged();
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to remove item.');
        }
    };

    const totalCost = items.reduce((sum, item) => sum + item.total_price, 0);

    return (
        <div className="rounded-xl border border-[#2a2a2e]/50 bg-[#0d0d10] p-4">
            <p className="mb-3 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Line Items</p>

            {items.length === 0 ? (
                <p className="mb-3 text-sm text-muted-foreground">No items added yet.</p>
            ) : (
                <div className="mb-3 overflow-hidden rounded-lg border border-[#2a2a2e]">
                    <div className="grid items-center grid-cols-[minmax(0,1fr)_100px_100px_100px_32px] gap-3 border-b border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        <span>Description</span>
                        <span className="text-center">Qty</span>
                        <span className="text-right">Unit</span>
                        <span className="text-right">Total</span>
                        <span></span>
                    </div>
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="grid items-center grid-cols-[minmax(0,1fr)_100px_100px_100px_32px] gap-3 border-b border-[#1b1d22] px-3 py-2 text-sm last:border-b-0"
                        >
                            <span className="truncate text-foreground" title={item.description ?? ''}>{item.description ?? '—'}</span>
                            <div className="flex items-center justify-center gap-1.5">
                                <button
                                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                    disabled={updatingId === item.id || item.quantity <= 1}
                                    className="flex h-6 w-6 items-center justify-center rounded border border-[#2a2a2e] text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold tabular-nums">
                                    {updatingId === item.id ? (
                                        <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        item.quantity
                                    )}
                                </span>
                                <button
                                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                    disabled={updatingId === item.id}
                                    className="flex h-6 w-6 items-center justify-center rounded border border-[#2a2a2e] text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    <Plus className="h-3 w-3" />
                                </button>
                            </div>
                            <span className="text-right text-muted-foreground tabular-nums">{formatPeso(item.unit_price)}</span>
                            <span className="text-right font-semibold text-[#d4af37] tabular-nums">{formatPeso(item.total_price)}</span>
                            <div className="flex items-center justify-end">
                                <button
                                    onClick={() => handleRemoveItem(item.id, item.description ?? 'this item')}
                                    disabled={updatingId === item.id}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-rose-500/30 text-rose-400/70 transition-colors hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-30"
                                    title="Remove item"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {items.length > 0 && (
                <div className="mb-4 text-right">
                    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mr-3">Items Total</span>
                    <span className="text-sm font-bold text-[#d4af37]">{formatPeso(totalCost)}</span>
                </div>
            )}

            {actionError && <p className="mb-2 text-xs text-red-300">{actionError}</p>}

            <form onSubmit={handleAddItem} className="space-y-3 pt-3 border-t border-[#2a2a2e]/50">
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Add Item</p>

                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        ref={searchRef}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (selectedItem) setSelectedItem(null);
                        }}
                        placeholder="Search inventory item by name or SKU..."
                        className="h-9 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-8 pl-8 text-sm focus:border-[#d4af37] focus:outline-none"
                        autoComplete="off"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Dropdown */}
                {showDropdown && (
                    <div
                        className="max-h-40 overflow-y-auto rounded-lg border border-[#2a2a2e] bg-[#0d0d10]"
                    >
                        {isLoadingInventory ? (
                            <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading inventory...
                            </div>
                        ) : filteredInventory.length === 0 ? (
                            <div className="px-3 py-4 text-xs text-muted-foreground">No matching items found.</div>
                        ) : (
                            filteredInventory.map((inv) => (
                                <button
                                    key={inv.item_id}
                                    type="button"
                                    onClick={() => selectItem(inv)}
                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-[#1a1b20]"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-foreground">{inv.item_name}</p>
                                        <p className="text-[10px] text-muted-foreground">{inv.sku ?? `INV-${String(inv.item_id).padStart(6, '0')}`}</p>
                                    </div>
                                    <div className="ml-3 shrink-0 text-right">
                                        <p className="font-semibold text-[#d4af37]">{formatPeso(inv.unit_price)}</p>
                                        <p className="text-[10px] text-muted-foreground">{inv.stock} in stock</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* Selected item info */}
                {selectedItem && (
                    <div className="flex items-center gap-2 rounded-md border border-[#d4af37]/30 bg-[#d4af37]/7 px-3 py-2 text-xs">
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground">{selectedItem.item_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                                {formatPeso(selectedItem.unit_price)} each &middot; {selectedItem.stock} in stock
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* Quantity */}
                {selectedItem && (
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Qty</label>
                        <button
                            type="button"
                            onClick={() => setQuantity((prev) => String(Math.max(1, (Number.parseInt(prev, 10) || 1) - 1)))}
                            className="flex h-7 w-7 items-center justify-center rounded border border-[#2a2a2e] text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                        >
                            <Minus className="h-3 w-3" />
                        </button>
                        <input
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            type="number"
                            min="1"
                            max={selectedItem.stock}
                            className="h-7 w-16 rounded border border-[#2a2a2e] bg-[#0d0d10] px-2 text-center text-xs focus:border-[#d4af37] focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const current = Number.parseInt(quantity, 10) || 1;
                                setQuantity(String(Math.min(current + 1, selectedItem.stock)));
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded border border-[#2a2a2e] text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                        >
                            <Plus className="h-3 w-3" />
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                            Stock: {selectedItem.stock}
                        </span>
                    </div>
                )}

                {addError && <p className="text-xs text-red-300">{addError}</p>}

                <button
                    type="submit"
                    disabled={isAdding || !selectedItem}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-3 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isAdding ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                        </>
                    ) : (
                        <>
                            <Plus className="h-4 w-4" /> Add to Job Order
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
