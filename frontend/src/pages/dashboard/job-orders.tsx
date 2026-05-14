import InvoiceDraftModal from '@/components/billing/InvoiceDraftModal';
import ApprovalQueue from '@/components/job-orders/ApprovalQueue';
import AssignmentBoard from '@/components/job-orders/AssignmentBoard';
import JobOrderDetail from '@/components/job-orders/JobOrderDetail';
import JobOrderTable from '@/components/job-orders/JobOrderTable';
import StartServiceModal from '@/components/job-orders/StartServiceModal';
import WalkInModal from '@/components/job-orders/WalkInModal';
import AppLayout from '@/components/layout/app-layout';
import {
    getOnlineSortKey,
    getPrimaryAction,
    getQueueSortKey,
    getSourceLabel,
    hasSchedule,
    isApprovalNeeded,
    isPaidInFull,
    isPendingBilling,
} from '@/lib/jobOrderFormatters';
import { jobOrderService } from '@/services/jobOrderService';
import { type BreadcrumbItem } from '@/types';
import { type JobOrder } from '@/types/customer';
import { ClipboardList, CreditCard, Globe, Layers, LayoutDashboard, Loader2, Search, UserRound, UserRoundPlus, Wrench } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Job Orders', href: '/job-orders' }];

type TabKey = 'all' | 'queue' | 'online' | 'walkin' | 'assignments' | 'billing' | 'paid';

interface TabDef {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
}

const TABS: TabDef[] = [
    { key: 'all', label: 'All', icon: <Layers className="h-3.5 w-3.5" /> },
    { key: 'queue', label: 'Active Queue', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { key: 'online', label: 'Online Booking', icon: <Globe className="h-3.5 w-3.5" /> },
    { key: 'walkin', label: 'Walk-in', icon: <UserRound className="h-3.5 w-3.5" /> },
    { key: 'assignments', label: 'Assignments', icon: <Wrench className="h-3.5 w-3.5" /> },
    { key: 'billing', label: 'Billing', icon: <CreditCard className="h-3.5 w-3.5" /> },
    { key: 'paid', label: 'Paid', icon: <ClipboardList className="h-3.5 w-3.5" /> },
];

export default function JobOrders() {
    const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    const [searchValue, setSearchValue] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('queue');
    const [selectedId, setSelectedId] = useState<number>(0);

    const [showWalkInModal, setShowWalkInModal] = useState(false);
    const [walkInInitialCustomerId, setWalkInInitialCustomerId] = useState<number | null>(null);
    const [showStartModal, setShowStartModal] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Auto-open walk-in modal when navigated from customers page
    useEffect(() => {
        const customerIdParam = searchParams.get('customer_id');
        const newParam = searchParams.get('new');
        if (customerIdParam && newParam === '1') {
            const customerId = Number.parseInt(customerIdParam, 10);
            if (Number.isFinite(customerId) && customerId > 0) {
                setWalkInInitialCustomerId(customerId);
                setShowWalkInModal(true);
                // Clean up the query params so the modal doesn't reopen on refresh
                setSearchParams({}, { replace: true });
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Data loading ──────────────────────────────────────────────────────
    const loadJobOrders = useCallback(async () => {
        try {
            setIsLoading(true);
            setLoadError(null);
            const response = await jobOrderService.getJobOrders({ per_page: 200 });
            setJobOrders(response.data.data);
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : 'Failed to load job orders.');
            setJobOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadJobOrders();
    }, [loadJobOrders]);

    const upsertJobOrder = useCallback((updatedOrder: JobOrder) => {
        setJobOrders((prev) => {
            const idx = prev.findIndex((o) => o.id === updatedOrder.id);
            if (idx === -1) return [updatedOrder, ...prev];
            const next = [...prev];
            next[idx] = updatedOrder;
            return next;
        });
    }, []);

    // ── Derived data ──────────────────────────────────────────────────────
    const activeOrders = useMemo(() => jobOrders.filter((o) => o.status !== 'settled' && o.status !== 'cancelled'), [jobOrders]);

    const onlinePendingCount = useMemo(() => jobOrders.filter((o) => isApprovalNeeded(o)).length, [jobOrders]);

    const todayYmd = useMemo(() => new Date().toISOString().split('T')[0], []);
    const currentHourSlot = useMemo(() => {
        const h = new Date().getHours().toString().padStart(2, '0');
        return `${h}:00`;
    }, []);

    const isCurrentSlot = useCallback(
        (order: JobOrder): boolean => {
            if (!order.arrival_date) return false;
            return order.arrival_date === todayYmd && order.arrival_time === currentHourSlot;
        },
        [todayYmd, currentHourSlot],
    );

    const normalizedSearch = searchValue.trim().toLowerCase();

    const searchFilter = useCallback(
        (order: JobOrder): boolean => {
            if (!normalizedSearch) return true;
            const searchable = [
                order.jo_number,
                order.customer?.full_name ?? '',
                order.customer?.phone_number ?? '',
                order.vehicle?.plate_number ?? '',
            ]
                .join(' ')
                .toLowerCase();
            return searchable.includes(normalizedSearch);
        },
        [normalizedSearch],
    );

    // ── Tab-filtered lists ────────────────────────────────────────────────
    const allOrders = useMemo(() => jobOrders.filter(hasSchedule).filter(searchFilter), [jobOrders, searchFilter]);

    const queueOrders = useMemo(
        () =>
            activeOrders
                .filter((o) => o.status !== 'completed' && isCurrentSlot(o))
                .filter(hasSchedule)
                .filter(searchFilter)
                .sort((a, b) => getQueueSortKey(a).localeCompare(getQueueSortKey(b))),
        [activeOrders, searchFilter, isCurrentSlot],
    );

    const isOnline = (o: JobOrder) => getSourceLabel(o) === 'Online Booking';

    const onlineOrders = useMemo(
        () =>
            jobOrders
                .filter(hasSchedule)
                .filter((o) => isOnline(o) && searchFilter(o))
                .sort((a, b) => getOnlineSortKey(a).localeCompare(getOnlineSortKey(b))),
        [jobOrders, searchFilter],
    );

    const onlinePendingApproval = useMemo(() => onlineOrders.filter((o) => o.status === 'pending_approval'), [onlineOrders]);

    const onlineApproved = useMemo(() => onlineOrders.filter((o) => o.status !== 'pending_approval'), [onlineOrders]);

    const walkInOrders = useMemo(
        () =>
            jobOrders
                .filter(hasSchedule)
                .filter((o) => getSourceLabel(o) === 'Walk-in' && searchFilter(o))
                .sort((a, b) => getQueueSortKey(a).localeCompare(getQueueSortKey(b))),
        [jobOrders, searchFilter],
    );

    const unassignedOrders = useMemo(
        () => jobOrders.filter(hasSchedule).filter((o) => o.status === 'approved' && searchFilter(o)),
        [jobOrders, searchFilter],
    );

    const billingOrders = useMemo(
        () => jobOrders.filter(hasSchedule).filter((o) => isPendingBilling(o) && searchFilter(o)),
        [jobOrders, searchFilter],
    );

    const paidOrders = useMemo(
        () =>
            jobOrders
                .filter(hasSchedule)
                .filter((o) => isPaidInFull(o) && searchFilter(o))
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
        [jobOrders, searchFilter],
    );

    // Active-tab-aware list for row selection (tabs that use JobOrderTable)
    const currentTabOrders = useMemo(() => {
        if (activeTab === 'all') return allOrders;
        if (activeTab === 'queue') return queueOrders;
        if (activeTab === 'online') return onlineApproved;
        if (activeTab === 'walkin') return walkInOrders;
        if (activeTab === 'assignments') return unassignedOrders;
        if (activeTab === 'billing') return billingOrders;
        if (activeTab === 'paid') return paidOrders;
        return [];
    }, [activeTab, allOrders, queueOrders, onlineApproved, walkInOrders, unassignedOrders, billingOrders, paidOrders]);

    // ── Selection management ──────────────────────────────────────────────
    useEffect(() => {
        if (currentTabOrders.length === 0) {
            setSelectedId(0);
            return;
        }
        if (!currentTabOrders.some((o) => o.id === selectedId)) {
            setSelectedId(currentTabOrders[0].id);
        }
    }, [currentTabOrders, selectedId]);

    const selectedOrder = useMemo(() => {
        const exact = currentTabOrders.find((o) => o.id === selectedId);
        return exact ?? currentTabOrders[0] ?? null;
    }, [currentTabOrders, selectedId]);

    useEffect(() => {
        if (currentTabOrders.length > 0) {
            setSelectedId(currentTabOrders[0].id);
        } else {
            setSelectedId(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // ── Actions ───────────────────────────────────────────────────────────
    const handlePrimaryAction = async (action: ReturnType<typeof getPrimaryAction>) => {
        if (!selectedOrder) return;

        if (action === 'start') {
            setShowStartModal(true);
            return;
        }

        if (action === 'settle') {
            if (selectedOrder.balance === 0) {
                setActionError(null);
                setIsProcessingAction(true);
                try {
                    const response = await jobOrderService.settleJobOrder(selectedOrder.id, {
                        invoice_id: selectedOrder.invoice_id ?? null,
                    });
                    upsertJobOrder(response.data);
                } catch (error) {
                    setActionError(error instanceof Error ? error.message : 'Failed to settle job order.');
                } finally {
                    setIsProcessingAction(false);
                }
            } else {
                navigate(`/billing?job_order_id=${selectedOrder.id}`);
            }
            return;
        }

        setActionError(null);
        setIsProcessingAction(true);
        try {
            let response;
            if (action === 'submit') response = await jobOrderService.submitJobOrder(selectedOrder.id);
            else if (action === 'approve') response = await jobOrderService.approveJobOrder(selectedOrder.id);
            else if (action === 'complete') {
                response = await jobOrderService.completeJobOrder(selectedOrder.id);
                if (response?.data) {
                    upsertJobOrder(response.data);
                    // Automatically proceed to billing or settle if zero balance
                    if (response.data.balance === 0) {
                        const settleRes = await jobOrderService.settleJobOrder(response.data.id, {
                            invoice_id: response.data.invoice_id ?? null,
                        });
                        upsertJobOrder(settleRes.data);
                    } else {
                        navigate(`/billing?job_order_id=${response.data.id}`);
                    }
                    return; // Skip the generic upsert at the end since we handled it
                }
            }
            if (response) upsertJobOrder(response.data);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to process action.');
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleCancelJobOrder = async () => {
        if (!selectedOrder) return;
        if (!window.confirm(`Cancel ${selectedOrder.jo_number}? This cannot be undone.`)) return;
        setActionError(null);
        setIsProcessingAction(true);
        try {
            const response = await jobOrderService.cancelJobOrder(selectedOrder.id);
            upsertJobOrder(response.data);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to cancel.');
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleStartService = async (mechanicId: number, bayId: number) => {
        if (!selectedOrder) return;
        const response = await jobOrderService.startJobOrder(selectedOrder.id, {
            mechanic_id: mechanicId,
            bay_id: bayId,
        });
        upsertJobOrder(response.data);
    };

    const handleApproveOrder = async (order: JobOrder) => {
        setIsProcessingAction(true);
        try {
            const response = await jobOrderService.approveJobOrder(order.id);
            upsertJobOrder(response.data);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to approve booking.');
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleRejectOrder = async (order: JobOrder) => {
        if (!window.confirm(`Reject and cancel ${order.jo_number}?`)) return;
        setIsProcessingAction(true);
        try {
            const response = await jobOrderService.cancelJobOrder(order.id);
            upsertJobOrder(response.data);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to reject booking.');
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleWalkInCreated = (orderId: number) => {
        setShowWalkInModal(false);
        loadJobOrders().then(() => {
            setActiveTab('queue');
            setSelectedId(orderId);
        });
    };

    const handleDraftSaved = () => {
        loadJobOrders();
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            actions={
                <>
                    <button
                        onClick={() => loadJobOrders()}
                        className="rounded-lg border border-[#2a2a2e] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowWalkInModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                    >
                        <UserRoundPlus className="h-4 w-4" /> New Walk-in Job Order
                    </button>
                </>
            }
        >
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden">
                    {/* Errors */}
                    {loadError && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{loadError}</div>}
                    {actionError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{actionError}</div>
                    )}

                    {/* Main content: tabs + list + detail */}
                    <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[1.55fr_1fr]">
                        {/* Left panel */}
                        <div className="profile-card flex min-h-0 flex-col rounded-xl p-5">
                            {/* Search */}
                            <div className="relative mb-4 shrink-0">
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    placeholder="Search JO number, customer, plate, or service"
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                />
                            </div>

                            {/* Tabs */}
                            <div className="mb-4 flex shrink-0 flex-wrap gap-1.5">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                            activeTab === tab.key
                                                ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                                                : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                        {tab.key === 'online' && onlinePendingCount > 0 && (
                                            <span className="ml-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                                {onlinePendingCount}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Tab content */}
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading job orders...
                                </div>
                            ) : (
                                <div className="min-h-0 flex-1 overflow-hidden">
                                    {/* All */}
                                    {activeTab === 'all' &&
                                        (allOrders.length === 0 ? (
                                            <div className="px-5 py-16 text-center text-sm text-muted-foreground">No job orders found.</div>
                                        ) : (
                                            <JobOrderTable orders={allOrders} selectedId={selectedId} onSelect={setSelectedId} variant="queue" />
                                        ))}

                                    {/* Active Queue */}
                                    {activeTab === 'queue' &&
                                        (queueOrders.length === 0 ? (
                                            <div className="px-5 py-16 text-center text-sm text-muted-foreground">No active job orders.</div>
                                        ) : (
                                            <JobOrderTable orders={queueOrders} selectedId={selectedId} onSelect={setSelectedId} variant="queue" />
                                        ))}

                                    {/* Online Booking */}
                                    {activeTab === 'online' &&
                                        (onlineOrders.length === 0 ? (
                                            <div className="px-5 py-16 text-center text-sm text-muted-foreground">No online bookings.</div>
                                        ) : (
                                            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
                                                {/* Needs Approval section — at the top */}
                                                {onlinePendingApproval.length > 0 && (
                                                    <div>
                                                        <div className="mb-2 flex items-center gap-2">
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                                                Needs Approval ({onlinePendingApproval.length})
                                                            </span>
                                                        </div>
                                                        <ApprovalQueue
                                                            orders={onlinePendingApproval}
                                                            selectedId={onlinePendingApproval.some((o) => o.id === selectedId) ? selectedId : 0}
                                                            onSelect={setSelectedId}
                                                            onApprove={handleApproveOrder}
                                                            onReject={handleRejectOrder}
                                                            isProcessing={isProcessingAction}
                                                        />
                                                    </div>
                                                )}

                                                {/* Approved online bookings */}
                                                {onlineApproved.length > 0 && (
                                                    <div>
                                                        {onlinePendingApproval.length > 0 && (
                                                            <div className="mb-2 flex items-center gap-2">
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                                                    Approved ({onlineApproved.length})
                                                                </span>
                                                            </div>
                                                        )}
                                                        <JobOrderTable
                                                            orders={onlineApproved}
                                                            selectedId={selectedId}
                                                            onSelect={setSelectedId}
                                                            variant="queue"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                    {/* Walk-in */}
                                    {activeTab === 'walkin' &&
                                        (walkInOrders.length === 0 ? (
                                            <div className="px-5 py-16 text-center text-sm text-muted-foreground">No walk-in job orders.</div>
                                        ) : (
                                            <JobOrderTable orders={walkInOrders} selectedId={selectedId} onSelect={setSelectedId} variant="queue" />
                                        ))}

                                    {/* Assignments */}
                                    {activeTab === 'assignments' &&
                                        (unassignedOrders.length === 0 ? (
                                            <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                                                No approved job orders waiting for assignment.
                                            </div>
                                        ) : (
                                            <JobOrderTable
                                                orders={unassignedOrders}
                                                selectedId={selectedId}
                                                onSelect={setSelectedId}
                                                variant="queue"
                                            />
                                        ))}

                                    {/* Billing */}
                                    {activeTab === 'billing' &&
                                        (billingOrders.length === 0 ? (
                                            <div className="px-5 py-16 text-center text-sm text-muted-foreground">No pending billing.</div>
                                        ) : (
                                            <JobOrderTable
                                                orders={billingOrders}
                                                selectedId={selectedId}
                                                onSelect={(id) => {
                                                    setSelectedId(id);
                                                    navigate(`/billing?job_order_id=${id}`);
                                                }}
                                                variant="billing"
                                            />
                                        ))}

                                    {/* Paid */}
                                    {activeTab === 'paid' &&
                                        (paidOrders.length === 0 ? (
                                            <div className="px-5 py-16 text-center text-sm text-muted-foreground">No settled job orders.</div>
                                        ) : (
                                            <JobOrderTable orders={paidOrders} selectedId={selectedId} onSelect={setSelectedId} variant="paid" />
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* Right detail panel / Assignment Board */}
                        {activeTab === 'assignments' ? (
                            <AssignmentBoard
                                selectedOrder={selectedOrder}
                                allOrders={jobOrders}
                                onAssignmentComplete={() => {
                                    loadJobOrders();
                                    setSelectedId(0);
                                }}
                            />
                        ) : (
                            <JobOrderDetail
                                order={selectedOrder}
                                isProcessingAction={isProcessingAction}
                                onPrimaryAction={handlePrimaryAction}
                                onCancel={handleCancelJobOrder}
                                onItemsChanged={() => loadJobOrders()}
                                onPrepareInvoice={() => setShowDraftModal(true)}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <WalkInModal
                open={showWalkInModal}
                onClose={() => {
                    setShowWalkInModal(false);
                    setWalkInInitialCustomerId(null);
                }}
                onOrderCreated={handleWalkInCreated}
                initialCustomerId={walkInInitialCustomerId}
            />

            {selectedOrder && (
                <StartServiceModal
                    open={showStartModal}
                    onClose={() => setShowStartModal(false)}
                    onStarted={() => {
                        setShowStartModal(false);
                        loadJobOrders();
                    }}
                    onSubmit={handleStartService}
                    scheduling={{
                        arrival_date: selectedOrder.arrival_date,
                        arrival_time: selectedOrder.arrival_time,
                        service_id: selectedOrder.service?.id,
                        job_order_id: selectedOrder.id,
                    }}
                />
            )}

            <InvoiceDraftModal open={showDraftModal} onOpenChange={setShowDraftModal} order={selectedOrder} onDraftSaved={handleDraftSaved} />
        </AppLayout>
    );
}
