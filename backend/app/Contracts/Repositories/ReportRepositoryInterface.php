<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Report;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Interface for Report Repository operations.
 *
 * Defines the contract for report data access including CRUD operations
 * and filtering by type and date.
 */
interface ReportRepositoryInterface
{
    /**
     * Find a report by its ID.
     *
     * @param int $id The unique identifier for the report
     */
    public function findById(int|string $id): ?Report;

    /**
     * Find a report by ID or throw an exception.
     *
     * @param int $id The unique identifier for the report
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function findByIdOrFail(int|string $id): Report;

    /**
     * Get paginated reports with optional filters.
     *
     * @param array{
     *     report_type?: string,
     *     start_date?: string,
     *     end_date?: string,
     *     generated_by?: string
     * } $filters Optional filters to apply
     * @param int $perPage Number of items per page
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Create a new report.
     *
     * @param array<string, mixed> $data The report data
     */
    public function create(array $data): Report;

    /**
     * Find an existing report for a specific date and type.
     *
     * @param string $reportType The type of report
     * @param string $reportDate The date of the report
     */
    public function findByTypeAndDate(string $reportType, string $reportDate): ?Report;
}
