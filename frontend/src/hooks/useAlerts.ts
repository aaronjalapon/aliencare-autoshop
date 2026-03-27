import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertFilters, alertService, AlertStatistics } from '../services/alertService';

interface UseAlertsState {
  alerts: Alert[];
  statistics: AlertStatistics | null;
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
}

interface UseAlertsReturn extends UseAlertsState {
  fetchAlerts: (filters?: AlertFilters) => Promise<void>;
  fetchStatistics: () => Promise<void>;
  acknowledgeAlert: (alertId: number) => Promise<void>;
  bulkAcknowledgeAlerts: (alertIds: number[]) => Promise<{ acknowledged_count: number }>;
  generateLowStockAlerts: () => Promise<{ alerts_created: number; total_low_stock_items: number }>;
  cleanupAlerts: (days?: number) => Promise<{ deleted_count: number }>;
  refresh: () => Promise<void>;
}

export const useAlerts = (initialFilters: AlertFilters = {}): UseAlertsReturn => {
  const [state, setState] = useState<UseAlertsState>({
    alerts: [], // Ensure this is always an array
    statistics: null,
    loading: false,
    error: null,
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 0,
    },
  });

  const [currentFilters, setCurrentFilters] = useState<AlertFilters>(initialFilters);

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const fetchAlerts = useCallback(async (filters: AlertFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const newFilters = { ...currentFilters, ...filters };
      setCurrentFilters(newFilters);

      console.log('Fetching alerts with filters:', newFilters);
      const response = await alertService.getAlerts(newFilters);
      console.log('API Response:', response);

      if (response.success && response.data) {
        const alertsData = Array.isArray(response.data.data) ? response.data.data : [];
        console.log('Alerts data:', alertsData);

        setState(prev => ({
          ...prev,
          alerts: alertsData, // Ensure this is always an array
          pagination: {
            currentPage: response.data.current_page || 1,
            lastPage: response.data.last_page || 1,
            perPage: response.data.per_page || 10,
            total: response.data.total || 0,
          },
        }));

        // If no alerts exist and this is the initial load, try to generate them automatically
        if (alertsData.length === 0 && response.data.total === 0) {
          console.log('No alerts found, attempting to auto-generate from low stock items...');
          try {
            const generateResponse = await alertService.generateLowStockAlerts();
            if (generateResponse.success && generateResponse.data.alerts_created > 0) {
              console.log(`Auto-generated ${generateResponse.data.alerts_created} alerts`);
              // Fetch alerts again to get the newly generated ones
              const updatedResponse = await alertService.getAlerts(newFilters);
              if (updatedResponse.success && updatedResponse.data) {
                const updatedAlertsData = Array.isArray(updatedResponse.data.data) ? updatedResponse.data.data : [];
                setState(prev => ({
                  ...prev,
                  alerts: updatedAlertsData,
                  pagination: {
                    currentPage: updatedResponse.data.current_page || 1,
                    lastPage: updatedResponse.data.last_page || 1,
                    perPage: updatedResponse.data.per_page || 10,
                    total: updatedResponse.data.total || 0,
                  },
                }));
              }
            }
          } catch (error) {
            console.log('Auto-generation failed, but continuing normally:', error);
          }
        }
      } else {
        console.error('API response not successful:', response);
        setError(response.message || 'Failed to fetch alerts');
        setState(prev => ({ ...prev, alerts: [] })); // Ensure alerts is always an array
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setError('Failed to fetch alerts');
      setState(prev => ({ ...prev, alerts: [] }));
    } finally {
      setLoading(false);
    }
  }, [currentFilters]);

  const fetchStatistics = useCallback(async () => {
    try {
      setError(null);
      const response = await alertService.getAlertStatistics();

      if (response.success) {
        setState(prev => ({
          ...prev,
          statistics: response.data,
        }));
      } else {
        setError(response.message || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching alert statistics:', error);
      setError('Failed to fetch alert statistics');
    }
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: number) => {
    try {
      setError(null);
      const response = await alertService.acknowledgeAlert(alertId);

      if (response.success) {
        // Update the alert in the local state
        setState(prev => ({
          ...prev,
          alerts: Array.isArray(prev.alerts) ? prev.alerts.map(alert =>
            alert.id === alertId
              ? { ...alert, acknowledged: true, acknowledged_at: new Date().toISOString() }
              : alert
          ) : [],
        }));

        // Refresh statistics to reflect the change
        await fetchStatistics();
      } else {
        setError(response.message || 'Failed to acknowledge alert');
        throw new Error(response.message || 'Failed to acknowledge alert');
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      setError('Failed to acknowledge alert');
      throw error;
    }
  }, [fetchStatistics]);

  const bulkAcknowledgeAlerts = useCallback(async (alertIds: number[]) => {
    try {
      setError(null);
      const response = await alertService.bulkAcknowledgeAlerts(alertIds);

      if (response.success) {
        // Update alerts in local state
        setState(prev => ({
          ...prev,
          alerts: Array.isArray(prev.alerts) ? prev.alerts.map(alert =>
            alertIds.includes(alert.id)
              ? { ...alert, acknowledged: true, acknowledged_at: new Date().toISOString() }
              : alert
          ) : [],
        }));

        // Refresh statistics to reflect the changes
        await fetchStatistics();

        return response.data;
      } else {
        setError(response.message || 'Failed to acknowledge alerts');
        throw new Error(response.message || 'Failed to acknowledge alerts');
      }
    } catch (error) {
      console.error('Error bulk acknowledging alerts:', error);
      setError('Failed to acknowledge alerts');
      throw error;
    }
  }, [fetchStatistics]);

  const generateLowStockAlerts = useCallback(async () => {
    try {
      setError(null);
      const response = await alertService.generateLowStockAlerts();

      if (response.success) {
        // Refresh alerts and statistics after generation
        await Promise.all([fetchAlerts(), fetchStatistics()]);
        return response.data;
      } else {
        setError(response.message || 'Failed to generate alerts');
        throw new Error(response.message || 'Failed to generate alerts');
      }
    } catch (error) {
      console.error('Error generating low stock alerts:', error);
      setError('Failed to generate low stock alerts');
      throw error;
    }
  }, [fetchAlerts, fetchStatistics]);

  const cleanupAlerts = useCallback(async (days: number = 30) => {
    try {
      setError(null);
      const response = await alertService.cleanupAlerts(days);

      if (response.success) {
        // Refresh alerts and statistics after cleanup
        await Promise.all([fetchAlerts(), fetchStatistics()]);
        return response.data;
      } else {
        setError(response.message || 'Failed to cleanup alerts');
        throw new Error(response.message || 'Failed to cleanup alerts');
      }
    } catch (error) {
      console.error('Error cleaning up alerts:', error);
      setError('Failed to cleanup alerts');
      throw error;
    }
  }, [fetchAlerts, fetchStatistics]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchAlerts(), fetchStatistics()]);
  }, [fetchAlerts, fetchStatistics]);

  // Initial data fetch
  useEffect(() => {
    fetchAlerts();
    fetchStatistics();
  }, [fetchAlerts, fetchStatistics]);

  return {
    ...state,
    alerts: Array.isArray(state.alerts) ? state.alerts : [], // Ensure alerts is always an array
    fetchAlerts,
    fetchStatistics,
    acknowledgeAlert,
    bulkAcknowledgeAlerts,
    generateLowStockAlerts,
    cleanupAlerts,
    refresh,
  };
};

export default useAlerts;
