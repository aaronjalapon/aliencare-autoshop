<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Contracts\Repositories\ReportRepositoryInterface;
use App\Models\Report;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Eloquent implementation of the Report Repository.
 */
class ReportRepository extends BaseRepository implements ReportRepositoryInterface
{
    /**
     * Create a new report repository instance.
     */
    public function __construct(Report $model)
    {
        parent::__construct($model);
    }

    /**
     * {@inheritDoc}
     */
    public function findById(int|string $id): ?Report
    {
        return $this->model->find($id);
    }

    /**
     * {@inheritDoc}
     */
    public function findByIdOrFail(int|string $id): Report
    {
        return $this->model->findOrFail($id);
    }

    /**
     * {@inheritDoc}
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->newQuery();

        if (isset($filters['report_type'])) {
            $query->where('report_type', $filters['report_type']);
        }

        if (isset($filters['start_date'])) {
            $query->whereDate('report_date', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->whereDate('report_date', '<=', $filters['end_date']);
        }

        if (isset($filters['generated_by'])) {
            $query->where('generated_by', $filters['generated_by']);
        }

        return $query->orderBy('generated_date', 'desc')->paginate($perPage);
    }

    /**
     * {@inheritDoc}
     */
    public function create(array $data): Report
    {
        return $this->model->create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function findByTypeAndDate(string $reportType, string $reportDate): ?Report
    {
        return $this->model
            ->where('report_type', $reportType)
            ->whereDate('report_date', $reportDate)
            ->first();
    }
}
