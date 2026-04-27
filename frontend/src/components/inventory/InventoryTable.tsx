import { AlertTriangle, ArrowDownCircle, CheckCircle, Edit, Loader2, Package, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInventoryItems } from '../../hooks/useInventory';
import { InventoryItem } from '../../types/inventory';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export function InventoryTable() {
    const [workspaceMessage, setWorkspaceMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [stockFilter, setStockFilter] = useState<string>('all');
    const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
    const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
    const [selectedPartId, setSelectedPartId] = useState<string>('');
    const [stockToAdd, setStockToAdd] = useState('');
    const [addStockError, setAddStockError] = useState<string | null>(null);
    const [isStockActionDialogOpen, setIsStockActionDialogOpen] = useState(false);
    const [stockActionType, setStockActionType] = useState<'deduct' | 'return' | 'damage'>('deduct');
    const [selectedActionPartId, setSelectedActionPartId] = useState<string>('');
    const [stockActionQuantity, setStockActionQuantity] = useState('');
    const [stockActionError, setStockActionError] = useState<string | null>(null);
    const [addItemError, setAddItemError] = useState<string | null>(null);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isAddingStock, setIsAddingStock] = useState(false);
    const [isSubmittingStockAction, setIsSubmittingStockAction] = useState(false);
    const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [isUpdatingItem, setIsUpdatingItem] = useState(false);
    const [isDiscontinuingItemId, setIsDiscontinuingItemId] = useState<number | null>(null);
    const [updateItemError, setUpdateItemError] = useState<string | null>(null);

    // New item form state
    const [newItem, setNewItem] = useState({
        item_name: '',
        description: '',
        category: '',
        stock: '',
        reorder_level: '',
        unit_price: '',
        supplier: '',
        location: '',
    });

    // Use real API data
    const {
        data: inventoryData,
        loading,
        error,
        addStock,
        createItem,
        deleteItem,
        deductStock,
        logReturnDamage,
        updateItem,
        updateFilters,
    } = useInventoryItems({
        search: searchTerm || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        low_stock: stockFilter === 'low' ? true : undefined,
        per_page: 50,
    });

    const parts = inventoryData?.data?.data && Array.isArray(inventoryData.data.data) ? inventoryData.data.data : [];
    const categories =
        parts.length > 0
            ? [...new Set(parts.map((part: InventoryItem) => part.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
            : [];

    // Filter parts locally for immediate UI feedback
    const filteredParts =
        parts && Array.isArray(parts)
            ? parts.filter((part) => {
                  const isDiscontinued = part?.status === 'discontinued';
                  const matchesSearch =
                      !searchTerm ||
                      part?.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      part?.item_id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                      part?.description?.toLowerCase().includes(searchTerm.toLowerCase());

                  const matchesCategory = categoryFilter === 'all' || part?.category === categoryFilter;

                  const matchesStock = stockFilter === 'all' || (stockFilter === 'low' && part?.stock <= part?.reorder_level);

                  return !isDiscontinued && matchesSearch && matchesCategory && matchesStock;
              })
            : [];

    // Update filters when inputs change
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({
                search: searchTerm || undefined,
                category: categoryFilter !== 'all' ? categoryFilter : undefined,
                low_stock: stockFilter === 'low' ? true : undefined,
            });
        }, 500); // Debounce API calls

        return () => clearTimeout(timer);
    }, [searchTerm, categoryFilter, stockFilter, updateFilters]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                <span>Loading inventory...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Failed to load inventory data: {error}</AlertDescription>
            </Alert>
        );
    }

    const handleAddStock = async () => {
        setAddStockError(null);
        setWorkspaceMessage(null);

        if (!selectedPartId || !stockToAdd) {
            setAddStockError('Please select a part and enter a quantity.');
            return;
        }

        const quantity = parseInt(stockToAdd);
        if (isNaN(quantity) || quantity <= 0) {
            setAddStockError('Quantity must be a valid number greater than 0.');
            return;
        }

        setIsAddingStock(true);
        const result = await addStock({
            item_id: parseInt(selectedPartId),
            quantity,
            reference_number: `PROC-${Date.now()}`,
            notes: 'Manual stock addition',
        });

        if (result.success) {
            setStockToAdd('');
            setSelectedPartId('');
            setIsAddStockDialogOpen(false);
            setWorkspaceMessage({
                type: 'success',
                message: `Added ${quantity} unit${quantity === 1 ? '' : 's'} to inventory.`,
            });
        } else {
            setAddStockError(result.error || 'Failed to add stock.');
        }

        setIsAddingStock(false);
    };

    const handleStockAction = async () => {
        setStockActionError(null);
        setWorkspaceMessage(null);

        if (!selectedActionPartId || !stockActionQuantity) {
            setStockActionError('Please select a part and enter a quantity.');
            return;
        }

        const quantity = parseInt(stockActionQuantity);

        if (isNaN(quantity) || quantity <= 0) {
            setStockActionError('Quantity must be a valid number greater than 0.');
            return;
        }

        const itemId = parseInt(selectedActionPartId);

        setIsSubmittingStockAction(true);

        const result =
            stockActionType === 'deduct'
                ? await deductStock({
                      item_id: itemId,
                      quantity,
                      reference_number: `SALE-${Date.now()}`,
                      notes: 'Manual stock deduction',
                  })
                : await logReturnDamage({
                      item_id: itemId,
                      quantity,
                      transaction_type: stockActionType,
                      reference_number: `${stockActionType === 'return' ? 'RET' : 'DMG'}-${Date.now()}`,
                      notes: stockActionType === 'return' ? 'Manual return log' : 'Manual damage log',
                  });

        if (result.success) {
            setStockActionQuantity('');
            setSelectedActionPartId('');
            setStockActionType('deduct');
            setIsStockActionDialogOpen(false);
            setWorkspaceMessage({
                type: 'success',
                message: `${stockActionType === 'deduct' ? 'Deduction' : stockActionType === 'return' ? 'Return' : 'Damage'} logged successfully.`,
            });
        } else {
            setStockActionError(result.error || 'Failed to submit stock transaction.');
        }

        setIsSubmittingStockAction(false);
    };

    const handleDiscontinueItem = async (item: InventoryItem) => {
        setWorkspaceMessage(null);
        const confirmed = window.confirm(
            `Discontinue ${item.item_name}? This marks the item as discontinued and hides it from active inventory views.`,
        );

        if (!confirmed) {
            return;
        }

        try {
            setIsDiscontinuingItemId(item.item_id);
            const result = await deleteItem(item.item_id);

            if (result.success) {
                setWorkspaceMessage({
                    type: 'success',
                    message: `${item.item_name} was marked as discontinued.`,
                });
            } else {
                setWorkspaceMessage({
                    type: 'error',
                    message: result.error || 'Failed to discontinue item.',
                });
            }
        } finally {
            setIsDiscontinuingItemId(null);
        }
    };

    const handleAddItem = async () => {
        setAddItemError(null);
        setWorkspaceMessage(null);
        setIsAddingItem(true);

        try {
            if (!newItem.item_name || !newItem.category || !newItem.stock || !newItem.reorder_level || !newItem.unit_price) {
                setAddItemError('Please fill in all required fields marked with *');
                return;
            }

            const stockAmount = parseInt(newItem.stock);
            const reorderLevel = parseInt(newItem.reorder_level);
            const unitPrice = parseFloat(newItem.unit_price);

            if (isNaN(stockAmount) || stockAmount < 0) {
                setAddItemError('Initial stock must be a valid number (0 or greater)');
                return;
            }

            if (isNaN(reorderLevel) || reorderLevel < 1) {
                setAddItemError('Reorder level must be a valid number (1 or greater)');
                return;
            }

            if (isNaN(unitPrice) || unitPrice < 0) {
                setAddItemError('Unit price must be a valid number (0 or greater)');
                return;
            }

            const itemData = {
                item_name: newItem.item_name,
                description: newItem.description,
                category: newItem.category,
                stock: stockAmount,
                reorder_level: reorderLevel,
                unit_price: unitPrice,
                supplier: newItem.supplier,
                location: newItem.location,
            };

            const result = await createItem(itemData);

            if (result.success) {
                setNewItem({
                    item_name: '',
                    description: '',
                    category: '',
                    stock: '',
                    reorder_level: '',
                    unit_price: '',
                    supplier: '',
                    location: '',
                });

                setIsAddItemDialogOpen(false);
                setWorkspaceMessage({
                    type: 'success',
                    message: `${itemData.item_name} was added to inventory.`,
                });
            } else {
                setAddItemError(result.error || 'Failed to add item. Please try again.');
            }
        } finally {
            setIsAddingItem(false);
        }
    };

    const handleEditItem = (item: InventoryItem) => {
        setEditingItem(item);
        setUpdateItemError(null);
        setIsEditItemDialogOpen(true);
    };

    const handleUpdateItem = async () => {
        if (!editingItem) return;

        setUpdateItemError(null);
        setWorkspaceMessage(null);
        setIsUpdatingItem(true);

        try {
            if (!editingItem.item_name || !editingItem.category || editingItem.reorder_level === undefined || editingItem.unit_price === undefined) {
                setUpdateItemError('Please fill in all required fields');
                return;
            }

            if (editingItem.reorder_level < 1) {
                setUpdateItemError('Reorder level must be 1 or greater');
                return;
            }

            if (editingItem.unit_price < 0) {
                setUpdateItemError('Unit price must be 0 or greater');
                return;
            }

            const updateData = {
                item_name: editingItem.item_name,
                description: editingItem.description,
                category: editingItem.category,
                reorder_level: editingItem.reorder_level,
                unit_price: editingItem.unit_price,
                supplier: editingItem.supplier,
                location: editingItem.location,
            };

            const result = await updateItem(editingItem.item_id, updateData);

            if (result.success) {
                setIsEditItemDialogOpen(false);
                setEditingItem(null);
                setWorkspaceMessage({
                    type: 'success',
                    message: `${updateData.item_name} was updated successfully.`,
                });
            } else {
                setUpdateItemError(result.error || 'Failed to update item. Please try again.');
            }
        } finally {
            setIsUpdatingItem(false);
        }
    };
    const getStockStatus = (part: InventoryItem) => {
        if (part.stock === 0) {
            return 'OUT_OF_STOCK';
        } else if (part.stock <= part.reorder_level) {
            return 'LOW_STOCK';
        } else if (part.stock > part.reorder_level * 3) {
            return 'HIGH_STOCK';
        } else {
            return 'NORMAL_STOCK';
        }
    };

    const getStockBadge = (part: InventoryItem) => {
        const status = getStockStatus(part);

        switch (status) {
            case 'OUT_OF_STOCK':
                return (
                    <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Out of Stock
                    </Badge>
                );
            case 'LOW_STOCK':
                return (
                    <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock
                    </Badge>
                );
            case 'HIGH_STOCK':
                return (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        High Stock
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Good Stock
                    </Badge>
                );
        }
    };

    const getStockBarColor = (part: InventoryItem) => {
        const status = getStockStatus(part);
        switch (status) {
            case 'OUT_OF_STOCK':
            case 'LOW_STOCK':
                return 'bg-destructive';
            case 'HIGH_STOCK':
                return 'bg-primary';
            default:
                return 'bg-primary/80';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Parts Inventory</h1>
                    <p className="text-muted-foreground">Manage and monitor all parts and consumables</p>
                </div>
                <div className="flex gap-2">
                    <Dialog
                        open={isAddItemDialogOpen}
                        onOpenChange={(open) => {
                            setIsAddItemDialogOpen(open);
                            if (!open) {
                                setAddItemError(null);
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button className="bg-green-600 text-white hover:bg-green-700">
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Item
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl border-border bg-popover">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Add New Inventory Item</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label htmlFor="item-name" className="text-foreground">
                                        Item Name *
                                    </Label>
                                    <Input
                                        id="item-name"
                                        value={newItem.item_name}
                                        onChange={(e) => setNewItem((prev) => ({ ...prev, item_name: e.target.value }))}
                                        placeholder="Enter item name"
                                        className="border-border bg-input text-foreground"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label htmlFor="description" className="text-foreground">
                                        Description
                                    </Label>
                                    <Input
                                        id="description"
                                        value={newItem.description}
                                        onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="Enter item description"
                                        className="border-border bg-input text-foreground"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="category" className="text-foreground">
                                        Category *
                                    </Label>
                                    <Input
                                        id="category"
                                        list="inventory-category-options"
                                        value={newItem.category}
                                        onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value }))}
                                        placeholder="Enter or select category"
                                        className="border-border bg-input text-foreground"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="initial-stock" className="text-foreground">
                                        Initial Stock *
                                    </Label>
                                    <Input
                                        id="initial-stock"
                                        type="number"
                                        value={newItem.stock}
                                        onChange={(e) => setNewItem((prev) => ({ ...prev, stock: e.target.value }))}
                                        placeholder="Enter initial stock quantity"
                                        min="0"
                                        className="border-border bg-input text-foreground"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="reorder-level" className="text-foreground">
                                        Reorder Level *
                                    </Label>
                                    <Input
                                        id="reorder-level"
                                        type="number"
                                        value={newItem.reorder_level}
                                        onChange={(e) => setNewItem((prev) => ({ ...prev, reorder_level: e.target.value }))}
                                        placeholder="Enter reorder level"
                                        min="0"
                                        className="border-border bg-input text-foreground"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="unit-price" className="text-foreground">
                                        Unit Price *
                                    </Label>
                                    <Input
                                        id="unit-price"
                                        type="number"
                                        step="0.01"
                                        value={newItem.unit_price}
                                        onChange={(e) => setNewItem((prev) => ({ ...prev, unit_price: e.target.value }))}
                                        placeholder="Enter unit price"
                                        min="0"
                                        className="border-border bg-input text-foreground"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="supplier" className="text-foreground">
                                        Supplier
                                    </Label>
                                    <Input
                                        id="supplier"
                                        value={newItem.supplier}
                                        onChange={(e) => setNewItem((prev) => ({ ...prev, supplier: e.target.value }))}
                                        placeholder="Enter supplier name"
                                        className="border-border bg-input text-foreground"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label htmlFor="location" className="text-foreground">
                                        Location
                                    </Label>
                                    <Input
                                        id="location"
                                        value={newItem.location}
                                        onChange={(e) => setNewItem((prev) => ({ ...prev, location: e.target.value }))}
                                        placeholder="Enter storage location"
                                        className="border-border bg-input text-foreground"
                                    />
                                </div>
                                {addItemError && (
                                    <div className="col-span-2">
                                        <Alert variant="destructive">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>{addItemError}</AlertDescription>
                                        </Alert>
                                    </div>
                                )}
                                <div className="col-span-2">
                                    <Button
                                        onClick={handleAddItem}
                                        disabled={isAddingItem}
                                        className="w-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {isAddingItem ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Adding Item...
                                            </>
                                        ) : (
                                            'Add Item'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog
                        open={isAddStockDialogOpen}
                        onOpenChange={(open) => {
                            setIsAddStockDialogOpen(open);
                            if (!open) {
                                setAddStockError(null);
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Stock
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="border-border bg-popover">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Add Stock to Existing Part</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="part-select" className="text-foreground">
                                        Select Part
                                    </Label>
                                    <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                                        <SelectTrigger className="border-border bg-input text-foreground">
                                            <SelectValue placeholder="Choose a part to restock" />
                                        </SelectTrigger>
                                        <SelectContent className="border-border bg-popover">
                                            {Array.isArray(parts) &&
                                                parts.map((part) => (
                                                    <SelectItem key={part.id} value={part.item_id.toString()}>
                                                        {part.item_id} - {part.item_name} (Current: {part.stock})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="stock-amount" className="text-foreground">
                                        Stock to Add
                                    </Label>
                                    <Input
                                        id="stock-amount"
                                        type="number"
                                        value={stockToAdd}
                                        onChange={(e) => setStockToAdd(e.target.value)}
                                        placeholder="Enter quantity to add"
                                        min="1"
                                        className="border-border bg-input text-foreground"
                                    />
                                </div>
                                {addStockError && (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>{addStockError}</AlertDescription>
                                    </Alert>
                                )}
                                <Button
                                    onClick={handleAddStock}
                                    disabled={isAddingStock}
                                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isAddingStock ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Adding Stock...
                                        </>
                                    ) : (
                                        'Add Stock'
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={isStockActionDialogOpen}
                        onOpenChange={(open) => {
                            setIsStockActionDialogOpen(open);
                            if (!open) {
                                setStockActionError(null);
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                                <ArrowDownCircle className="mr-2 h-4 w-4" />
                                Log Stock Transaction
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="border-border bg-popover">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Deduct / Return / Damage</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="stock-action-type" className="text-foreground">
                                        Transaction Type
                                    </Label>
                                    <Select
                                        value={stockActionType}
                                        onValueChange={(value: 'deduct' | 'return' | 'damage') => setStockActionType(value)}
                                    >
                                        <SelectTrigger id="stock-action-type" className="border-border bg-input text-foreground">
                                            <SelectValue placeholder="Select action" />
                                        </SelectTrigger>
                                        <SelectContent className="border-border bg-popover">
                                            <SelectItem value="deduct">Deduct (Sale/Usage)</SelectItem>
                                            <SelectItem value="return">Return</SelectItem>
                                            <SelectItem value="damage">Damage</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="stock-action-part" className="text-foreground">
                                        Select Part
                                    </Label>
                                    <Select value={selectedActionPartId} onValueChange={setSelectedActionPartId}>
                                        <SelectTrigger id="stock-action-part" className="border-border bg-input text-foreground">
                                            <SelectValue placeholder="Choose part" />
                                        </SelectTrigger>
                                        <SelectContent className="border-border bg-popover">
                                            {Array.isArray(parts) &&
                                                parts
                                                    .filter((part) => part.status !== 'discontinued')
                                                    .map((part) => (
                                                        <SelectItem key={part.id} value={part.item_id.toString()}>
                                                            {part.item_id} - {part.item_name} (Current: {part.stock})
                                                        </SelectItem>
                                                    ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="stock-action-quantity" className="text-foreground">
                                        Quantity
                                    </Label>
                                    <Input
                                        id="stock-action-quantity"
                                        type="number"
                                        min="1"
                                        value={stockActionQuantity}
                                        onChange={(e) => setStockActionQuantity(e.target.value)}
                                        placeholder="Enter quantity"
                                        className="border-border bg-input text-foreground"
                                    />
                                </div>

                                {stockActionError && (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>{stockActionError}</AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    onClick={handleStockAction}
                                    disabled={isSubmittingStockAction}
                                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isSubmittingStockAction ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        `Submit ${stockActionType === 'deduct' ? 'Deduction' : stockActionType === 'return' ? 'Return' : 'Damage'} Log`
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Item Dialog */}
                    <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
                        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card text-foreground">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Edit Item</DialogTitle>
                            </DialogHeader>
                            {editingItem && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="edit-item-id" className="text-foreground">
                                            Item ID
                                        </Label>
                                        <Input
                                            id="edit-item-id"
                                            value={editingItem.item_id}
                                            disabled
                                            className="border-border bg-muted text-muted-foreground"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-item-name" className="text-foreground">
                                            Item Name *
                                        </Label>
                                        <Input
                                            id="edit-item-name"
                                            value={editingItem.item_name}
                                            onChange={(e) => setEditingItem((prev) => (prev ? { ...prev, item_name: e.target.value } : null))}
                                            placeholder="Enter item name"
                                            className="border-border bg-input text-foreground"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label htmlFor="edit-description" className="text-foreground">
                                            Description
                                        </Label>
                                        <Input
                                            id="edit-description"
                                            value={editingItem.description || ''}
                                            onChange={(e) => setEditingItem((prev) => (prev ? { ...prev, description: e.target.value } : null))}
                                            placeholder="Enter description"
                                            className="border-border bg-input text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-category" className="text-foreground">
                                            Category *
                                        </Label>
                                        <Input
                                            id="edit-category"
                                            list="inventory-category-options"
                                            value={editingItem.category}
                                            onChange={(e) => setEditingItem((prev) => (prev ? { ...prev, category: e.target.value } : null))}
                                            placeholder="Enter or select category"
                                            className="border-border bg-input text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-stock" className="text-foreground">
                                            Current Stock
                                        </Label>
                                        <Input
                                            id="edit-stock"
                                            value={editingItem.stock.toString()}
                                            disabled
                                            className="border-border bg-muted text-muted-foreground"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-reorder-level" className="text-foreground">
                                            Reorder Level *
                                        </Label>
                                        <Input
                                            id="edit-reorder-level"
                                            type="number"
                                            value={editingItem.reorder_level.toString()}
                                            onChange={(e) =>
                                                setEditingItem((prev) => (prev ? { ...prev, reorder_level: parseInt(e.target.value) || 0 } : null))
                                            }
                                            placeholder="Enter reorder level"
                                            min="1"
                                            className="border-border bg-input text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-unit-price" className="text-foreground">
                                            Unit Price (₱) *
                                        </Label>
                                        <Input
                                            id="edit-unit-price"
                                            type="number"
                                            step="0.01"
                                            value={editingItem.unit_price.toString()}
                                            onChange={(e) =>
                                                setEditingItem((prev) => (prev ? { ...prev, unit_price: parseFloat(e.target.value) || 0 } : null))
                                            }
                                            placeholder="Enter unit price"
                                            min="0"
                                            className="border-border bg-input text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-supplier" className="text-foreground">
                                            Supplier
                                        </Label>
                                        <Input
                                            id="edit-supplier"
                                            value={editingItem.supplier || ''}
                                            onChange={(e) => setEditingItem((prev) => (prev ? { ...prev, supplier: e.target.value } : null))}
                                            placeholder="Enter supplier name"
                                            className="border-border bg-input text-foreground"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label htmlFor="edit-location" className="text-foreground">
                                            Location
                                        </Label>
                                        <Input
                                            id="edit-location"
                                            value={editingItem.location || ''}
                                            onChange={(e) => setEditingItem((prev) => (prev ? { ...prev, location: e.target.value } : null))}
                                            placeholder="Enter storage location"
                                            className="border-border bg-input text-foreground"
                                        />
                                    </div>
                                    {updateItemError && (
                                        <div className="col-span-2">
                                            <Alert variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertDescription>{updateItemError}</AlertDescription>
                                            </Alert>
                                        </div>
                                    )}
                                    <div className="col-span-2">
                                        <Button
                                            onClick={handleUpdateItem}
                                            disabled={isUpdatingItem}
                                            className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {isUpdatingItem ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Updating Item...
                                                </>
                                            ) : (
                                                'Update Item'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <datalist id="inventory-category-options">
                {categories.map((category) => (
                    <option key={category} value={category} />
                ))}
            </datalist>

            {workspaceMessage && (
                <Alert variant={workspaceMessage.type === 'error' ? 'destructive' : 'default'}>
                    {workspaceMessage.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    <AlertDescription>{workspaceMessage.message}</AlertDescription>
                </Alert>
            )}

            <div className="profile-card overflow-hidden rounded-xl">
                <div className="p-5 pb-3">
                    <h3 className="font-semibold text-foreground">Inventory Filters</h3>
                    <div className="mt-3 flex flex-col gap-4 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by item ID, name, or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border-border bg-input pl-10 text-foreground"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full border-border bg-input text-foreground sm:w-48">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-popover">
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories &&
                                    categories.map((category: string) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <Select value={stockFilter} onValueChange={setStockFilter}>
                            <SelectTrigger className="w-full border-border bg-input text-foreground sm:w-48">
                                <SelectValue placeholder="Stock Status" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-popover">
                                <SelectItem value="all">All Stock Levels</SelectItem>
                                <SelectItem value="low">Low Stock</SelectItem>
                                <SelectItem value="good">Good Stock</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border">
                                <TableHead className="text-foreground">Part Number</TableHead>
                                <TableHead className="text-foreground">Name</TableHead>
                                <TableHead className="text-foreground">Category</TableHead>
                                <TableHead className="text-foreground">Stock Level</TableHead>
                                <TableHead className="text-foreground">Status</TableHead>
                                <TableHead className="text-foreground">Unit Price</TableHead>
                                <TableHead className="text-foreground">Location</TableHead>
                                <TableHead className="text-foreground">Supplier</TableHead>
                                <TableHead className="text-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredParts.map((part) => (
                                <TableRow key={part.id} className="border-border hover:bg-muted/50">
                                    <TableCell className="font-medium text-foreground">{part.item_id}</TableCell>
                                    <TableCell className="text-foreground">{part.item_name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{part.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-foreground">{part.stock}</span>
                                                <span className="text-muted-foreground">Min: {part.reorder_level}</span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-muted">
                                                <div
                                                    className={`h-2 rounded-full ${getStockBarColor(part)}`}
                                                    style={{ width: `${Math.min((part.stock / (part.reorder_level * 3)) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStockBadge(part)}</TableCell>
                                    <TableCell className="text-foreground">₱{parseFloat(part.unit_price.toString()).toFixed(2)}</TableCell>
                                    <TableCell className="text-foreground">{part.location || 'N/A'}</TableCell>
                                    <TableCell className="text-foreground">{part.supplier || 'N/A'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditItem(part)}
                                                className="border-border text-foreground hover:bg-muted"
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDiscontinueItem(part)}
                                                disabled={isDiscontinuingItemId === part.item_id}
                                            >
                                                {isDiscontinuingItemId === part.item_id ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                )}
                                                Discontinue
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {filteredParts.length === 0 && <div className="py-8 text-center text-muted-foreground">No parts found matching your criteria</div>}
            </div>
        </div>
    );
}
