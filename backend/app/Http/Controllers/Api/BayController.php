<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Services\JobOrderServiceInterface;
use App\Http\Controllers\Controller;
use App\Models\Bay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class BayController extends Controller
{
    public function __construct(
        private JobOrderServiceInterface $jobOrderService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('manage-job-orders');

        $query = Bay::query();

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $arrivalDate = $request->query('arrival_date');
        $arrivalTime = $request->query('arrival_time');
        $excludeJobOrderId = $request->query('exclude_job_order_id');

        $withScheduling = $arrivalDate && $arrivalTime;

        $bays = $query->orderBy('name')->get()->map(function (Bay $bay) use ($withScheduling, $arrivalDate, $arrivalTime, $excludeJobOrderId): array {
            $data = [
                'id' => $bay->id,
                'name' => $bay->name,
                'status' => $bay->status,
            ];

            if ($withScheduling) {
                $data['has_time_conflict'] = ! $this->jobOrderService->isBayAvailableAt(
                    $bay->id,
                    $arrivalDate,
                    $arrivalTime,
                    $excludeJobOrderId ? (int) $excludeJobOrderId : null
                );
            }

            return $data;
        });

        // Sort: no time conflict first, then available status first, then by name
        if ($withScheduling) {
            $bays = $bays->sortBy([
                ['has_time_conflict', 'asc'],
                ['status', 'asc'],
                ['name', 'asc'],
            ])->values();
        }

        return response()->json([
            'success' => true,
            'data' => $bays,
        ]);
    }
}
