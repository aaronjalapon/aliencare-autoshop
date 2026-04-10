<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Xendit API Keys
    |--------------------------------------------------------------------------
    |
    | The secret key is used for server-side API calls. The public key is used
    | for client-side integrations. Both can be obtained from your Xendit
    | dashboard at https://dashboard.xendit.co/settings/developers.
    |
    */
    'secret_key' => env('XENDIT_SECRET_KEY', ''),

    'public_key' => env('XENDIT_PUBLIC_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | Xendit Webhook Token
    |--------------------------------------------------------------------------
    |
    | This token is used to verify that incoming webhook requests originate
    | from Xendit. Set this to the value found in your Xendit webhook settings.
    |
    */
    'webhook_token' => env('XENDIT_WEBHOOK_TOKEN', ''),

    /*
    |--------------------------------------------------------------------------
    | Callback / Redirect URLs
    |--------------------------------------------------------------------------
    */
    'callback_url' => env('XENDIT_CALLBACK_URL', env('APP_URL').'/api/v1/payments/webhook'),

    'success_redirect_url' => env('XENDIT_SUCCESS_REDIRECT_URL', env('FRONTEND_URL', 'http://localhost:5173').'/customer/billing?payment=success'),

    'failure_redirect_url' => env('XENDIT_FAILURE_REDIRECT_URL', env('FRONTEND_URL', 'http://localhost:5173').'/customer/billing?payment=failed'),

    // Reservation-specific redirect URLs after payment
    'reservation_success_redirect_url' => env('XENDIT_RESERVATION_SUCCESS_REDIRECT_URL', env('FRONTEND_URL', 'http://localhost:5173').'/customer/reservations?payment=success'),

    'reservation_failure_redirect_url' => env('XENDIT_RESERVATION_FAILURE_REDIRECT_URL', env('FRONTEND_URL', 'http://localhost:5173').'/customer/reservations?payment=failed'),
];
