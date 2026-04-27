import { AlertTriangle, CheckCircle, Clock, Package, RefreshCw, Settings } from 'lucide-react';
import { useState } from 'react';
import { getApiErrorMessage } from '../../lib/api-error-message';
import { useAlerts } from '../../hooks/useAlerts';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export function StockAlerts() {
    const {
        alerts,
        statistics,
        loading,
        error,
        acknowledgeAlert,
        bulkAcknowledgeAlerts,
        generateLowStockAlerts,
        cleanupAlerts,
        refresh,
    } = useAlerts();

    const [bulkSelected, setBulkSelected] = useState<number[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleAcknowledgeAlert = async (alertId: number) => {
        try {
            setActionMessage(null);
            setActionLoading(`acknowledge-${alertId}`);
            await acknowledgeAlert(alertId);
            setActionMessage({
                type: 'success',
                message: 'Alert acknowledged successfully.',
            });
        } catch (err) {
            setActionMessage({
                type: 'error',
                message: getApiErrorMessage(err, 'Failed to acknowledge alert.'),
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleBulkAcknowledge = async () => {
        if (bulkSelected.length === 0) {
            setActionMessage({
                type: 'error',
                message: 'Please select alerts to acknowledge.',
            });
            return;
        }

        try {
            setActionMessage(null);
            setActionLoading('bulk-acknowledge');
            const selectedCount = bulkSelected.length;
            await bulkAcknowledgeAlerts(bulkSelected);
            setBulkSelected([]);
            setActionMessage({
                type: 'success',
                message: `Acknowledged ${selectedCount} alert${selectedCount === 1 ? '' : 's'}.`,
            });
        } catch (err) {
            setActionMessage({
                type: 'error',
                message: getApiErrorMessage(err, 'Failed to acknowledge selected alerts.'),
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleGenerateAlerts = async () => {
        try {
            setActionMessage(null);
            setActionLoading('generate');
            const result = await generateLowStockAlerts();
            setActionMessage({
                type: 'success',
                message: `Generated ${result.alerts_created} new alert${result.alerts_created === 1 ? '' : 's'} and refreshed ${result.total_alerts} total tracked alert${result.total_alerts === 1 ? '' : 's'}.`,
            });
        } catch (err) {
            setActionMessage({
                type: 'error',
                message: getApiErrorMessage(err, 'Failed to generate alerts.'),
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleCleanup = async () => {
        try {
            setActionMessage(null);
            setActionLoading('cleanup');
            const result = await cleanupAlerts(30);
            setActionMessage({
                type: 'success',
                message: `Cleaned up ${result.deleted_count} old acknowledged alert${result.deleted_count === 1 ? '' : 's'}.`,
            });
        } catch (err) {
            setActionMessage({
                type: 'error',
                message: getApiErrorMessage(err, 'Failed to clean up alerts.'),
            });
        } finally {
            setActionLoading(null);
        }
    };

    const toggleBulkSelect = (alertId: number) => {
        setBulkSelected((prev) => (prev.includes(alertId) ? prev.filter((id) => id !== alertId) : [...prev, alertId]));
    };

    const selectAllUnacknowledged = () => {
        const unacknowledgedIds = alerts.filter((alert) => !alert.acknowledged).map((alert) => alert.id);
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

    const unacknowledgedAlerts = alerts.filter((alert) => !alert.acknowledged);
    const acknowledgedAlerts = alerts.filter((alert) => alert.acknowledged);

    if (error) {
        return (
            <div className="space-y-6">
                <div className="py-8 text-center">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                    <h3 className="mb-2 text-lg font-semibold text-foreground">Error Loading Alerts</h3>
                    <p className="mb-4 text-muted-foreground">{error}</p>
                    <Button onClick={refresh} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Stock Alerts</h1>
                    <p className="text-muted-foreground">Monitor and manage low stock notifications</p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={refresh} disabled={loading} size="sm">
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>

                    <Button variant="outline" onClick={handleGenerateAlerts} disabled={actionLoading === 'generate'} size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Generate Alerts
                    </Button>

                    <Button variant="outline" onClick={handleCleanup} disabled={actionLoading === 'cleanup'} size="sm">
                        <Package className="mr-2 h-4 w-4" />
                        Cleanup Old
                    </Button>
                </div>
            </div>

            {actionMessage && (
                <Alert variant={actionMessage.type === 'error' ? 'destructive' : 'default'}>
                    {actionMessage.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    <AlertDescription>{actionMessage.message}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="profile-card rounded-xl">
                    <div className="flex flex-row items-center justify-between p-5 pb-2">
                        <p className="text-sm font-medium">Critical Alerts</p>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="p-5 pt-0">
                        <div className="text-2xl font-bold text-destructive">{statistics?.critical_alerts || 0}</div>
                        <p className="text-xs text-muted-foreground">Immediate attention required</p>
                    </div>
                </div>

                <div className="profile-card rounded-xl">
                    <div className="flex flex-row items-center justify-between p-5 pb-2">
                        <p className="text-sm font-medium">High Priority</p>
                        <AlertTriangle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="p-5 pt-0">
                        <div className="text-2xl font-bold text-primary">{statistics?.high_priority_alerts || 0}</div>
                        <p className="text-xs text-muted-foreground">Action needed soon</p>
                    </div>
                </div>

                <div className="profile-card rounded-xl">
                    <div className="flex flex-row items-center justify-between p-5 pb-2">
                        <p className="text-sm font-medium">Total Unacknowledged</p>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="p-5 pt-0">
                        <div className="text-2xl font-bold text-foreground">{statistics?.unacknowledged_alerts || 0}</div>
                        <p className="text-xs text-muted-foreground">Pending review</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="profile-card rounded-xl">
                    <div className="p-5 pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                <h3 className="font-semibold text-foreground">Unacknowledged Alerts</h3>
                            </div>
                            {unacknowledgedAlerts.length > 0 && (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={selectAllUnacknowledged} disabled={loading}>
                                        Select All
                                    </Button>
                                    {bulkSelected.length > 0 && (
                                        <Button size="sm" onClick={handleBulkAcknowledge} disabled={actionLoading === 'bulk-acknowledge'}>
                                            Acknowledge ({bulkSelected.length})
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-4 p-5 pt-0">
                        {loading ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
                                <p>Loading alerts...</p>
                            </div>
                        ) : unacknowledgedAlerts.length > 0 ? (
                            unacknowledgedAlerts.map((alert) => (
                                <div key={alert.id} className="space-y-3 rounded-lg border border-[#2a2a2e] bg-[#0d0d10]/60 p-4">
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
                                                <p className="font-medium text-foreground">{alert.item_name || `Item #${alert.item_id}`}</p>
                                                <p className="text-sm text-muted-foreground">{alert.category || alert.alert_type}</p>
                                            </div>
                                        </div>
                                        {getUrgencyBadge(alert.urgency)}
                                    </div>

                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Current Stock: {alert.current_stock}</span>
                                        <span>Threshold: {alert.reorder_level}</span>
                                    </div>

                                    <div className="h-2 w-full rounded-full bg-muted">
                                        <div
                                            className="h-2 rounded-full bg-destructive"
                                            style={{ width: `${Math.min((alert.current_stock / Math.max(alert.reorder_level, 1)) * 100, 100)}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
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
                            <div className="py-8 text-center text-muted-foreground">
                                <CheckCircle className="mx-auto mb-4 h-12 w-12 text-primary" />
                                <p>All alerts have been acknowledged</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="profile-card rounded-xl">
                    <div className="p-5 pb-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-foreground">Acknowledged Alerts</h3>
                        </div>
                    </div>
                    <div className="space-y-4 p-5 pt-0">
                        {loading ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
                                <p>Loading alerts...</p>
                            </div>
                        ) : acknowledgedAlerts.length > 0 ? (
                            acknowledgedAlerts.map((alert) => (
                                <div key={alert.id} className="space-y-3 rounded-lg border border-[#2a2a2e] bg-[#0d0d10]/60 p-4 opacity-75">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-primary" />
                                            <div>
                                                <p className="font-medium text-foreground">{alert.item_name || `Item #${alert.item_id}`}</p>
                                                <p className="text-sm text-muted-foreground">{alert.category || alert.alert_type}</p>
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
                            <div className="py-8 text-center text-muted-foreground">
                                <p>No acknowledged alerts</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
