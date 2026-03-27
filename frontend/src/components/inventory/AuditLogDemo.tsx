/**
 * Demo component to test real-time audit log functionality
 * This component simulates inventory operations to demonstrate real-time updates
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dispatchInventoryUpdate, dispatchReservationUpdate, dispatchStockTransaction } from "@/utils/inventoryEvents";
import { Clock, Package, RefreshCw, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";

export function AuditLogDemo() {
  const [isSimulating, setIsSimulating] = useState(false);

  const simulateStockTransaction = () => {
    setIsSimulating(true);

    // Simulate a stock addition
    setTimeout(() => {
      dispatchStockTransaction(1, 'procurement', 50, {
        reference_number: `PO-${Date.now()}`,
        notes: 'Demo procurement transaction'
      });
    }, 500);

    // Simulate a stock consumption
    setTimeout(() => {
      dispatchStockTransaction(1, 'sale', -10, {
        reference_number: `JO-${Date.now()}`,
        notes: 'Demo consumption transaction'
      });
    }, 1500);

    // Simulate inventory update
    setTimeout(() => {
      dispatchInventoryUpdate(1, 'updated', {
        field: 'reorder_level',
        old_value: 10,
        new_value: 15
      });
    }, 2500);

    setTimeout(() => {
      setIsSimulating(false);
    }, 3000);
  };

  const simulateReservationFlow = () => {
    setIsSimulating(true);

    // Create reservation
    setTimeout(() => {
      dispatchReservationUpdate('new', 'created', {
        item_id: 2,
        quantity: 5,
        job_order_number: `JO-${Date.now()}`
      });
    }, 500);

    // Approve reservation
    setTimeout(() => {
      dispatchReservationUpdate('123', 'approved', {
        approved_by: 'demo-user',
        approved_at: new Date().toISOString()
      });
    }, 1500);

    // Complete reservation
    setTimeout(() => {
      dispatchReservationUpdate('123', 'completed', {
        completed_by: 'demo-user',
        actual_quantity: 5
      });
    }, 2500);

    setTimeout(() => {
      setIsSimulating(false);
    }, 3000);
  };

  const simulateMultipleOperations = () => {
    setIsSimulating(true);

    const operations = [
      () => dispatchStockTransaction(3, 'procurement', 100, { notes: 'Bulk restock' }),
      () => dispatchStockTransaction(4, 'adjustment', -5, { notes: 'Inventory correction' }),
      () => dispatchInventoryUpdate(5, 'created', { item_name: 'New Demo Item' }),
      () => dispatchReservationUpdate('new', 'created', { item_id: 3, quantity: 25 }),
      () => dispatchStockTransaction(3, 'return', 3, { notes: 'Customer return' })
    ];

    operations.forEach((operation, index) => {
      setTimeout(operation, (index + 1) * 800);
    });

    setTimeout(() => {
      setIsSimulating(false);
    }, operations.length * 800 + 1000);
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Clock className="h-5 w-5" />
          Real-time Audit Log Demo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-blue-700">
          Use the buttons below to simulate inventory operations and see real-time updates in the audit log.
          Make sure to enable "Real-time" mode in the audit log panel above.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={simulateStockTransaction}
            disabled={isSimulating}
            variant="outline"
            size="sm"
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            {isSimulating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Package className="h-4 w-4 mr-2" />
            )}
            Simulate Stock Operations
          </Button>

          <Button
            onClick={simulateReservationFlow}
            disabled={isSimulating}
            variant="outline"
            size="sm"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            {isSimulating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            Simulate Reservation Flow
          </Button>

          <Button
            onClick={simulateMultipleOperations}
            disabled={isSimulating}
            variant="outline"
            size="sm"
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            {isSimulating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Truck className="h-4 w-4 mr-2" />
            )}
            Simulate Mixed Operations
          </Button>
        </div>

        {isSimulating && (
          <div className="text-sm text-blue-600 animate-pulse">
            ⚡ Simulating operations... Check the audit log for real-time updates!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
