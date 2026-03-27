import { AlertTriangle, CheckCircle, Edit, Loader2, Package, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useInventoryItems } from "../../hooks/useInventory";
import { InventoryItem } from "../../types/inventory";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

export function InventoryTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [stockToAdd, setStockToAdd] = useState("");
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [updateItemError, setUpdateItemError] = useState<string | null>(null);

  // New item form state
  const [newItem, setNewItem] = useState({
    item_name: "",
    description: "",
    category: "",
    stock: "",
    reorder_level: "",
    unit_price: "",
    supplier: "",
    location: ""
  });

  // Use real API data
  const {
    data: inventoryData,
    loading,
    error,
    addStock,
    createItem,
    updateItem,
    updateFilters,
    refresh
  } = useInventoryItems({
    search: searchTerm || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    low_stock: stockFilter === "low" ? true : undefined,
    per_page: 50
  });

  const parts = (inventoryData?.data?.data && Array.isArray(inventoryData.data.data)) ? inventoryData.data.data : [];
  const categories = parts.length > 0 ? [...new Set(parts.map((part: InventoryItem) => part.category).filter(Boolean))] : [];

  // Filter parts locally for immediate UI feedback
  const filteredParts = (parts && Array.isArray(parts)) ? parts.filter((part) => {
    const matchesSearch = !searchTerm ||
      part?.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part?.item_id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      part?.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "all" || part?.category === categoryFilter;

    const matchesStock = stockFilter === "all" ||
      (stockFilter === "low" && part?.stock <= part?.reorder_level);

    return matchesSearch && matchesCategory && matchesStock;
  }) : [];

  // Update filters when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({
        search: searchTerm || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        low_stock: stockFilter === "low" ? true : undefined,
      });
    }, 500); // Debounce API calls

    return () => clearTimeout(timer);
  }, [searchTerm, categoryFilter, stockFilter, updateFilters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading inventory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load inventory data: {error}
        </AlertDescription>
      </Alert>
    );
  }

    const handleAddStock = async () => {
    if (!selectedPartId || !stockToAdd) {
      // You could show an error toast here
      return;
    }

    const quantity = parseInt(stockToAdd);
    if (isNaN(quantity) || quantity <= 0) {
      // You could show an error toast here
      return;
    }

    try {
      setIsAddingStock(true);
      const success = await addStock({
        item_id: parseInt(selectedPartId),
        quantity,
        reference_number: `PROC-${Date.now()}`,
        notes: 'Manual stock addition'
      });

      if (success) {
        setStockToAdd("");
        setSelectedPartId("");
        setIsAddStockDialogOpen(false);
        refresh(); // Refresh the data
      }
    } catch (err) {
      console.error('Failed to add stock:', err);
      // You could show a toast notification here
    } finally {
      setIsAddingStock(false);
    }
  };

  const handleAddItem = async () => {
    // Clear previous errors
    setAddItemError(null);
    setIsAddingItem(true);

    try {
      // Validate required fields
      if (!newItem.item_name || !newItem.category || !newItem.stock || !newItem.reorder_level || !newItem.unit_price) {
        setAddItemError("Please fill in all required fields marked with *");
        return;
      }

      const stockAmount = parseInt(newItem.stock);
      const reorderLevel = parseInt(newItem.reorder_level);
      const unitPrice = parseFloat(newItem.unit_price);

      if (isNaN(stockAmount) || stockAmount < 0) {
        setAddItemError("Initial stock must be a valid number (0 or greater)");
        return;
      }

      if (isNaN(reorderLevel) || reorderLevel < 1) {
        setAddItemError("Reorder level must be a valid number (1 or greater)");
        return;
      }

      if (isNaN(unitPrice) || unitPrice < 0) {
        setAddItemError("Unit price must be a valid number (0 or greater)");
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
        location: newItem.location
      };

      console.log('Sending item data:', itemData);
      const result = await createItem(itemData);

      if (result.success) {
        // Reset form
        setNewItem({
          item_name: "",
          description: "",
          category: "",
          stock: "",
          reorder_level: "",
          unit_price: "",
          supplier: "",
          location: ""
        });

        setIsAddItemDialogOpen(false);
        refresh(); // Refresh the data
      } else {
        setAddItemError(result.error || 'Failed to add item. Please try again.');
      }
    } catch (err) {
      console.error('Failed to add item:', err);
      setAddItemError(err instanceof Error ? err.message : 'Failed to add item. Please try again.');
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
    setIsUpdatingItem(true);

    try {
      // Validate required fields
      if (!editingItem.item_name || !editingItem.category || editingItem.reorder_level === undefined || editingItem.unit_price === undefined) {
        setUpdateItemError("Please fill in all required fields");
        return;
      }

      if (editingItem.reorder_level < 1) {
        setUpdateItemError("Reorder level must be 1 or greater");
        return;
      }

      if (editingItem.unit_price < 0) {
        setUpdateItemError("Unit price must be 0 or greater");
        return;
      }

      const updateData = {
        item_name: editingItem.item_name,
        description: editingItem.description,
        category: editingItem.category,
        reorder_level: editingItem.reorder_level,
        unit_price: editingItem.unit_price,
        supplier: editingItem.supplier,
        location: editingItem.location
      };

      const result = await updateItem(editingItem.item_id, updateData);

      if (result.success) {
        setIsEditItemDialogOpen(false);
        setEditingItem(null);
        refresh();
      } else {
        setUpdateItemError(result.error || 'Failed to update item. Please try again.');
      }
    } catch (err) {
      console.error('Failed to update item:', err);
      setUpdateItemError(err instanceof Error ? err.message : 'Failed to update item. Please try again.');
    } finally {
      setIsUpdatingItem(false);
    }
  };  const getStockStatus = (part: InventoryItem) => {
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
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Out of Stock
        </Badge>;
      case 'LOW_STOCK':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Low Stock
        </Badge>;
      case 'HIGH_STOCK':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          High Stock
        </Badge>;
      default:
        return <Badge variant="outline" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Good Stock
        </Badge>;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parts Inventory</h1>
          <p className="text-muted-foreground">
            Manage and monitor all parts and consumables
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddItemDialogOpen} onOpenChange={(open) => {
            setIsAddItemDialogOpen(open);
            if (!open) setAddItemError(null);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 text-white hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Add New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add New Inventory Item</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="item-name" className="text-foreground">Item Name *</Label>
                  <Input
                    id="item-name"
                    value={newItem.item_name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, item_name: e.target.value }))}
                    placeholder="Enter item name"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description" className="text-foreground">Description</Label>
                  <Input
                    id="description"
                    value={newItem.description}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter item description"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="category" className="text-foreground">Category *</Label>
                  <Select value={newItem.category} onValueChange={(value) => setNewItem(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {categories.map((category: string) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                      <SelectItem value="Engine Parts">Engine Parts</SelectItem>
                      <SelectItem value="Body Parts">Body Parts</SelectItem>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Fluids">Fluids</SelectItem>
                      <SelectItem value="Tools">Tools</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="initial-stock" className="text-foreground">Initial Stock *</Label>
                  <Input
                    id="initial-stock"
                    type="number"
                    value={newItem.stock}
                    onChange={(e) => setNewItem(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="Enter initial stock quantity"
                    min="0"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="reorder-level" className="text-foreground">Reorder Level *</Label>
                  <Input
                    id="reorder-level"
                    type="number"
                    value={newItem.reorder_level}
                    onChange={(e) => setNewItem(prev => ({ ...prev, reorder_level: e.target.value }))}
                    placeholder="Enter reorder level"
                    min="0"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="unit-price" className="text-foreground">Unit Price *</Label>
                  <Input
                    id="unit-price"
                    type="number"
                    step="0.01"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: e.target.value }))}
                    placeholder="Enter unit price"
                    min="0"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier" className="text-foreground">Supplier</Label>
                  <Input
                    id="supplier"
                    value={newItem.supplier}
                    onChange={(e) => setNewItem(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Enter supplier name"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="location" className="text-foreground">Location</Label>
                  <Input
                    id="location"
                    value={newItem.location}
                    onChange={(e) => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter storage location"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                {addItemError && (
                  <div className="col-span-2">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {addItemError}
                      </AlertDescription>
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
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
          <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add Stock to Existing Part</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="part-select" className="text-foreground">Select Part</Label>
                  <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue placeholder="Choose a part to restock" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {Array.isArray(parts) && parts.map(part => (
                        <SelectItem key={part.id} value={part.item_id.toString()}>
                          {part.item_id} - {part.item_name} (Current: {part.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="stock-amount" className="text-foreground">Stock to Add</Label>
                  <Input
                    id="stock-amount"
                    type="number"
                    value={stockToAdd}
                    onChange={(e) => setStockToAdd(e.target.value)}
                    placeholder="Enter quantity to add"
                    min="1"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <Button
                  onClick={handleAddStock}
                  disabled={isAddingStock}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isAddingStock ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding Stock...
                    </>
                  ) : (
                    'Add Stock'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Item Dialog */}
          <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
            <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">Edit Item</DialogTitle>
              </DialogHeader>
              {editingItem && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-item-id" className="text-foreground">Item ID</Label>
                    <Input
                      id="edit-item-id"
                      value={editingItem.item_id}
                      disabled
                      className="bg-muted border-border text-muted-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-item-name" className="text-foreground">Item Name *</Label>
                    <Input
                      id="edit-item-name"
                      value={editingItem.item_name}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, item_name: e.target.value } : null)}
                      placeholder="Enter item name"
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-description" className="text-foreground">Description</Label>
                    <Input
                      id="edit-description"
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                      placeholder="Enter description"
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category" className="text-foreground">Category *</Label>
                    <Select
                      value={editingItem.category}
                      onValueChange={(value) => setEditingItem(prev => prev ? { ...prev, category: value } : null)}
                    >
                      <SelectTrigger className="bg-input border-border text-foreground">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="Engine">Engine</SelectItem>
                        <SelectItem value="Transmission">Transmission</SelectItem>
                        <SelectItem value="Brake">Brake</SelectItem>
                        <SelectItem value="Suspension">Suspension</SelectItem>
                        <SelectItem value="Electrical">Electrical</SelectItem>
                        <SelectItem value="Body">Body</SelectItem>
                        <SelectItem value="Interior">Interior</SelectItem>
                        <SelectItem value="Consumables">Consumables</SelectItem>
                        <SelectItem value="Tools">Tools</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-stock" className="text-foreground">Current Stock</Label>
                    <Input
                      id="edit-stock"
                      value={editingItem.stock.toString()}
                      disabled
                      className="bg-muted border-border text-muted-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-reorder-level" className="text-foreground">Reorder Level *</Label>
                    <Input
                      id="edit-reorder-level"
                      type="number"
                      value={editingItem.reorder_level.toString()}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, reorder_level: parseInt(e.target.value) || 0 } : null)}
                      placeholder="Enter reorder level"
                      min="1"
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-unit-price" className="text-foreground">Unit Price (₱) *</Label>
                    <Input
                      id="edit-unit-price"
                      type="number"
                      step="0.01"
                      value={editingItem.unit_price.toString()}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_price: parseFloat(e.target.value) || 0 } : null)}
                      placeholder="Enter unit price"
                      min="0"
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-supplier" className="text-foreground">Supplier</Label>
                    <Input
                      id="edit-supplier"
                      value={editingItem.supplier || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, supplier: e.target.value } : null)}
                      placeholder="Enter supplier name"
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-location" className="text-foreground">Location</Label>
                    <Input
                      id="edit-location"
                      value={editingItem.location || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, location: e.target.value } : null)}
                      placeholder="Enter storage location"
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  {updateItemError && (
                    <div className="col-span-2">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {updateItemError}
                        </AlertDescription>
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
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Inventory Filters</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by part number or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border text-foreground"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-input border-border text-foreground">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Categories</SelectItem>
                {categories && categories.map((category: string) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-input border-border text-foreground">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="good">Good Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
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
                          <span className="text-muted-foreground">
                            Min: {part.reorder_level}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditItem(part)}
                        className="text-foreground border-border hover:bg-muted"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredParts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No parts found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
