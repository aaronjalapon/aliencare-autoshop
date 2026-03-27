<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Inventory Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration values for the inventory management system including
    | forecasting parameters, thresholds, and default settings.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Forecasting Settings
    |--------------------------------------------------------------------------
    */

    // Number of historical days to use for demand forecasting
    'forecast_historical_days' => env('INVENTORY_FORECAST_DAYS', 90),

    // Default forecast period in days
    'default_forecast_period' => env('INVENTORY_FORECAST_PERIOD', 30),

    // Confidence divisor for forecast calculations (transactions per month baseline)
    'forecast_confidence_divisor' => 30,

    /*
    |--------------------------------------------------------------------------
    | Stock Management Settings
    |--------------------------------------------------------------------------
    */

    // Buffer multiplier for reorder quantity recommendations (e.g., 1.2 = 20% buffer)
    'reorder_buffer_multiplier' => env('INVENTORY_REORDER_BUFFER', 1.2),

    // Default number of days before expiry to trigger alerts
    'expiring_soon_days' => env('INVENTORY_EXPIRING_DAYS', 3),

    // Default reservation expiry in days
    'default_reservation_expiry_days' => env('INVENTORY_RESERVATION_EXPIRY', 7),

    /*
    |--------------------------------------------------------------------------
    | Pagination Settings
    |--------------------------------------------------------------------------
    */

    // Default items per page for inventory listings
    'default_per_page' => 15,

    // Maximum items per page
    'max_per_page' => 100,

    /*
    |--------------------------------------------------------------------------
    | Alert Settings
    |--------------------------------------------------------------------------
    */

    // Days after which acknowledged alerts can be cleaned up
    'alert_cleanup_days' => env('INVENTORY_ALERT_CLEANUP_DAYS', 30),

    // Maximum number of alerts to display on dashboard
    'dashboard_alert_limit' => 10,

    /*
    |--------------------------------------------------------------------------
    | Transaction Types
    |--------------------------------------------------------------------------
    |
    | Valid transaction types for stock adjustments. These should match
    | the TransactionType enum values.
    |
    */

    'transaction_types' => [
        'sale',
        'procurement',
        'reservation',
        'return',
        'damage',
        'adjustment_in',
        'adjustment_out',
    ],

    // Transaction types that trigger low stock alert checks
    'alert_triggering_transactions' => [
        'sale',
        'damage',
        'reservation',
    ],

    /*
    |--------------------------------------------------------------------------
    | Report Settings
    |--------------------------------------------------------------------------
    */

    // Top items limit for analytics reports
    'top_items_limit' => 10,

    // Top moving items limit for usage analytics
    'top_moving_items_limit' => 20,

    /*
    |--------------------------------------------------------------------------
    | Security Settings
    |--------------------------------------------------------------------------
    |
    | Sensitive endpoints (archives, transactions, reports) require users to be
    | authenticated and email-verified. Optionally restrict further using user
    | IDs or emails via environment variables.
    |
    */

    'security' => [
        // When true, only allowlisted users can access sensitive endpoints.
        // When false, any authenticated + verified user is allowed.
        'restrict_sensitive_endpoints' => (bool) env('INVENTORY_RESTRICT_SENSITIVE_ENDPOINTS', false),

        // Comma-separated allowlists (e.g. "1,2,3" and "admin@example.com").
        'sensitive_user_ids' => array_values(array_filter(array_map(
            static fn ($id): int => (int) trim((string) $id),
            explode(',', (string) env('INVENTORY_SENSITIVE_USER_IDS', ''))
        ))),
        'sensitive_user_emails' => array_values(array_filter(array_map(
            static fn ($email): string => strtolower(trim((string) $email)),
            explode(',', (string) env('INVENTORY_SENSITIVE_USER_EMAILS', ''))
        ))),
    ],
];
