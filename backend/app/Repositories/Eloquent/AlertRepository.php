<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Contracts\Repositories\AlertRepositoryInterface;
use App\Models\Alert;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Eloquent implementation of the Alert Repository.
 */
class AlertRepository extends BaseRepository implements AlertRepositoryInterface
{
    /**
     * Create a new alert repository instance.
     */
    public function __construct(Alert $model)
    {
        parent::__construct($model);
    }

    /**
     * {@inheritDoc}
     */
    public function findById(int|string $id): ?Alert
    {
        return $this->model->find($id);
    }

    /**
     * {@inheritDoc}
     */
    public function findByIdOrFail(int|string $id): Alert
    {
        return $this->model->findOrFail($id);
    }

    /**
     * {@inheritDoc}
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->with('inventory');

        if (isset($filters['acknowledged'])) {
            $query->where('acknowledged', $filters['acknowledged']);
        }

        if (isset($filters['urgency'])) {
            $query->where('urgency', $filters['urgency']);
        }

        if (isset($filters['alert_type'])) {
            $query->where('alert_type', $filters['alert_type']);
        }

        if (isset($filters['item_id'])) {
            $query->where('item_id', $filters['item_id']);
        }

        return $query->orderByRaw("CASE urgency
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5 END")
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * {@inheritDoc}
     */
    public function create(array $data): Alert
    {
        return $this->model->create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function update(int|string $id, array $data): Alert
    {
        $alert = $this->findByIdOrFail($id);
        $alert->update($data);

        return $alert->fresh();
    }

    /**
     * {@inheritDoc}
     */
    public function getUnacknowledged(): Collection
    {
        return $this->model
            ->where('acknowledged', false)
            ->with('inventory')
            ->orderByRaw("CASE urgency
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5 END")
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getByUrgency(string $urgency): Collection
    {
        return $this->model
            ->where('urgency', $urgency)
            ->with('inventory')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function findExistingLowStockAlert(int $itemId): ?Alert
    {
        return $this->model
            ->where('item_id', $itemId)
            ->where('alert_type', 'low_stock')
            ->where('acknowledged', false)
            ->first();
    }

    /**
     * {@inheritDoc}
     */
    public function bulkAcknowledge(array $ids, string $acknowledgedBy): int
    {
        return $this->model
            ->whereIn('id', $ids)
            ->where('acknowledged', false)
            ->update([
                'acknowledged' => true,
                'acknowledged_by' => $acknowledgedBy,
                'acknowledged_at' => now(),
            ]);
    }

    /**
     * {@inheritDoc}
     */
    public function cleanupOldAlerts(int $daysOld): int
    {
        return $this->model
            ->where('acknowledged', true)
            ->where('acknowledged_at', '<', now()->subDays($daysOld))
            ->delete();
    }

    /**
     * {@inheritDoc}
     */
    public function getStatistics(): array
    {
        $total = $this->model->count();
        $unacknowledged = $this->model->where('acknowledged', false)->count();
        $acknowledged = $total - $unacknowledged;
        $critical = $this->model->where('urgency', 'critical')->where('acknowledged', false)->count();
        $high = $this->model->where('urgency', 'high')->where('acknowledged', false)->count();

        $byUrgency = $this->model
            ->where('acknowledged', false)
            ->selectRaw('urgency, COUNT(*) as count')
            ->groupBy('urgency')
            ->pluck('count', 'urgency')
            ->toArray();

        $byType = $this->model
            ->selectRaw('alert_type, COUNT(*) as count')
            ->groupBy('alert_type')
            ->pluck('count', 'alert_type')
            ->toArray();

        return [
            'total_alerts' => $total,
            'unacknowledged_alerts' => $unacknowledged,
            'acknowledged_alerts' => $acknowledged,
            'critical_alerts' => $critical,
            'high_priority_alerts' => $high,
            'alerts_by_urgency' => [
                'critical' => $byUrgency['critical'] ?? 0,
                'high' => $byUrgency['high'] ?? 0,
                'medium' => $byUrgency['medium'] ?? 0,
                'low' => $byUrgency['low'] ?? 0,
            ],
            'alerts_by_type' => $byType,
        ];
    }
}
