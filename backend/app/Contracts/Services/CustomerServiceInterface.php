<?php

declare(strict_types=1);

namespace App\Contracts\Services;

use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface CustomerServiceInterface
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function register(array $data): Customer;

    public function approve(int $customerId, int $approvedBy): Customer;

    public function reject(int $customerId, int $rejectedBy, string $reason): void;

    public function requestDeletion(int $customerId, int $requestedBy, ?string $ip = null): void;

    public function delete(int $customerId, int $deletedBy, ?string $ip = null): void;

    /**
     * @param  array<string, mixed>  $data
     */
    public function updatePersonalInfo(int $customerId, array $data, int $userId, ?string $ip = null): Customer;

    /**
     * @param  array<string, mixed>  $data
     */
    public function completeOnboarding(User $user, array $data, ?string $ip = null): Customer;

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateSpecialInfo(int $customerId, array $data, int $userId, ?string $ip = null): Customer;

    /**
     * @param  array<string, mixed>  $filters
     */
    public function getAuditLog(int $customerId, array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $filters
     */
    public function getTransactions(int $customerId, array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $data
     */
    public function linkTransaction(int $customerId, array $data): CustomerTransaction;
}
