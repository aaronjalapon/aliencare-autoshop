import AppLayout from '@/components/layout/app-layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type BreadcrumbItem } from '@/types';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'API Test',
        href: '/api-test',
    },
];

interface TestResult {
    name: string;
    status: 'pending' | 'success' | 'error';
    message: string;
    data?: unknown;
}

export default function ApiTest() {
    const [tests, setTests] = useState<TestResult[]>([
        { name: 'Health Check', status: 'pending', message: 'Not tested' },
        { name: 'Inventory List', status: 'pending', message: 'Not tested' },
        { name: 'Dashboard Analytics', status: 'pending', message: 'Not tested' },
        { name: 'Low Stock Alerts', status: 'pending', message: 'Not tested' },
        { name: 'Reservations', status: 'pending', message: 'Not tested' },
    ]);
    const [isRunning, setIsRunning] = useState(false);

    const updateTest = (name: string, status: 'success' | 'error', message: string, data?: unknown) => {
        setTests((prev) => prev.map((test) => (test.name === name ? { ...test, status, message, data } : test)));
    };

    const runSingleTest = async (testName: string) => {
        const baseUrl = window.location.origin + '/api';

        try {
            switch (testName) {
                case 'Health Check': {
                    const healthResponse = await fetch(`${baseUrl}/health`);
                    if (healthResponse.ok) {
                        const data = await healthResponse.json();
                        updateTest(testName, 'success', 'API is healthy', data);
                    } else {
                        updateTest(testName, 'error', `HTTP ${healthResponse.status}`);
                    }
                    break;
                }

                case 'Inventory List': {
                    const inventoryResponse = await fetch(`${baseUrl}/inventory?per_page=5`);
                    if (inventoryResponse.ok) {
                        const data = await inventoryResponse.json();
                        updateTest(testName, 'success', `Found ${data.data?.length || 0} items`, data);
                    } else {
                        updateTest(testName, 'error', `HTTP ${inventoryResponse.status}`);
                    }
                    break;
                }

                case 'Dashboard Analytics': {
                    const analyticsResponse = await fetch(`${baseUrl}/reports/analytics/dashboard`);
                    if (analyticsResponse.ok) {
                        const data = await analyticsResponse.json();
                        updateTest(testName, 'success', 'Analytics loaded successfully', data);
                    } else {
                        updateTest(testName, 'error', `HTTP ${analyticsResponse.status}`);
                    }
                    break;
                }

                case 'Low Stock Alerts': {
                    const alertsResponse = await fetch(`${baseUrl}/inventory/alerts/low-stock`);
                    if (alertsResponse.ok) {
                        const data = await alertsResponse.json();
                        updateTest(testName, 'success', `Found ${data.data?.length || 0} alerts`, data);
                    } else {
                        updateTest(testName, 'error', `HTTP ${alertsResponse.status}`);
                    }
                    break;
                }

                case 'Reservations': {
                    const reservationsResponse = await fetch(`${baseUrl}/reservations?per_page=5`);
                    if (reservationsResponse.ok) {
                        const data = await reservationsResponse.json();
                        updateTest(testName, 'success', `Found ${data.data?.length || 0} reservations`, data);
                    } else {
                        updateTest(testName, 'error', `HTTP ${reservationsResponse.status}`);
                    }
                    break;
                }
            }
        } catch (error) {
            updateTest(testName, 'error', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const runAllTests = async () => {
        setIsRunning(true);

        // Reset all tests
        setTests((prev) =>
            prev.map((test) => ({
                ...test,
                status: 'pending' as const,
                message: 'Testing...',
            })),
        );

        // Run each test
        for (const test of tests) {
            await runSingleTest(test.name);
            // Small delay between tests
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        setIsRunning(false);
    };

    const getStatusIcon = (status: TestResult['status']) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'error':
                return <AlertTriangle className="h-4 w-4 text-red-600" />;
            default:
                return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
        }
    };

    const getStatusBadge = (status: TestResult['status']) => {
        switch (status) {
            case 'success':
                return (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                        Success
                    </Badge>
                );
            case 'error':
                return <Badge variant="destructive">Error</Badge>;
            default:
                return <Badge variant="secondary">Pending</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-5">
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">API Integration Test</h1>
                            <p className="text-muted-foreground">Test the connection between frontend and Laravel backend</p>
                        </div>
                        <Button onClick={runAllTests} disabled={isRunning} className="flex items-center gap-2">
                            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            {isRunning ? 'Testing...' : 'Run All Tests'}
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {tests.map((test) => (
                            <Card key={test.name} className="border-border bg-card">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            {getStatusIcon(test.status)}
                                            {test.name}
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(test.status)}
                                            <Button variant="outline" size="sm" onClick={() => runSingleTest(test.name)} disabled={isRunning}>
                                                Test
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="mb-2 text-sm text-muted-foreground">{test.message}</p>
                                    {test.data !== undefined && (
                                        <div className="mt-2">
                                            <details className="text-xs">
                                                <summary className="cursor-pointer text-muted-foreground">View Response Data</summary>
                                                <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                                                    {String(JSON.stringify(test.data, null, 2))}
                                                </pre>
                                            </details>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            This page helps verify that your frontend can communicate with the Laravel backend API. All tests should show "Success"
                            status for the integration to work properly.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        </AppLayout>
    );
}
