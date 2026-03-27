// Updated to match Laravel backend Inventory model
export interface InventoryItem {
  id: number;
  item_id: number;
  item_name: string;
  description: string;
  category: string;
  stock: number;
  reorder_level: number;
  unit_price: number;
  supplier: string;
  location: string;
  created_at: string;
  updated_at: string;
}

// Legacy interface for backward compatibility
export interface Part extends Omit<InventoryItem, 'id' | 'item_id' | 'item_name' | 'stock' | 'reorder_level' | 'unit_price' | 'created_at' | 'updated_at'> {
  id: string;
  partNumber: string;
  description: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  maxCapacity: number;
  unitCost: number;
  supplier: string;
  location: string;
  lastUpdated: Date;
}

// Updated to match Laravel backend StockTransaction model
export interface StockTransaction {
  id: number;
  item_id: number;
  transaction_type: 'procurement' | 'sale' | 'return' | 'damage' | 'adjustment';
  quantity: number;
  balance_after: number;
  reference_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relationships
  inventory_item?: InventoryItem;
}

// Updated to match Laravel backend Reservation model
export interface Reservation {
  id: number;
  item_id: number;
  quantity: number;
  job_order_number: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  requested_by: string;
  approved_by?: string;
  completed_by?: string;
  cancelled_by?: string;
  actual_quantity?: number;
  expires_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relationships
  inventory_item?: InventoryItem;
}

// Updated to match Laravel backend low stock detection
export interface LowStockAlert {
  id: number;
  item_id: number;
  item_name: string;
  current_stock: number;
  reorder_level: number;
  category: string;
  supplier: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

// Updated to match Laravel backend Report model
export interface Report {
  id: number;
  report_type: 'daily_usage' | 'monthly_procurement' | 'reconciliation' | 'low_stock' | 'reservation_summary';
  report_date: string;
  data: Record<string, unknown>; // JSON data specific to report type
  created_at: string;
  updated_at: string;
}

// Dashboard analytics interface
export interface DashboardAnalytics {
  total_items: number;
  total_value: number;
  low_stock_count: number;
  active_reservations: number;
  recent_transactions: StockTransaction[];
  top_categories: {
    category: string;
    count: number;
    value: number;
  }[];
}

export interface UsageReport {
  partId: number;
  partNumber: string;
  description: string;
  category: string;
  totalConsumed: number;
  totalValue: number;
  averagePerJob: number;
  period: string;
}

// Audit Log types for real-time tracking
export interface AuditLog {
  archive_id: number;
  entity_type: 'inventory' | 'reservation' | 'transaction';
  entity_id: string | number;
  action: 'create' | 'update' | 'delete' | 'reserve' | 'approve' | 'reject' | 'complete' | 'cancel' | 'consume' | 'restock' | 'adjust';
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  user_id?: string;
  reference_number?: string;
  notes?: string;
  archived_date: string;
  created_at: string;
  updated_at: string;
}

// Enhanced transaction type with audit information
export interface AuditTransaction {
  id: string | number; // Allow both string and number for compatibility
  item_id: number;
  transaction_type: 'procurement' | 'sale' | 'return' | 'damage' | 'adjustment';
  quantity: number;
  balance_after: number;
  reference_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Audit-specific fields
  performed_by?: string;
  job_order_id?: string;
  reason?: string;
  timestamp: string;
  type: string; // Maps to transaction_type for display
  partId: number;
  // Optional inventory relationship
  inventory_item?: InventoryItem;
}

// Audit log filters
export interface AuditLogFilters {
  search?: string;
  entity_type?: 'inventory' | 'reservation' | 'transaction' | 'all';
  action?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  per_page?: number;
  page?: number;
}

// Audit statistics for dashboard
export interface AuditStats {
  total_transactions: number;
  today_transactions: number;
  week_transactions: number;
  month_transactions: number;
  unique_users: number;
  transaction_types: {
    type: string;
    count: number;
  }[];
  users: string[];
}
