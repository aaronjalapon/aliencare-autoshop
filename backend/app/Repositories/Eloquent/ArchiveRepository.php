<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Contracts\Repositories\ArchiveRepositoryInterface;
use App\Models\Archive;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Eloquent implementation of the Archive Repository.
 */
class ArchiveRepository extends BaseRepository implements ArchiveRepositoryInterface
{
    /**
     * Create a new archive repository instance.
     */
    public function __construct(Archive $model)
    {
        parent::__construct($model);
    }

    /**
     * {@inheritDoc}
     */
    public function findById(int|string $id): ?Archive
    {
        return $this->model->find($id);
    }

    /**
     * {@inheritDoc}
     */
    public function findByIdOrFail(int|string $id): Archive
    {
        return $this->model->findOrFail($id);
    }

    /**
     * {@inheritDoc}
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->newQuery();

        if (isset($filters['entity_type'])) {
            $query->where('entity_type', $filters['entity_type']);
        }

        if (isset($filters['entity_id'])) {
            $query->where('entity_id', $filters['entity_id']);
        }

        if (isset($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (isset($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (isset($filters['start_date'])) {
            $query->whereDate('archived_date', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->whereDate('archived_date', '<=', $filters['end_date']);
        }

        return $query->orderBy('archived_date', 'desc')->paginate($perPage);
    }

    /**
     * {@inheritDoc}
     */
    public function create(array $data): Archive
    {
        return $this->model->create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function getByEntity(string $entityType, int $entityId): Collection
    {
        return $this->model
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->orderBy('archived_date', 'desc')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getByAction(string $action): Collection
    {
        return $this->model
            ->where('action', $action)
            ->orderBy('archived_date', 'desc')
            ->get();
    }
}
