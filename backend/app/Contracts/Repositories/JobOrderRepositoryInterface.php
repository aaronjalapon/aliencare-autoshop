<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\JobOrder;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface JobOrderRepositoryInterface
{
    public function findById(int|string $id): ?JobOrder;

    public function findByIdOrFail(int|string $id): JobOrder;

    public function findByJoNumber(string $joNumber): ?JobOrder;

    /**
     * @param  array<string, mixed>  $filters
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): JobOrder;

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(int|string $id, array $data): JobOrder;

    public function delete(int|string $id): bool;
}
