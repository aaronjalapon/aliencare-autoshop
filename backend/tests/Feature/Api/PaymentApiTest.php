<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Exceptions\PaymentGatewayException;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use App\Models\Reservation;
use App\Models\User;
use App\Services\XenditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Customer $customer;

    private Customer $otherCustomer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'customer',
        ]);

        $this->customer = Customer::factory()->create([
            'email' => $this->user->email,
        ]);

        $this->otherCustomer = Customer::factory()->create();
    }

    public function test_customer_can_create_invoice_for_pending_invoice_transaction(): void
    {
        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1200,
            'xendit_status' => null,
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')
                ->once()
                ->andReturnUsing(function (CustomerTransaction $transaction): string {
                    $url = 'https://checkout.xendit.co/inv-test-invoice';

                    $transaction->update([
                        'payment_url' => $url,
                        'xendit_status' => 'PENDING',
                    ]);

                    return $url;
                });
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/payments/'.$transaction->id.'/invoice')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_url', 'https://checkout.xendit.co/inv-test-invoice');
    }

    public function test_customer_can_create_invoice_for_pending_reservation_fee_transaction(): void
    {
        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'reservation_fee',
            'amount' => 350,
            'xendit_status' => null,
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')
                ->once()
                ->andReturnUsing(function (CustomerTransaction $transaction): string {
                    $url = 'https://checkout.xendit.co/inv-test-reservation-fee';

                    $transaction->update([
                        'payment_url' => $url,
                        'xendit_status' => 'PENDING',
                    ]);

                    return $url;
                });
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/payments/'.$transaction->id.'/invoice')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_url', 'https://checkout.xendit.co/inv-test-reservation-fee');
    }

    public function test_create_invoice_reuses_existing_pending_payment_url(): void
    {
        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'reservation_fee',
            'amount' => 450,
            'xendit_status' => 'PENDING',
            'payment_url' => 'https://checkout.xendit.co/inv-test-existing',
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')->never();
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/payments/'.$transaction->id.'/invoice')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_url', 'https://checkout.xendit.co/inv-test-existing');
    }

    public function test_create_invoice_rejects_unsupported_transaction_types(): void
    {
        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'payment',
            'amount' => 300,
            'xendit_status' => null,
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')->never();
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/payments/'.$transaction->id.'/invoice')
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Only invoice and reservation-fee transactions can be paid.');
    }

    public function test_create_invoice_rejects_paid_transaction(): void
    {
        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1200,
            'xendit_status' => 'PAID',
            'paid_at' => now(),
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')->never();
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/payments/'.$transaction->id.'/invoice')
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'This transaction has already been paid.');
    }

    public function test_create_invoice_enforces_ownership(): void
    {
        $transaction = CustomerTransaction::create([
            'customer_id' => $this->otherCustomer->id,
            'type' => 'invoice',
            'amount' => 800,
            'xendit_status' => null,
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')->never();
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/payments/'.$transaction->id.'/invoice')
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Forbidden.');
    }

    public function test_create_invoice_returns_sanitized_gateway_error_response(): void
    {
        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1350,
            'xendit_status' => null,
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')
                ->once()
                ->andThrow(new PaymentGatewayException(
                    message: 'Unable to initialize online payment right now. Please try again later.',
                    errorCode: 'xendit_invoice_creation_failed',
                    statusCode: 503,
                ));
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/payments/'.$transaction->id.'/invoice')
            ->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error', 'xendit_invoice_creation_failed')
            ->assertJsonPath('message', 'Unable to initialize online payment right now. Please try again later.');
    }

    public function test_create_bulk_invoice_returns_sanitized_gateway_error_response(): void
    {
        CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1200,
            'xendit_status' => null,
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'reservation_fee',
            'amount' => 250,
            'xendit_status' => null,
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createBulkInvoice')
                ->once()
                ->andThrow(new PaymentGatewayException(
                    message: 'Unable to initialize online payment right now. Please try again later.',
                    errorCode: 'xendit_bulk_invoice_creation_failed',
                    statusCode: 503,
                ));
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/payments/pay-all')
            ->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error', 'xendit_bulk_invoice_creation_failed')
            ->assertJsonPath('message', 'Unable to initialize online payment right now. Please try again later.');
    }

    public function test_pay_fee_regenerates_invoice_on_existing_expired_fee_transaction_without_creating_duplicate(): void
    {
        $reservation = Reservation::factory()->pending()->create([
            'customer_id' => $this->customer->id,
            'reservation_fee' => 250,
        ]);

        $existingTransaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'reservation_id' => $reservation->id,
            'type' => 'reservation_fee',
            'amount' => 250,
            'xendit_status' => 'EXPIRED',
            'payment_url' => 'https://checkout.xendit.co/inv-test-expired',
        ]);

        $reservation->update([
            'fee_transaction_id' => $existingTransaction->id,
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')
                ->once()
                ->andReturnUsing(function (CustomerTransaction $transaction): string {
                    $url = 'https://checkout.xendit.co/inv-test-regenerated';

                    $transaction->update([
                        'payment_url' => $url,
                        'xendit_status' => 'PENDING',
                    ]);

                    return $url;
                });
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/reservations/'.$reservation->id.'/pay-fee')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_url', 'https://checkout.xendit.co/inv-test-regenerated');

        $this->assertSame(
            1,
            CustomerTransaction::query()->where('reservation_id', $reservation->id)->count(),
        );

        $this->assertDatabaseHas('customer_transactions', [
            'id' => $existingTransaction->id,
            'reservation_id' => $reservation->id,
            'xendit_status' => 'PENDING',
            'payment_url' => 'https://checkout.xendit.co/inv-test-regenerated',
        ]);
    }

    public function test_pay_fee_rejects_when_existing_fee_transaction_is_already_paid(): void
    {
        $reservation = Reservation::factory()->pending()->create([
            'customer_id' => $this->customer->id,
            'reservation_fee' => 400,
        ]);

        $existingTransaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'reservation_id' => $reservation->id,
            'type' => 'reservation_fee',
            'amount' => 400,
            'xendit_status' => 'PAID',
            'paid_at' => now(),
            'payment_url' => 'https://checkout.xendit.co/inv-test-paid',
        ]);

        $reservation->update([
            'fee_transaction_id' => $existingTransaction->id,
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')->never();
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/reservations/'.$reservation->id.'/pay-fee')
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Reservation fee has already been paid');
    }

    public function test_sync_updates_pending_transaction_status_and_payment_method_from_xendit(): void
    {
        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1600,
            'xendit_invoice_id' => 'sync-inv-001',
            'xendit_status' => 'PENDING',
            'payment_method' => null,
            'paid_at' => null,
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('getInvoiceSnapshot')
                ->once()
                ->with('sync-inv-001')
                ->andReturn([
                    'status' => 'PAID',
                    'payment_method' => 'CREDIT_CARD',
                ]);
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/payments/sync')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.updated_count', 1);

        $fresh = $transaction->fresh();

        $this->assertSame('PAID', $fresh?->xendit_status);
        $this->assertSame('CREDIT_CARD', $fresh?->payment_method);
        $this->assertNotNull($fresh?->paid_at);
    }

    public function test_sync_backfills_missing_payment_method_for_paid_transaction_without_duplicate_side_effects(): void
    {
        $jobOrder = JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'service_fee' => 1200,
            'settled_flag' => false,
        ]);

        $paidAt = now()->subHour();

        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'job_order_id' => $jobOrder->id,
            'type' => 'reservation_fee',
            'amount' => 300,
            'notes' => 'Reservation fee for booking #123',
            'xendit_invoice_id' => 'sync-inv-002',
            'xendit_status' => 'PAID',
            'payment_method' => null,
            'paid_at' => $paidAt,
        ]);

        $this->assertSame(
            0,
            CustomerTransaction::query()
                ->where('job_order_id', $jobOrder->id)
                ->where('type', 'invoice')
                ->count(),
        );

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('getInvoiceSnapshot')
                ->once()
                ->with('sync-inv-002')
                ->andReturn([
                    'status' => 'PAID',
                    'payment_method' => 'BANK_TRANSFER',
                ]);
        });

        $this->actingAs($this->user)
            ->postJson('/api/v1/payments/sync')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.updated_count', 1);

        $fresh = $transaction->fresh();

        $this->assertSame('PAID', $fresh?->xendit_status);
        $this->assertSame('BANK_TRANSFER', $fresh?->payment_method);
        $this->assertSame($paidAt->toDateTimeString(), $fresh?->paid_at?->toDateTimeString());

        $this->assertSame(
            0,
            CustomerTransaction::query()
                ->where('job_order_id', $jobOrder->id)
                ->where('type', 'invoice')
                ->count(),
        );

        $this->assertFalse((bool) $jobOrder->fresh()?->settled_flag);
    }

    public function test_webhook_rejects_when_expected_token_is_empty(): void
    {
        config(['xendit.webhook_token' => '']);

        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1200,
            'external_id' => 'webhook-empty-token-1',
            'xendit_status' => 'PENDING',
        ]);

        $this->postJson(
            '/api/v1/payments/webhook',
            [
                'external_id' => $transaction->external_id,
                'status' => 'PAID',
            ],
            ['x-callback-token' => 'some-token'],
        )
            ->assertStatus(401)
            ->assertJsonPath('message', 'Unauthorized.');

        $fresh = $transaction->fresh();

        $this->assertSame('PENDING', $fresh?->xendit_status);
        $this->assertNull($fresh?->paid_at);
    }

    public function test_webhook_rejects_when_callback_header_is_missing(): void
    {
        config(['xendit.webhook_token' => 'expected-webhook-token']);

        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1250,
            'external_id' => 'webhook-missing-header-1',
            'xendit_status' => 'PENDING',
        ]);

        $this->postJson('/api/v1/payments/webhook', [
            'external_id' => $transaction->external_id,
            'status' => 'PAID',
        ])
            ->assertStatus(401)
            ->assertJsonPath('message', 'Unauthorized.');

        $fresh = $transaction->fresh();

        $this->assertSame('PENDING', $fresh?->xendit_status);
        $this->assertNull($fresh?->paid_at);
    }

    public function test_webhook_rejects_when_callback_token_does_not_match(): void
    {
        config(['xendit.webhook_token' => 'expected-webhook-token']);

        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1350,
            'external_id' => 'webhook-mismatch-1',
            'xendit_status' => 'PENDING',
        ]);

        $this->postJson(
            '/api/v1/payments/webhook',
            [
                'external_id' => $transaction->external_id,
                'status' => 'PAID',
            ],
            ['x-callback-token' => 'wrong-token'],
        )
            ->assertStatus(401)
            ->assertJsonPath('message', 'Unauthorized.');

        $fresh = $transaction->fresh();

        $this->assertSame('PENDING', $fresh?->xendit_status);
        $this->assertNull($fresh?->paid_at);
    }

    public function test_webhook_returns_invalid_payload_when_required_fields_are_missing(): void
    {
        config(['xendit.webhook_token' => 'expected-webhook-token']);

        $this->postJson(
            '/api/v1/payments/webhook',
            ['external_id' => 'missing-status'],
            ['x-callback-token' => 'expected-webhook-token'],
        )
            ->assertStatus(400)
            ->assertJsonPath('message', 'Invalid payload.');
    }

    public function test_webhook_updates_transaction_when_callback_token_matches(): void
    {
        config(['xendit.webhook_token' => 'expected-webhook-token']);

        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1450,
            'external_id' => 'webhook-valid-1',
            'xendit_status' => 'PENDING',
        ]);

        $this->postJson(
            '/api/v1/payments/webhook',
            [
                'external_id' => $transaction->external_id,
                'status' => 'PAID',
                'payment_method' => 'CREDIT_CARD',
            ],
            ['x-callback-token' => 'expected-webhook-token'],
        )
            ->assertStatus(200)
            ->assertJsonPath('message', 'OK');

        $fresh = $transaction->fresh();

        $this->assertSame('PAID', $fresh?->xendit_status);
        $this->assertSame('CREDIT_CARD', $fresh?->payment_method);
        $this->assertNotNull($fresh?->paid_at);
    }
}
