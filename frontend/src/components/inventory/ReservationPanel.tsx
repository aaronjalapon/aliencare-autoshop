import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Clock, Loader2, Package, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useInventoryItems } from "../../hooks/useInventory";
import { useReservations } from "../../hooks/useReservations";
import { Reservation } from "../../types/inventory";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

export function ReservationPanel() {
  // Real backend data hooks
  const {
    data: reservationsData,
    loading: reservationsLoading,
    error: reservationsError,
    createReservation,
    createMultipleReservations,
    approveReservation,
    rejectReservation,
    completeReservation,
    cancelReservation,
    refresh: refreshReservations
  } = useReservations({ per_page: 50 }); // Request more items to ensure we see pending reservations

  const { data: inventoryData, loading: inventoryLoading } = useInventoryItems();

  // Local state for UI
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createReservationError, setCreateReservationError] = useState<string | null>(null);
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    pending: false, // Always start expanded for highest priority
    approved: false, // Keep expanded for active work
    completed: true, // Start collapsed - historical data
    cancelled: true, // Start collapsed - archived data
    rejected: true   // Start collapsed - archived data
  });
  const [reservationItems, setReservationItems] = useState<Array<{ item_id: string; quantity: number | string }>>([
    { item_id: '', quantity: 1 }
  ]);
  const [reservationDetails, setReservationDetails] = useState({
    job_order_number: '',
    requested_by: '',
    notes: ''
  });

  // Extract data from responses with proper type checking
  const reservations: Reservation[] = useMemo(() => 
    Array.isArray(reservationsData?.data) ? reservationsData.data : [], 
    [reservationsData?.data]
  );
  console.log('Current reservations data:', reservations.length, 'total reservations');
  console.log('Raw reservationsData:', reservationsData);
  console.log('Reservation statuses:', reservations.map(r => r.status));
  console.log('Pending reservations:', reservations.filter(r => r.status === 'pending').length);

  const inventoryItems = Array.isArray(inventoryData?.data?.data) ? inventoryData.data.data : [];
  const loading = reservationsLoading || inventoryLoading;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Group reservations by status with hierarchy - pending gets top priority
  const groupReservationsByStatus = (reservations: Reservation[]) => {
    // Priority order: pending first (highest priority), then approved, then others
    const statusOrder = ['pending', 'approved', 'completed', 'cancelled', 'rejected'];
    const grouped = reservations.reduce((acc, reservation) => {
      const status = reservation.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(reservation);
      return acc;
    }, {} as Record<string, Reservation[]>);

    // Sort within each group: pending by urgency (oldest first), others by newest first
    statusOrder.forEach(status => {
      if (grouped[status]) {
        if (status === 'pending') {
          // For pending reservations, sort oldest first (most urgent)
          grouped[status].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        } else {
          // For other statuses, sort newest first
          grouped[status].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      }
    });

    // Return as ordered array instead of object to maintain priority order
    return statusOrder
      .filter(status => grouped[status] && grouped[status].length > 0)
      .map(status => [status, grouped[status]] as [string, Reservation[]]);
  };

  // Get status group styling with enhanced pending priority
  const getStatusGroupStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          headerBg: 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 dark:from-yellow-950/30 dark:to-orange-950/30 dark:border-yellow-700',
          textColor: 'text-yellow-900 dark:text-yellow-100',
          icon: 'text-yellow-700 dark:text-yellow-300',
          priority: 'HIGH PRIORITY'
        };
      case 'approved':
        return {
          headerBg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
          textColor: 'text-blue-800 dark:text-blue-200',
          icon: 'text-blue-600',
          priority: 'ACTIVE'
        };
      case 'completed':
        return {
          headerBg: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
          textColor: 'text-green-800 dark:text-green-200',
          icon: 'text-green-600',
          priority: 'COMPLETED'
        };
      case 'cancelled':
      case 'rejected':
        return {
          headerBg: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
          icon: 'text-red-600',
          priority: 'ARCHIVED'
        };
      default:
        return {
          headerBg: 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800',
          textColor: 'text-gray-800 dark:text-gray-200',
          icon: 'text-gray-600',
          priority: 'OTHER'
        };
    }
  };

  // Toggle group collapse state with special handling for pending
  const toggleGroupCollapse = (status: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  // Auto-expand pending reservations if they exist
  const checkAndExpandPendingReservations = useCallback(() => {
    const pendingReservations = reservations.filter((r) => r.status === 'pending');
    console.log('Checking pending reservations:', pendingReservations.length, 'found');
    if (pendingReservations.length > 0 && collapsedGroups.pending) {
      console.log('Auto-expanding pending reservations section');
      setCollapsedGroups(prev => ({
        ...prev,
        pending: false // Ensure pending is always visible when they exist
      }));
    }
  }, [reservations, collapsedGroups.pending]);

  // Check for pending reservations when data changes
  useEffect(() => {
    checkAndExpandPendingReservations();
  }, [checkAndExpandPendingReservations]);

  // Get group statistics
  const getGroupStats = (reservations: Reservation[]) => {
    const totalQuantity = reservations.reduce((sum, r) => sum + r.quantity, 0);
    const totalValue = reservations.reduce((sum, r) => {
      const item = inventoryItems.find(item => item.item_id === r.item_id);
      const unitPrice = typeof item?.unit_price === 'string' ? parseFloat(item.unit_price) : (item?.unit_price || 0);
      return sum + (r.quantity * unitPrice);
    }, 0);
    return { totalQuantity, totalValue };
  };

    const resetReservationForm = () => {
    setReservationItems([{ item_id: '', quantity: 1 }]);
    setReservationDetails({ job_order_number: '', requested_by: '', notes: '' });
    setCreateReservationError(null);
  };

  const handleCreateReservation = async () => {
    // Clear previous errors
    setCreateReservationError(null);
    setIsCreatingReservation(true);

    try {
      // Validate required fields
      if (!reservationDetails.job_order_number.trim()) {
        setCreateReservationError("Job Order Number is required");
        return;
      }

      if (!reservationDetails.requested_by.trim()) {
        setCreateReservationError("Requested By field is required");
        return;
      }

      // Validate and convert items to proper format
      const validItems = reservationItems
        .filter(item => item.item_id && (typeof item.quantity === 'number' ? item.quantity > 0 : Number(item.quantity) > 0))
        .map(item => ({
          item_id: typeof item.item_id === 'number' ? item.item_id : parseInt(String(item.item_id)), // Convert to number for API
          quantity: typeof item.quantity === 'number' ? item.quantity : Number(item.quantity)
        }));

      if (validItems.length === 0) {
        setCreateReservationError("Please add at least one valid item with a quantity greater than 0");
        return;
      }

      // Check for duplicate items
      const itemIds = validItems.map(item => item.item_id);
      const duplicates = itemIds.filter((item, index) => itemIds.indexOf(item) !== index);
      if (duplicates.length > 0) {
        setCreateReservationError(`Duplicate items found. Please remove duplicates.`);
        return;
      }

      // Enhanced validation with stock checking and quantity limits
      const validationErrors: string[] = [];

      for (const item of validItems) {
        const inventoryItem = inventoryItems.find(inv => String(inv.item_id) === String(item.item_id));

        if (!inventoryItem) {
          validationErrors.push(`Item with ID ${item.item_id} not found in inventory`);
          continue;
        }

        // Check for negative quantities
        if (item.quantity <= 0) {
          validationErrors.push(`${inventoryItem.item_name}: Quantity must be greater than 0`);
          continue;
        }

        // Check quantity limit (max 100 per item)
        if (item.quantity > 100) {
          validationErrors.push(`${inventoryItem.item_name}: Maximum quantity per reservation is 100`);
          continue;
        }

        // Check stock availability
        if (item.quantity > inventoryItem.stock) {
          validationErrors.push(`${inventoryItem.item_name}: Cannot reserve ${item.quantity} items (only ${inventoryItem.stock} in stock)`);
          continue;
        }

        // Warning for high quantity reservations (more than 50% of stock)
        const stockPercentage = (item.quantity / inventoryItem.stock) * 100;
        if (stockPercentage > 50 && inventoryItem.stock > 1) {
          validationErrors.push(`${inventoryItem.item_name}: Reserving ${item.quantity} of ${inventoryItem.stock} items (${Math.round(stockPercentage)}% of stock). Consider reducing quantity.`);
        }
      }

      if (validationErrors.length > 0) {
        setCreateReservationError(validationErrors.join(' | '));
        return;
      }

      let result;
      if (validItems.length === 1) {
        // Create single reservation
        result = await createReservation({
          item_id: validItems[0].item_id,
          quantity: validItems[0].quantity,
          job_order_number: reservationDetails.job_order_number.trim(),
          requested_by: reservationDetails.requested_by.trim(),
          notes: reservationDetails.notes.trim()
        });
      } else {
        // Create multiple reservations
        result = await createMultipleReservations({
          job_order_number: reservationDetails.job_order_number.trim(),
          requested_by: reservationDetails.requested_by.trim(),
          notes: reservationDetails.notes.trim(),
          items: validItems
        });
      }

      if (result.success) {
        // Reset form
        resetReservationForm();
        setIsDialogOpen(false);

        // Force immediate refresh of reservations
        refreshReservations();

        // You could show a success toast here instead of alert
        alert(`Reservation${validItems.length > 1 ? 's' : ''} created successfully`);
      } else {
        setCreateReservationError(result.error || 'Failed to create reservation. Please try again.');
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      setCreateReservationError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsCreatingReservation(false);
    }
  };

  const addReservationItem = () => {
    console.log('Adding new reservation item');
    setReservationItems(prev => {
      const newItems = [...prev, { item_id: '', quantity: 1 }];
      console.log('New reservation items:', newItems);
      return newItems;
    });
  };

  const removeReservationItem = (index: number) => {
    console.log('Removing reservation item at index:', index);
    if (reservationItems.length > 1) {
      setReservationItems(prev => {
        const newItems = prev.filter((_, i) => i !== index);
        console.log('Items after removal:', newItems);
        return newItems;
      });
    } else {
      console.log('Cannot remove - only one item left');
    }
  };

  const updateReservationItem = (index: number, field: 'item_id' | 'quantity', value: string | number) => {
    console.log('Updating reservation item:', { index, field, value, type: typeof value });

    // Clear error when user makes changes
    if (createReservationError) {
      setCreateReservationError(null);
    }

    setReservationItems(prev => {
      const newItems = prev.map((item, i) => {
        if (i === index) {
          if (field === 'quantity') {
            // Handle quantity field properly - allow empty string or convert to number
            return { ...item, quantity: value };
          } else {
            // Handle item_id field - also validate stock when item is selected
            const newItem = { ...item, item_id: String(value) };

            // If selecting a new item, check its stock and current quantity
            if (value) {
              const selectedInventoryItem = inventoryItems.find(inv => String(inv.item_id) === String(value));
              if (selectedInventoryItem) {
                const currentQty = typeof item.quantity === 'number' ? item.quantity : parseInt(String(item.quantity)) || 1;

                // Auto-adjust quantity if it exceeds stock
                if (currentQty > selectedInventoryItem.stock) {
                  newItem.quantity = Math.min(selectedInventoryItem.stock, 100);
                  if (selectedInventoryItem.stock === 0) {
                    setCreateReservationError(`${selectedInventoryItem.item_name} is out of stock`);
                  }
                }
              }
            }

            return newItem;
          }
        }
        return item;
      });
      console.log('Items after update:', newItems);
      return newItems;
    });
  };  const handleApproveReservation = async (reservationId: number) => {
    try {
      setActionLoading(`approve-${reservationId}`);
      const result = await approveReservation(reservationId, { approved_by: 'Current User' });

      if (result.success) {
        alert('Reservation approved successfully');
      } else {
        alert('Failed to approve reservation: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to approve reservation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectReservation = async (reservationId: number) => {
    try {
      setActionLoading(`reject-${reservationId}`);
      const result = await rejectReservation(reservationId, {
        approved_by: 'Current User',
        notes: 'Rejected by user'
      });

      if (result.success) {
        alert('Reservation rejected successfully');
      } else {
        alert('Failed to reject reservation: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to reject reservation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteReservation = async (reservationId: number) => {
    try {
      setActionLoading(`complete-${reservationId}`);
      const result = await completeReservation(reservationId, {
        completed_by: 'Current User'
      });

      if (result.success) {
        alert('Reservation completed successfully');
      } else {
        alert('Failed to complete reservation: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to complete reservation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelReservation = async (reservationId: number) => {
    try {
      setActionLoading(`cancel-${reservationId}`);
      const result = await cancelReservation(reservationId, {
        cancelled_by: 'Current User',
        reason: 'Cancelled by user'
      });

      if (result.success) {
        alert('Reservation cancelled successfully');
      } else {
        alert('Failed to cancel reservation: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to cancel reservation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  // Filter reservations by status
  const activeReservations = reservations.filter((r: Reservation) =>
    r.status === 'pending' || r.status === 'approved'
  );
  const completedReservations = reservations.filter((r: Reservation) =>
    r.status === 'completed'
  );

  // Calculate total reserved value
  const totalReservedValue = activeReservations.reduce((sum: number, reservation: Reservation) => {
    const item = inventoryItems.find(item => item.item_id === reservation.item_id);
    return sum + (item ? item.unit_price * reservation.quantity : 0);
  }, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
          <p>Loading reservations...</p>
        </div>
      </div>
    );
  }

  if (reservationsError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Reservations</h3>
          <p className="text-muted-foreground mb-4">{reservationsError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Part Reservations</h1>
          <p className="text-muted-foreground">
            Manage job order reservations and consumption tracking
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetReservationForm();
            setActionLoading(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Reservation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-popover border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create New Reservation</DialogTitle>
            </DialogHeader>

            {/* Show loading indicator when data is still loading */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading inventory items...</span>
              </div>
            )}

            {/* Show content when data is loaded */}
            {!loading && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="jobOrder" className="text-foreground">Job Order Number *</Label>
                  <Input
                    id="jobOrder"
                    value={reservationDetails.job_order_number}
                    onChange={(e) => {
                      setReservationDetails(prev => ({ ...prev, job_order_number: e.target.value }));
                      if (createReservationError) setCreateReservationError(null);
                    }}
                    placeholder="JO-2024-001"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="requestedBy" className="text-foreground">Requested By *</Label>
                  <Input
                    id="requestedBy"
                    value={reservationDetails.requested_by}
                    onChange={(e) => {
                      setReservationDetails(prev => ({ ...prev, requested_by: e.target.value }));
                      if (createReservationError) setCreateReservationError(null);
                    }}
                    placeholder="Technician Name"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="text-foreground">Notes</Label>
                  <Input
                    id="notes"
                    value={reservationDetails.notes}
                    onChange={(e) => {
                      setReservationDetails(prev => ({ ...prev, notes: e.target.value }));
                      if (createReservationError) setCreateReservationError(null);
                    }}
                    placeholder="Additional notes (optional)"
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-foreground">Items to Reserve *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addReservationItem}
                      className="h-8"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {reservationItems.map((item, index) => (
                      <div key={`reservation-item-${index}-${item.item_id || 'empty'}`} className="flex gap-2 items-end p-3 border rounded-lg bg-muted/20">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Part</Label>
                          <Select
                            value={String(item.item_id)} // Convert to string for Select component
                            onValueChange={(value) => updateReservationItem(index, 'item_id', value)}
                          >
                            <SelectTrigger className="h-8 bg-input border-border text-foreground">
                              <SelectValue placeholder="Select part">
                                {(() => {
                                  if (!item.item_id) return "Select part";
                                  const selectedItem = inventoryItems.find(inv => String(inv.item_id) === String(item.item_id));
                                  return selectedItem ? `${selectedItem.item_name} (Stock: ${selectedItem.stock})` : "Select part";
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border max-h-64 overflow-y-auto">
                              {(() => {
                                if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
                                  return <SelectItem value="" disabled>No items available</SelectItem>;
                                }

                                // Sort items: available items first (stock > 0), then by name
                                const sortedItems = [...inventoryItems].sort((a, b) => {
                                  // First sort by stock availability
                                  if (a.stock > 0 && b.stock === 0) return -1;
                                  if (a.stock === 0 && b.stock > 0) return 1;

                                  // Then sort by name
                                  return a.item_name.localeCompare(b.item_name);
                                });

                                return sortedItems.map((inventoryItem) => {
                                  if (!inventoryItem || !inventoryItem.item_id) {
                                    return null;
                                  }

                                  const isOutOfStock = inventoryItem.stock === 0;
                                  const isLowStock = inventoryItem.stock > 0 && inventoryItem.stock <= 5;

                                  return (
                                    <SelectItem
                                      key={String(inventoryItem.item_id)}
                                      value={String(inventoryItem.item_id)}
                                      disabled={isOutOfStock}
                                      className={`${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''} ${isLowStock ? 'text-orange-600' : ''}`}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className={isOutOfStock ? 'line-through' : ''}>
                                          {inventoryItem.item_name}
                                        </span>
                                        <span className={`ml-2 text-xs ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-muted-foreground'}`}>
                                          {isOutOfStock ? 'Out of Stock' : `Stock: ${inventoryItem.stock}`}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  );
                                }).filter(Boolean);
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={item.quantity === '' ? '' : String(item.quantity)}
                            onChange={(e) => {
                              console.log('Quantity input change:', e.target.value);
                              const value = e.target.value;

                              // Prevent negative numbers and values over 100
                              if (value === '') {
                                updateReservationItem(index, 'quantity', '');
                              } else {
                                const numValue = parseInt(value);
                                if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
                                  updateReservationItem(index, 'quantity', numValue);
                                } else if (numValue > 100) {
                                  updateReservationItem(index, 'quantity', 100);
                                  setCreateReservationError("Maximum quantity per item is 100");
                                }
                              }
                            }}
                            onBlur={(e) => {
                              // Set minimum value of 1 when field loses focus if empty or invalid
                              const value = e.target.value;
                              if (value === '' || isNaN(parseInt(value)) || parseInt(value) < 1) {
                                updateReservationItem(index, 'quantity', 1);
                              }

                              // Additional stock validation on blur
                              if (item.item_id) {
                                const selectedItem = inventoryItems.find(inv => String(inv.item_id) === String(item.item_id));
                                if (selectedItem) {
                                  const qty = parseInt(value) || 1;
                                  if (qty > selectedItem.stock) {
                                    setCreateReservationError(`Cannot reserve ${qty} of ${selectedItem.item_name} (only ${selectedItem.stock} in stock)`);
                                  } else {
                                    // Clear stock-related errors if quantity is valid
                                    if (createReservationError?.includes('only') && createReservationError?.includes('in stock')) {
                                      setCreateReservationError(null);
                                    }
                                  }
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              // Prevent entering negative sign, plus sign, decimal point, and 'e' (scientific notation)
                              if (['-', '+', '.', 'e', 'E'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            className="h-8 bg-input border-border text-foreground"
                          />
                        </div>
                        {reservationItems.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeReservationItem(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {createReservationError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {createReservationError}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleCreateReservation}
                  disabled={isCreatingReservation}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreatingReservation ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Reservation{reservationItems.filter(item => item.item_id).length > 1 ? 's' : ''}...
                    </>
                  ) : (
                    `Create Reservation${reservationItems.filter(item => item.item_id).length > 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Priority Alert for Pending Reservations */}
      {reservations.filter(r => r.status === 'pending').length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 dark:from-yellow-950/30 dark:to-orange-950/30 dark:border-yellow-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 animate-pulse" />
                  <div>
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                      Urgent: Reservations Awaiting Approval
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      {reservations.filter(r => r.status === 'pending').length} reservation{reservations.filter(r => r.status === 'pending').length !== 1 ? 's' : ''} need{reservations.filter(r => r.status === 'pending').length === 1 ? 's' : ''} immediate attention
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  {reservations.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.quantity, 0)} items pending
                </div>
                <div className="text-xs text-orange-700 dark:text-orange-300">
                  Review and approve below
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active Reservations</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeReservations.length}</div>
            <p className="text-xs text-muted-foreground">
              Parts currently reserved
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Reserved Value</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₱{totalReservedValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total reserved inventory value
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {completedReservations.filter((r: Reservation) =>
                new Date(r.updated_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Jobs completed today
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Reservation Details</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Hierarchical Reservation Groups */}
          <div className="space-y-4">
            {groupReservationsByStatus(reservations).map(([status, statusReservations]) => {
              const style = getStatusGroupStyle(status);
              const { totalQuantity, totalValue } = getGroupStats(statusReservations);
              const isCollapsed = collapsedGroups[status];

              return (
                <div key={status} className="rounded-lg border border-border overflow-hidden">
                  {/* Status Group Header */}
                  <Collapsible open={!isCollapsed} onOpenChange={() => toggleGroupCollapse(status)}>
                    <CollapsibleTrigger className="w-full">
                      <div className={`${style.headerBg} border-b border-border p-4 hover:opacity-90 transition-opacity ${status === 'pending' ? 'ring-2 ring-yellow-400/30' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? (
                                <ChevronRight className={`h-4 w-4 ${style.icon}`} />
                              ) : (
                                <ChevronDown className={`h-4 w-4 ${style.icon}`} />
                              )}
                              {getStatusIcon(status)}

                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-semibold text-lg ${style.textColor} capitalize`}>
                                  {status} Reservations
                                </h3>
                              </div>
                              <p className={`text-sm ${style.textColor} opacity-80`}>
                                {statusReservations.length} reservation{statusReservations.length !== 1 ? 's' : ''}
                                {status === 'pending' && statusReservations.length > 0 && ' awaiting approval'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${style.textColor}`}>
                              {totalQuantity} items • ₱{totalValue.toFixed(2)}
                            </div>
                            <div className={`text-xs ${style.textColor} opacity-80`}>
                              {status === 'pending' ? 'Pending approval value' : 'Total value in this group'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    {/* Status Group Content */}
                    <CollapsibleContent>
                      <div className="bg-card">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border bg-muted/30">
                              <TableHead className="text-foreground font-semibold w-[120px]">Job Order</TableHead>
                              <TableHead className="text-foreground font-semibold w-[130px]">Part Number</TableHead>
                              <TableHead className="text-foreground font-semibold min-w-[200px]">Description</TableHead>
                              <TableHead className="text-foreground font-semibold w-[80px] text-center">Reserved</TableHead>
                              <TableHead className="text-foreground font-semibold w-[80px] text-center">Consumed</TableHead>
                              <TableHead className="text-foreground font-semibold w-[120px]">Requested By</TableHead>
                              <TableHead className="text-foreground font-semibold w-[100px] text-center">Created</TableHead>
                              <TableHead className="text-foreground font-semibold w-[180px] text-center">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {statusReservations.map((reservation: Reservation) => {
                              const item = inventoryItems.find(item => item.item_id === reservation.item_id);
                              const isUrgent = status === 'pending' &&
                                new Date().getTime() - new Date(reservation.created_at).getTime() > 24 * 60 * 60 * 1000; // older than 24 hours

                              return (
                                <TableRow
                                  key={reservation.id}
                                  className={`border-border hover:bg-muted/30 transition-colors ${
                                    isUrgent ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                                  }`}
                                >
                                  <TableCell className="font-medium text-foreground px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      {isUrgent && (
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                      )}
                                      {reservation.job_order_number}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-foreground px-4 py-3 font-mono text-sm">
                                    {reservation.item_id}
                                  </TableCell>
                                  <TableCell className="text-foreground px-4 py-3">
                                    <div className="max-w-[200px]">
                                      <div className="font-medium truncate">{item?.item_name || 'Unknown Item'}</div>
                                      {item?.description && (
                                        <div className="text-xs text-muted-foreground truncate mt-1">
                                          {item.description}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-foreground px-4 py-3 text-center font-semibold">
                                    {reservation.quantity}
                                  </TableCell>
                                  <TableCell className="text-foreground px-4 py-3 text-center">
                                    {reservation.actual_quantity || 0}
                                  </TableCell>
                                  <TableCell className="text-foreground px-4 py-3">
                                    <div className="font-medium">{reservation.requested_by}</div>
                                  </TableCell>
                                  <TableCell className="text-foreground px-4 py-3 text-center text-sm">
                                    {new Date(reservation.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: '2-digit'
                                    })}
                                  </TableCell>
                                  <TableCell className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2 min-h-[36px]">
                                      {reservation.status === 'pending' && (
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            className="h-8 px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                                            onClick={() => handleApproveReservation(reservation.id)}
                                            disabled={actionLoading === `approve-${reservation.id}`}
                                          >
                                            {actionLoading === `approve-${reservation.id}` ? (
                                              <RefreshCw className="h-3 w-3 animate-spin" />
                                            ) : (
                                              'Approve'
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleRejectReservation(reservation.id)}
                                            disabled={actionLoading === `reject-${reservation.id}`}
                                            className="h-8 px-3 text-xs font-medium"
                                          >
                                            {actionLoading === `reject-${reservation.id}` ? (
                                              <RefreshCw className="h-3 w-3 animate-spin" />
                                            ) : (
                                              'Reject'
                                            )}
                                          </Button>
                                        </div>
                                      )}
                                      {reservation.status === 'approved' && (
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCompleteReservation(reservation.id)}
                                            disabled={actionLoading === `complete-${reservation.id}`}
                                            className="h-8 px-3 text-xs font-medium"
                                          >
                                            {actionLoading === `complete-${reservation.id}` ? (
                                              <RefreshCw className="h-3 w-3 animate-spin" />
                                            ) : (
                                              'Complete'
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCancelReservation(reservation.id)}
                                            disabled={actionLoading === `cancel-${reservation.id}`}
                                            className="h-8 px-3 text-xs font-medium"
                                          >
                                            {actionLoading === `cancel-${reservation.id}` ? (
                                              <RefreshCw className="h-3 w-3 animate-spin" />
                                            ) : (
                                              'Cancel'
                                            )}
                                          </Button>
                                        </div>
                                      )}
                                      {(reservation.status === 'completed' || reservation.status === 'cancelled' || reservation.status === 'rejected') && (
                                        <span className="text-xs text-muted-foreground px-3">
                                          No actions available
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}

            {/* Empty State */}
            {reservations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No reservations found</h3>
                <p className="text-sm">Create a new reservation to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
