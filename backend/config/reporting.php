<?php

declare(strict_types=1);

return [
    'brand' => [
        'company_name' => env('REPORT_COMPANY_NAME', 'Alien Care Auto Shop'),
        'address_line_1' => env('REPORT_COMPANY_ADDRESS_LINE_1', '123 Main Street'),
        'address_line_2' => env('REPORT_COMPANY_ADDRESS_LINE_2', 'City, Province, 1000'),
        'contact_phone' => env('REPORT_COMPANY_PHONE', '+63 900 000 0000'),
        'contact_email' => env('REPORT_COMPANY_EMAIL', 'support@aliencare.com'),
        'website' => env('REPORT_COMPANY_WEBSITE', 'www.aliencare.com'),
        'tax_id' => env('REPORT_COMPANY_TAX_ID', 'TIN-000-000-000'),
        'logo_path' => env('REPORT_COMPANY_LOGO_PATH', 'images/WORD LOGO.jpg'),
    ],
    'formatting' => [
        'currency' => env('REPORT_CURRENCY', 'PHP'),
        'date_format' => env('REPORT_DATE_FORMAT', 'Y-m-d'),
        'datetime_format' => env('REPORT_DATETIME_FORMAT', 'Y-m-d H:i'),
    ],
];
