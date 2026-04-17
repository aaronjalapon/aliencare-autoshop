<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Customer;
use App\Models\CustomerTransaction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface CustomerRepositoryInterface
{
    public function findById(int|string $id): ?Customer;

    public function findByEmail(string $email): ?Customer;

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

    /**
     * @param  array<string, mixed>  $data
     */
    public function registerCustomer(array $data): Customer;

    public function approveAccount(int $customerId, int $approvedBy): Customer;

    public function rejectAccount(int $customerId, string $reason): void;

    public function softDelete(int $customerId): void;

    /**
     * @param  array<string, mixed>  $data
     */
    public function updatePersonalInfo(int $customerId, array $data): Customer;

    /**
     * @param  array<string, mixed>  $filters
     */
    public function getAuditLog(int $customerId, array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $filters
     */
    public function getTransactions(int $customerId, array $filters = [], int $perPage = 15): LengthAwarePaginator;

    public function findTransactionForCustomer(int $customerId, int $transactionId): ?CustomerTransaction;

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateTransaction(int $customerId, int $transactionId, array $data): CustomerTransaction;

    /**
     * @return array<string, mixed>
     */
    public function getBillingSummary(int $customerId): array;

    /**
     * @param  array<string, mixed>  $filters
     */
    public function getBillingReceipts(int $customerId, array $filters = [], int $perPage = 15): LengthAwarePaginator;

    public function getBillingReceiptDetail(int $customerId, int $transactionId): ?CustomerTransaction;

    /**
     * @param  array<string, mixed>  $data
     */
    public function linkTransaction(int $customerId, array $data): CustomerTransaction;

    public function findPendingAccounts(int $perPage = 15): LengthAwarePaginator;
}
