import { useDashboardAnalytics, useLowStockAlerts } from "@/hooks/useInventory";
import { useReservationsSummary } from "@/hooks/useReservations";
import type { InventoryItem, StockTransaction } from "@/types/inventory";
import {
  AlertTriangle,
  Clock,
  Loader2,
  Package,
  TrendingDown,
} from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface TopCategory {
  category: string;
  count: number;
  value: number;
}

// Custom Peso Icon Component
const PesoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 3v18" />
    <path d="M6 8h7a3 3 0 0 0 0-6H6" />
    <path d="M6 11h7a3 3 0 0 0 0-6" />
    <path d="M4 8h10" />
    <path d="M4 11h10" />
  </svg>
);

export function Dashboard() {
  const {
    data: analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useDashboardAnalytics();
  const { data: lowStockAlerts, loading: alertsLoading } = useLowStockAlerts();
  const { loading: reservationsLoading } = useReservationsSummary();

  if (analyticsError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard data: {analyticsError}
        </AlertDescription>
      </Alert>
    );
  }

  const isLoading = analyticsLoading || alertsLoading || reservationsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Inventory Dashboard
        </h1>
        <p className="text-muted-foreground">
          Real-time overview of Alien Care Autoshop inventory status
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Parts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading...
                </span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {analytics?.total_items || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active inventory items
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Low Stock Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading...
                </span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-destructive">
                  {analytics?.low_stock_count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Below minimum threshold
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Value</CardTitle>
            <PesoIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading...
                </span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  ₱
                  {analytics?.total_value?.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  }) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current inventory value
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active Reservations</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading...
                </span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">
                  {analytics?.active_reservations || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pending approval and processing
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading alerts...
                </span>
              </div>
            ) : lowStockAlerts && lowStockAlerts.length > 0 ? (
              lowStockAlerts.slice(0, 5).map((item: InventoryItem) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg bg-destructive/5"
                >
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-foreground">
                        {item.item_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.item_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">Low Stock</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.stock} / {item.reorder_level} min
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No low stock alerts
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading transactions...
                </span>
              </div>
            ) : analytics?.recent_transactions &&
              analytics.recent_transactions.length > 0 ? (
              analytics.recent_transactions
                .slice(0, 5)
                .map((transaction: StockTransaction, index: number) => (
                  <div
                    key={
                      transaction.id ||
                      `transaction-${index}-${transaction.item_id}`
                    }
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          transaction.transaction_type === "sale"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {transaction.transaction_type.toUpperCase()}
                      </Badge>
                      <span className="text-foreground">
                        {transaction.inventory_item?.item_id || "Unknown"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground">
                        {transaction.quantity} units
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent transactions
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            Top Categories by Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading categories...
              </span>
            </div>
          ) : analytics?.top_categories &&
            analytics.top_categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.top_categories.map(
                (category: TopCategory, index: number) => (
                  <div
                    key={category.category}
                    className="p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-foreground">
                        {category.category}
                      </h3>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {category.count} items
                      </p>
                      <p className="text-lg font-bold text-primary">
                        ₱
                        {category.value?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        }) || "0.00"}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No category data available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
