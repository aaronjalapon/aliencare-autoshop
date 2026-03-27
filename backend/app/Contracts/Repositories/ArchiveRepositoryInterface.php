<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Archive;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

/**
 * Interface for Archive Repository operations.
 *
 * Defines the contract for archive (audit log) data access including
 * CRUD operations, filtering, and entity-specific queries.
 */
interface ArchiveRepositoryInterface
{
    /**
     * Find an archive entry by its ID.
     *
     * @param  int  $id  The unique identifier for the archive entry
     */
    public function findById(int|string $id): ?Archive;

    /**
     * Find an archive entry by ID or throw an exception.
     *
     * @param  int  $id  The unique identifier for the archive entry
     *
     * @throws ModelNotFoundException
     */
    public function findByIdOrFail(int|string $id): Archive;

    /**
     * Get paginated archive entries with optional filters.
     *
     * @param array{
     *     entity_type?: string,
     *     entity_id?: int,
     *     action?: string,
     *     user_id?: string,
     *     start_date?: string,
     *     end_date?: string
     * } $filters Optional filters to apply
     * @param  int  $perPage  Number of items per page
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Create a new archive entry.
     *
     * @param  array<string, mixed>  $data  The archive entry data
     */
    public function create(array $data): Archive;

    /**
     * Get all archive entries for a specific entity.
     *
     * @param  string  $entityType  The type of entity (inventory, reservation, etc.)
     * @param  int  $entityId  The entity ID
     */
    public function getByEntity(string $entityType, int $entityId): Collection;

    /**
     * Get archive entries by action type.
     *
     * @param  string  $action  The action type (created, updated, deleted, etc.)
     */
    public function getByAction(string $action): Collection;
}
