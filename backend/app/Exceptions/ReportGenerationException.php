<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Exception thrown when report generation fails.
 */
class ReportGenerationException extends Exception
{
    /**
     * The type of report that failed to generate.
     */
    protected string $reportType;

    /**
     * Additional context about the failure.
     */
    protected ?array $context;

    /**
     * Create a new exception instance.
     *
     * @param string $reportType The type of report
     * @param string|null $message Custom error message
     * @param array|null $context Additional context about the failure
     * @param int $code HTTP status code
     * @param \Throwable|null $previous Previous exception
     */
    public function __construct(
        string $reportType,
        ?string $message = null,
        ?array $context = null,
        int $code = 500,
        ?\Throwable $previous = null
    ) {
        $this->reportType = $reportType;
        $this->context = $context;

        $message = $message ?? "Failed to generate {$reportType} report";

        parent::__construct($message, $code, $previous);
    }

    /**
     * Get the report type.
     */
    public function getReportType(): string
    {
        return $this->reportType;
    }

    /**
     * Get the context.
     */
    public function getContext(): ?array
    {
        return $this->context;
    }

    /**
     * Get the HTTP status code for this exception.
     */
    public function getStatusCode(): int
    {
        return 500;
    }

    /**
     * Render the exception as an HTTP response.
     */
    public function render(): \Illuminate\Http\JsonResponse
    {
        $response = [
            'success' => false,
            'error' => 'report_generation_failed',
            'message' => $this->getMessage(),
            'report_type' => $this->reportType,
        ];

        if ($this->context !== null) {
            $response['context'] = $this->context;
        }

        return response()->json($response, $this->getStatusCode());
    }
}
