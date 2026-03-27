import { AlertTriangle, CheckCircle, Clock, Package, RefreshCw, Settings } from "lucide-react";
import { useState } from "react";
import { useAlerts } from "../../hooks/useAlerts";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function StockAlerts() {
  const {
    alerts: rawAlerts,
    statistics,
    loading,
    error,
    acknowledgeAlert,
    bulkAcknowledgeAlerts,
    generateLowStockAlerts,
    cleanupAlerts,
    refresh
  } = useAlerts();

  // Ensure alerts is always an array and add debugging
  const alerts = Array.isArray(rawAlerts) ? rawAlerts : [];

  const [bulkSelected, setBulkSelected] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Debug logging
  console.log('StockAlerts render - rawAlerts:', rawAlerts, 'alerts:', alerts, 'type:', typeof alerts, 'isArray:', Array.isArray(alerts));

  // Early return if alerts is not properly initialized
  if (!Array.isArray(alerts)) {
    console.error('Alerts is not an array, returning loading state');
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
          <p>Initializing alerts...</p>
        </div>
      </div>
    );
  }

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      setActionLoading(`acknowledge-${alertId}`);
      await acknowledgeAlert(alertId);
      alert('Alert acknowledged successfully');
    } catch {
      alert('Failed to acknowledge alert');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAcknowledge = async () => {
    if (bulkSelected.length === 0) {
      alert('Please select alerts to acknowledge');
      return;
    }

    try {
      setActionLoading('bulk-acknowledge');
      await bulkAcknowledgeAlerts(bulkSelected);
      alert(`Successfully acknowledged ${bulkSelected.length} alerts`);
      setBulkSelected([]);
    } catch {
      alert('Failed to acknowledge selected alerts');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateAlerts = async () => {
    try {
      setActionLoading('generate');
      const result = await generateLowStockAlerts();
      alert(`Generated ${result.alerts_created} new alerts for ${result.total_low_stock_items} low stock items`);
    } catch {
      alert('Failed to generate alerts');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanup = async () => {
    try {
      setActionLoading('cleanup');
      const result = await cleanupAlerts(30);
      alert(`Cleaned up ${result.deleted_count} old acknowledged alerts`);
    } catch {
      alert('Failed to cleanup alerts');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleBulkSelect = (alertId: number) => {
    setBulkSelected(prev =>
      prev.includes(alertId)
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  const selectAllUnacknowledged = () => {
    console.log('selectAllUnacknowledged called - alerts:', alerts, 'isArray:', Array.isArray(alerts));
    if (!Array.isArray(alerts)) {
      console.error('alerts is not an array in selectAllUnacknowledged:', alerts);
      return;
    }
    const unacknowledgedIds = alerts
      .filter(alert => !alert.acknowledged)
      .map(alert => alert.id);
    setBulkSelected(unacknowledgedIds);
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-primary" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-primary/80" />;
      default:
        return <Package className="h-4 w-4 text-primary/60" />;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-primary text-primary-foreground">High</Badge>;
      case 'medium':
        return <Badge className="bg-primary/80 text-primary-foreground">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  // Safe filter operations with debugging - only if not loading
  console.log('About to filter alerts - alerts:', alerts, 'isArray:', Array.isArray(alerts), 'loading:', loading);

  // Ensure alerts is always a safe array
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const unacknowledgedAlerts = safeAlerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = safeAlerts.filter(alert => alert.acknowledged);

  console.log('Safe arrays created:', {
    safeAlerts: safeAlerts.length,
    unacknowledged: unacknowledgedAlerts.length,
    acknowledged: acknowledgedAlerts.length
  });

  console.log('Filtered results - unacknowledged:', unacknowledgedAlerts.length, 'acknowledged:', acknowledgedAlerts.length);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Alerts</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage low stock notifications
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={handleGenerateAlerts}
            disabled={actionLoading === 'generate'}
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Generate Alerts
          </Button>

          <Button
            variant="outline"
            onClick={handleCleanup}
            disabled={actionLoading === 'cleanup'}
            size="sm"
          >
            <Package className="h-4 w-4 mr-2" />
            Cleanup Old
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {statistics?.critical_alerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Immediate attention required
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {statistics?.high_priority_alerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Action needed soon
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Unacknowledged</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {statistics?.unacknowledged_alerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending review
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-foreground">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Unacknowledged Alerts
              </div>
              {unacknowledgedAlerts.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllUnacknowledged}
                    disabled={loading}
                  >
                    Select All
                  </Button>
                  {bulkSelected.length > 0 && (
                    <Button
                      size="sm"
                      onClick={handleBulkAcknowledge}
                      disabled={actionLoading === 'bulk-acknowledge'}
                    >
                      Acknowledge ({bulkSelected.length})
                    </Button>
                  )}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p>Loading alerts...</p>
              </div>
            ) : unacknowledgedAlerts.length > 0 ? (
              unacknowledgedAlerts.map(alert => (
                  <div key={alert.id} className="border border-border rounded-lg p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={bulkSelected.includes(alert.id)}
                          onChange={() => toggleBulkSelect(alert.id)}
                          className="rounded"
                        />
                        {getUrgencyIcon(alert.urgency)}
                        <div>
                          <p className="font-medium text-foreground">
                            {alert.inventory_item?.item_name || `Item #${alert.item_id}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {alert.inventory_item?.category || alert.alert_type}
                          </p>
                        </div>
                      </div>
                      {getUrgencyBadge(alert.urgency)}
                    </div>

                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Current Stock: {alert.current_stock}</span>
                      <span>Threshold: {alert.reorder_level}</span>
                    </div>

                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-destructive"
                        style={{ width: `${Math.min((alert.current_stock / alert.reorder_level) * 100, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Created: {new Date(alert.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        disabled={actionLoading === `acknowledge-${alert.id}`}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {actionLoading === `acknowledge-${alert.id}` ? 'Processing...' : 'Acknowledge'}
                      </Button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
                <p>All alerts have been acknowledged</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CheckCircle className="h-5 w-5 text-primary" />
              Acknowledged Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p>Loading alerts...</p>
              </div>
            ) : acknowledgedAlerts.length > 0 ? (
              acknowledgedAlerts.map(alert => (
                  <div key={alert.id} className="border border-border rounded-lg p-4 space-y-3 opacity-75 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">
                            {alert.inventory_item?.item_name || `Item #${alert.item_id}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {alert.inventory_item?.category || alert.alert_type}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Acknowledged</Badge>
                    </div>

                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Stock: {alert.current_stock}</span>
                      <span>
                        Acknowledged: {alert.acknowledged_at ? new Date(alert.acknowledged_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No acknowledged alerts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
