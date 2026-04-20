<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\CustomerTransactionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Customer\GetBillingQueueRequest;
use App\Http\Resources\BillingQueueItemResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class BillingQueueController extends Controller
{
    public function index(GetBillingQueueRequest $request): JsonResponse
    {
        Gate::authorize('manage-pos');

        $validated = $request->validated();
        $perPage = (int) ($validated['per_page'] ?? 15);
        $search = trim((string) ($validated['search'] ?? ''));
        $sourceFilter = strtolower(trim((string) ($validated['source'] ?? 'all')));
        $statusFilter = strtolower(trim((string) ($validated['status'] ?? 'all')));

        $serviceSourceExpr = "CASE WHEN EXISTS (
            SELECT 1 FROM reservations r WHERE r.job_order_id = job_orders.id
        ) THEN 'online_booking' ELSE 'walk_in' END";

        $serviceSubtotalExpr = '(
            COALESCE(job_orders.service_fee, 0)
            + COALESCE((
                SELECT SUM(joi.total_price)
                FROM job_order_items joi
                WHERE joi.job_order_id = job_orders.id
            ), 0)
        )';

        $servicePaidExpr = "COALESCE((
            SELECT SUM(ABS(ct.amount))
            FROM customer_transactions ct
            WHERE ct.job_order_id = job_orders.id
              AND (
                    (
                        ct.type IN ('invoice', 'reservation_fee')
                        AND ct.xendit_status = 'PAID'
                    )
                    OR
                    (
                        ct.type = 'payment'
                        AND (
                            ct.xendit_status IS NULL
                            OR ct.xendit_status = 'PAID'
                            OR ct.paid_at IS NOT NULL
                        )
                    )
                )
        ), 0)";

        $serviceBalanceExpr = "CASE
            WHEN (($serviceSubtotalExpr) - ($servicePaidExpr)) <= 0 THEN 0
            ELSE ROUND((($serviceSubtotalExpr) - ($servicePaidExpr)), 2)
        END";

        $serviceStatusExpr = "CASE
            WHEN (($serviceSubtotalExpr) - ($servicePaidExpr)) <= 0 THEN 'paid'
            WHEN ($servicePaidExpr) > 0 THEN 'partial'
            ELSE 'pending'
        END";

        $serviceRows = DB::table('job_orders')
            ->leftJoin('customers', 'customers.id', '=', 'job_orders.customer_id')
            ->leftJoin('vehicles', 'vehicles.id', '=', 'job_orders.vehicle_id')
            ->leftJoin('users as advisors', 'advisors.id', '=', 'job_orders.approved_by')
            ->selectRaw("'job_order' as entity_type")
            ->selectRaw('job_orders.id as entity_id')
            ->selectRaw('job_orders.customer_id as customer_id')
            ->selectRaw('customers.first_name as customer_first_name')
            ->selectRaw('customers.last_name as customer_last_name')
            ->selectRaw('customers.phone_number as customer_phone')
            ->selectRaw("$serviceSourceExpr as source")
            ->selectRaw("'service' as kind")
            ->selectRaw('job_orders.jo_number as invoice_no')
            ->selectRaw('job_orders.id as job_order_id')
            ->selectRaw('job_orders.jo_number as job_order_no')
            ->selectRaw('NULL as pos_reference')
            ->selectRaw('vehicles.make as vehicle_make')
            ->selectRaw('vehicles.model as vehicle_model')
            ->selectRaw('vehicles.year as vehicle_year')
            ->selectRaw('vehicles.plate_number as plate_number')
            ->selectRaw('advisors.name as service_advisor')
            ->selectRaw("'Settle full amount before vehicle release' as payment_terms")
            ->selectRaw('job_orders.notes as notes')
            ->selectRaw('job_orders.created_at as created_at')
            ->selectRaw('COALESCE(job_orders.reservation_expires_at, job_orders.created_at) as due_at')
            ->selectRaw("ROUND(($serviceSubtotalExpr), 2) as subtotal")
            ->selectRaw("ROUND(($servicePaidExpr), 2) as paid_total")
            ->selectRaw("$serviceBalanceExpr as balance")
            ->selectRaw("$serviceStatusExpr as status");

        $posSubtotalExpr = 'ABS(customer_transactions.amount)';

        $posPaidExpr = "(
            CASE
                WHEN customer_transactions.xendit_status = 'PAID' THEN ABS(customer_transactions.amount)
                ELSE 0
            END
            + COALESCE((
                SELECT SUM(ABS(p.amount))
                FROM customer_transactions p
                WHERE p.customer_id = customer_transactions.customer_id
                  AND p.type = 'payment'
                  AND p.reference_number = customer_transactions.reference_number
                  AND (
                        p.xendit_status IS NULL
                        OR p.xendit_status = 'PAID'
                        OR p.paid_at IS NOT NULL
                    )
            ), 0)
        )";

        $posBalanceExpr = "CASE
            WHEN (($posSubtotalExpr) - ($posPaidExpr)) <= 0 THEN 0
            ELSE ROUND((($posSubtotalExpr) - ($posPaidExpr)), 2)
        END";

        $posStatusExpr = "CASE
            WHEN (($posSubtotalExpr) - ($posPaidExpr)) <= 0 THEN 'paid'
            WHEN ($posPaidExpr) > 0 THEN 'partial'
            ELSE 'pending'
        END";

        $posRows = DB::table('customer_transactions')
            ->leftJoin('customers', 'customers.id', '=', 'customer_transactions.customer_id')
            ->selectRaw("'pos_transaction' as entity_type")
            ->selectRaw('customer_transactions.id as entity_id')
            ->selectRaw('customer_transactions.customer_id as customer_id')
            ->selectRaw('customers.first_name as customer_first_name')
            ->selectRaw('customers.last_name as customer_last_name')
            ->selectRaw('customers.phone_number as customer_phone')
            ->selectRaw("'walk_in' as source")
            ->selectRaw("'retail' as kind")
            ->selectRaw('customer_transactions.reference_number as invoice_no')
            ->selectRaw('NULL as job_order_id')
            ->selectRaw('NULL as job_order_no')
            ->selectRaw('customer_transactions.reference_number as pos_reference')
            ->selectRaw('NULL as vehicle_make')
            ->selectRaw('NULL as vehicle_model')
            ->selectRaw('NULL as vehicle_year')
            ->selectRaw('NULL as plate_number')
            ->selectRaw('NULL as service_advisor')
            ->selectRaw("'Immediate POS settlement' as payment_terms")
            ->selectRaw('customer_transactions.notes as notes')
            ->selectRaw('customer_transactions.created_at as created_at')
            ->selectRaw('customer_transactions.created_at as due_at')
            ->selectRaw("ROUND(($posSubtotalExpr), 2) as subtotal")
            ->selectRaw("ROUND(($posPaidExpr), 2) as paid_total")
            ->selectRaw("$posBalanceExpr as balance")
            ->selectRaw("$posStatusExpr as status")
            ->where('customer_transactions.type', CustomerTransactionType::Invoice->value)
            ->whereNotNull('customer_transactions.reference_number')
            ->where('customer_transactions.reference_number', 'like', 'POS-%');

        $queueQuery = DB::query()->fromSub($serviceRows->unionAll($posRows), 'billing_queue');

        if ($sourceFilter !== '' && $sourceFilter !== 'all') {
            if (in_array($sourceFilter, ['online', 'online_booking'], true)) {
                $queueQuery->where('source', 'online_booking');
            }

            if (in_array($sourceFilter, ['walkin', 'walk_in'], true)) {
                $queueQuery->where('source', 'walk_in');
            }
        }

        if ($statusFilter !== '' && $statusFilter !== 'all') {
            $queueQuery->where('status', $statusFilter);
        }

        if ($search !== '') {
            $queueQuery->where(function ($searchQuery) use ($search): void {
                $searchQuery->where('invoice_no', 'like', "%{$search}%")
                    ->orWhere('job_order_no', 'like', "%{$search}%")
                    ->orWhere('pos_reference', 'like', "%{$search}%")
                    ->orWhere('customer_first_name', 'like', "%{$search}%")
                    ->orWhere('customer_last_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhere('plate_number', 'like', "%{$search}%")
                    ->orWhere('vehicle_make', 'like', "%{$search}%")
                    ->orWhere('vehicle_model', 'like', "%{$search}%");
            });
        }

        $queue = $queueQuery
            ->orderByDesc('created_at')
            ->orderByDesc('entity_id')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => BillingQueueItemResource::collection($queue)->response()->getData(),
        ]);
    }
}
