<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Services\JobOrderServiceInterface;
use App\Http\Controllers\Controller;
use App\Models\Mechanic;
use App\Models\ServiceCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MechanicController extends Controller
{
    public function __construct(
        private JobOrderServiceInterface $jobOrderService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('manage-job-orders');

        $query = Mechanic::with('user');

        if ($request->has('availability_status')) {
            $query->where('availability_status', $request->input('availability_status'));
        }

        $arrivalDate = $request->query('arrival_date');
        $arrivalTime = $request->query('arrival_time');
        $serviceId = $request->query('service_id');
        $excludeJobOrderId = $request->query('exclude_job_order_id');

        $withScheduling = $arrivalDate && $arrivalTime;

        $service = null;
        if ($withScheduling && $serviceId) {
            $service = ServiceCatalog::find($serviceId);
        }

        $mechanics = $query->get()->map(function (Mechanic $mechanic) use ($withScheduling, $arrivalDate, $arrivalTime, $service, $excludeJobOrderId): array {
            $data = [
                'id' => $mechanic->id,
                'user_id' => $mechanic->user_id,
                'name' => $mechanic->user?->name,
                'specialization' => $mechanic->specialization,
                'availability_status' => $mechanic->availability_status,
            ];

            if ($withScheduling) {
                $data['has_time_conflict'] = ! $this->jobOrderService->isMechanicAvailableAt(
                    $mechanic->id,
                    $arrivalDate,
                    $arrivalTime,
                    $excludeJobOrderId ? (int) $excludeJobOrderId : null
                );
                $data['service_match_score'] = $this->jobOrderService->getMechanicServiceMatchScore($mechanic, $service);
            }

            return $data;
        });

        // Sort: no time conflict first, then by service match score (desc), then by name
        if ($withScheduling) {
            $mechanics = $mechanics->sortBy([
                ['has_time_conflict', 'asc'],
                ['service_match_score', 'desc'],
                ['name', 'asc'],
            ])->values();
        }

        return response()->json([
            'success' => true,
            'data' => $mechanics,
        ]);
    }
}
