<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Customer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface CustomerRepositoryInterface
{
    public function findById(int|string $id): ?Customer;

    public function findByIdOrFail(int|string $id): Customer;

    /**
     * @param  array<string, mixed>  $filters
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Customer;

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(int|string $id, array $data): Customer;
}
