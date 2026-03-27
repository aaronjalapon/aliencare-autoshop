<?php

declare(strict_types=1);

namespace App\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Abstract base repository implementing common CRUD operations.
 *
 * This class provides a foundation for repository implementations
 * with common database operations that can be extended by specific repositories.
 */
abstract class BaseRepository
{
    /**
     * Create a new repository instance.
     *
     * @param  Model  $model  The Eloquent model instance
     */
    public function __construct(
        protected Model $model
    ) {}

    /**
     * Get the primary key name for the model.
     */
    protected function getKeyName(): string
    {
        return $this->model->getKeyName();
    }

    /**
     * Find a record by its primary key.
     *
     * @param  int|string  $id  The primary key value
     */
    public function findById(int|string $id): ?Model
    {
        return $this->model->find($id);
    }

    /**
     * Find a record by its primary key or throw an exception.
     *
     * @param  int|string  $id  The primary key value
     *
     * @throws ModelNotFoundException
     */
    public function findByIdOrFail(int|string $id): Model
    {
        return $this->model->findOrFail($id);
    }

    /**
     * Get paginated records.
     *
     * @param  int  $perPage  Number of records per page
     */
    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->newQuery()->paginate($perPage);
    }

    /**
     * Create a new record.
     *
     * @param  array<string, mixed>  $data  The data to create the record with
     */
    public function create(array $data): Model
    {
        return $this->model->create($data);
    }

    /**
     * Update an existing record.
     *
     * @param  int|string  $id  The primary key value
     * @param  array<string, mixed>  $data  The data to update
     *
     * @throws ModelNotFoundException
     */
    public function update(int|string $id, array $data): Model
    {
        $record = $this->findByIdOrFail($id);
        $record->update($data);

        return $record->fresh();
    }

    /**
     * Delete a record.
     *
     * @param  int|string  $id  The primary key value
     *
     * @throws ModelNotFoundException
     */
    public function delete(int|string $id): bool
    {
        return (bool) $this->findByIdOrFail($id)->delete();
    }

    /**
     * Get the underlying model instance.
     */
    public function getModel(): Model
    {
        return $this->model;
    }

    /**
     * Create a new query builder instance.
     *
     * @return Builder
     */
    protected function newQuery()
    {
        return $this->model->newQuery();
    }
}
