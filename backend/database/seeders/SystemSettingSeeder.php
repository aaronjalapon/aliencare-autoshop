<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSettingSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            // Shop settings
            ['key' => 'shop.name', 'value' => env('BILLING_SHOP_NAME', env('APP_NAME', 'AlienCare AutoShop')), 'group' => 'shop', 'type' => 'string', 'label' => 'Shop Name', 'description' => 'Display name used on invoices and receipts.'],
            ['key' => 'shop.address', 'value' => env('BILLING_SHOP_ADDRESS', ''), 'group' => 'shop', 'type' => 'string', 'label' => 'Shop Address', 'description' => 'Address printed on customer-facing documents.'],
            ['key' => 'shop.contact_email', 'value' => '', 'group' => 'shop', 'type' => 'string', 'label' => 'Contact Email', 'description' => 'Public email shown on invoices and shop details.'],
            ['key' => 'shop.contact_phone', 'value' => '', 'group' => 'shop', 'type' => 'string', 'label' => 'Contact Phone', 'description' => 'Public phone number shown on invoices and shop details.'],

            // Payment method toggles
            ['key' => 'payment.cash_enabled', 'value' => 'true', 'group' => 'payment', 'type' => 'boolean', 'label' => 'Cash', 'description' => 'Accept cash payments at the counter.'],
            ['key' => 'payment.xendit_enabled', 'value' => 'true', 'group' => 'payment', 'type' => 'boolean', 'label' => 'Online (Xendit)', 'description' => 'Enable Xendit payment gateway for online invoice payments.'],

            // Invoice defaults
            ['key' => 'invoice.default_notes', 'value' => '', 'group' => 'invoice', 'type' => 'string', 'label' => 'Default Notes', 'description' => 'Default notes appended to every invoice.'],
            ['key' => 'invoice.footer_text', 'value' => 'Thank you for your business!', 'group' => 'invoice', 'type' => 'string', 'label' => 'Footer Text', 'description' => 'Footer line printed at the bottom of invoices and receipts.'],
            ['key' => 'invoice.show_itemized_breakdown', 'value' => 'true', 'group' => 'invoice', 'type' => 'boolean', 'label' => 'Itemized Breakdown', 'description' => 'Show individual line items (parts and labor) on invoices.'],
            ['key' => 'invoice.default_format', 'value' => 'standard', 'group' => 'invoice', 'type' => 'string', 'label' => 'Default Format', 'description' => 'Invoice layout: standard (full details) or simplified (summary only).'],

            // Counter workflow defaults
            ['key' => 'workflow.default_payment_flow', 'value' => 'pay_at_counter', 'group' => 'workflow', 'type' => 'string', 'label' => 'Default Payment Flow', 'description' => 'Whether customers pay at the counter or pay first before service.'],
            ['key' => 'workflow.auto_open_cash_drawer', 'value' => 'true', 'group' => 'workflow', 'type' => 'boolean', 'label' => 'Auto-Open Cash Drawer', 'description' => 'Automatically signal the cash drawer after a cash transaction.'],
            ['key' => 'workflow.require_customer_signature', 'value' => 'false', 'group' => 'workflow', 'type' => 'boolean', 'label' => 'Require Customer Signature', 'description' => 'Prompt for customer signature on digital receipt before finalizing.'],
        ];

        foreach ($defaults as $setting) {
            SystemSetting::updateOrCreate(
                ['key' => $setting['key']],
                [
                    'value' => json_encode($setting['value']),
                    'group' => $setting['group'],
                    'type' => $setting['type'],
                    'label' => $setting['label'],
                    'description' => $setting['description'],
                ],
            );
        }
    }
}
