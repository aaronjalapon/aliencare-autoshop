<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\Inventory;
use App\Models\User;
use App\Services\XenditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class PosCheckoutApiTest extends TestCase
{
    use RefreshDatabase;

    private User $frontdeskUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->frontdeskUser = User::factory()->create([
            'role' => 'frontdesk',
        ]);
    }

    public function test_frontdesk_can_checkout_with_cash_payment(): void
    {
        $customer = Customer::factory()->create();
        $itemA = Inventory::factory()->create([
            'sku' => 'POS-CASH-001',
            'stock' => 10,
            'unit_price' => 150,
        ]);
        $itemB = Inventory::factory()->create([
            'sku' => 'POS-CASH-002',
            'stock' => 5,
            'unit_price' => 200,
        ]);

        $response = $this->actingAs($this->frontdeskUser)
            ->postJson('/api/v1/pos/checkout', [
                'customer_id' => $customer->id,
                'payment_mode' => 'cash',
                'cart' => [
                    ['item_id' => $itemA->item_id, 'quantity' => 2],
                    ['item_id' => $itemB->item_id, 'quantity' => 1],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.checkout.payment_mode', 'cash')
            ->assertJsonPath('data.checkout.item_count', 3)
            ->assertJsonPath('data.checkout.total', 500)
            ->assertJsonPath('data.checkout.payment_url', null)
            ->assertJsonPath('data.transaction.customer_id', $customer->id)
            ->assertJsonPath('data.transaction.payment_method', 'cash');

        $this->assertDatabaseHas('inventories', [
            'item_id' => $itemA->item_id,
            'stock' => 8,
        ]);
        $this->assertDatabaseHas('inventories', [
            'item_id' => $itemB->item_id,
            'stock' => 4,
        ]);

        $transaction = CustomerTransaction::query()->firstOrFail();
        $this->assertSame('invoice', $transaction->type->value);
        $this->assertSame('cash', $transaction->payment_method);
        $this->assertStringStartsWith('POS-', (string) $transaction->reference_number);

        $this->assertDatabaseCount('stock_transactions', 2);
    }

    public function test_online_checkout_creates_payment_url(): void
    {
        $customer = Customer::factory()->create();
        $item = Inventory::factory()->create([
            'sku' => 'POS-ONLINE-001',
            'stock' => 8,
            'unit_price' => 275,
        ]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')
                ->once()
                ->andReturnUsing(function (CustomerTransaction $transaction): string {
                    $url = 'https://checkout.xendit.co/inv-pos-online';

                    $transaction->update([
                        'payment_url' => $url,
                        'xendit_status' => 'PENDING',
                    ]);

                    return $url;
                });
        });

        $response = $this->actingAs($this->frontdeskUser)
            ->postJson('/api/v1/pos/checkout', [
                'customer_id' => $customer->id,
                'payment_mode' => 'online',
                'cart' => [
                    ['item_id' => $item->item_id, 'quantity' => 2],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.checkout.payment_mode', 'online')
            ->assertJsonPath('data.checkout.payment_url', 'https://checkout.xendit.co/inv-pos-online')
            ->assertJsonPath('data.transaction.payment_method', 'online')
            ->assertJsonPath('data.transaction.xendit_status', 'PENDING');

        $this->assertDatabaseHas('inventories', [
            'item_id' => $item->item_id,
            'stock' => 6,
        ]);
    }

    public function test_cash_checkout_succeeds_even_with_invalid_xendit_configuration(): void
    {
        Config::set('xendit.secret_key', 'ROTATE_IN_XENDIT_DASHBOARD_AND_SET_HERE');

        $customer = Customer::factory()->create();
        $item = Inventory::factory()->create([
            'sku' => 'POS-CASH-CONFIG-001',
            'stock' => 10,
            'unit_price' => 120,
        ]);

        $response = $this->actingAs($this->frontdeskUser)
            ->postJson('/api/v1/pos/checkout', [
                'customer_id' => $customer->id,
                'payment_mode' => 'cash',
                'cart' => [
                    ['item_id' => $item->item_id, 'quantity' => 2],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.checkout.payment_mode', 'cash')
            ->assertJsonPath('data.checkout.total', 240)
            ->assertJsonPath('data.checkout.payment_url', null);

        $this->assertDatabaseHas('inventories', [
            'item_id' => $item->item_id,
            'stock' => 8,
        ]);

        $this->assertDatabaseHas('customer_transactions', [
            'customer_id' => $customer->id,
            'payment_method' => 'cash',
            'amount' => 240,
        ]);
    }

    public function test_online_checkout_returns_503_when_xendit_configuration_is_invalid(): void
    {
        Config::set('xendit.secret_key', 'ROTATE_IN_XENDIT_DASHBOARD_AND_SET_HERE');

        $customer = Customer::factory()->create();
        $item = Inventory::factory()->create([
            'sku' => 'POS-ONLINE-CONFIG-001',
            'stock' => 7,
            'unit_price' => 300,
        ]);

        $response = $this->actingAs($this->frontdeskUser)
            ->postJson('/api/v1/pos/checkout', [
                'customer_id' => $customer->id,
                'payment_mode' => 'online',
                'cart' => [
                    ['item_id' => $item->item_id, 'quantity' => 2],
                ],
            ]);

        $response->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error', 'xendit_configuration_invalid');

        $this->assertDatabaseHas('inventories', [
            'item_id' => $item->item_id,
            'stock' => 7,
        ]);
        $this->assertDatabaseCount('customer_transactions', 0);
        $this->assertDatabaseCount('stock_transactions', 0);
    }

    public function test_checkout_rolls_back_all_updates_when_any_item_lacks_stock(): void
    {
        $customer = Customer::factory()->create();
        $itemA = Inventory::factory()->create([
            'sku' => 'POS-ROLLBACK-001',
            'stock' => 5,
            'unit_price' => 100,
        ]);
        $itemB = Inventory::factory()->create([
            'sku' => 'POS-ROLLBACK-002',
            'stock' => 1,
            'unit_price' => 300,
        ]);

        $response = $this->actingAs($this->frontdeskUser)
            ->postJson('/api/v1/pos/checkout', [
                'customer_id' => $customer->id,
                'payment_mode' => 'cash',
                'cart' => [
                    ['item_id' => $itemA->item_id, 'quantity' => 1],
                    ['item_id' => $itemB->item_id, 'quantity' => 3],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('inventories', [
            'item_id' => $itemA->item_id,
            'stock' => 5,
        ]);
        $this->assertDatabaseHas('inventories', [
            'item_id' => $itemB->item_id,
            'stock' => 1,
        ]);
        $this->assertDatabaseCount('customer_transactions', 0);
        $this->assertDatabaseCount('stock_transactions', 0);
    }

    public function test_customer_role_is_forbidden_from_pos_checkout(): void
    {
        $customerUser = User::factory()->create([
            'role' => 'customer',
        ]);
        $customer = Customer::factory()->create();
        $item = Inventory::factory()->create([
            'sku' => 'POS-FORBIDDEN-001',
            'stock' => 10,
        ]);

        $this->actingAs($customerUser)
            ->postJson('/api/v1/pos/checkout', [
                'customer_id' => $customer->id,
                'payment_mode' => 'cash',
                'cart' => [
                    ['item_id' => $item->item_id, 'quantity' => 1],
                ],
            ])
            ->assertStatus(403);
    }

    public function test_pos_transactions_endpoint_returns_only_pos_reference_records(): void
    {
        $customer = Customer::factory()->create();

        CustomerTransaction::create([
            'customer_id' => $customer->id,
            'type' => 'invoice',
            'amount' => 150,
            'reference_number' => 'POS-20260417-0001',
            'payment_method' => 'cash',
        ]);

        CustomerTransaction::create([
            'customer_id' => $customer->id,
            'type' => 'invoice',
            'amount' => 250,
            'reference_number' => 'INV-20260417-0001',
            'payment_method' => 'online',
        ]);

        $response = $this->actingAs($this->frontdeskUser)
            ->getJson('/api/v1/pos/transactions');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $transactions = $response->json('data.data');
        $this->assertCount(1, $transactions);
        $this->assertSame('POS-20260417-0001', $transactions[0]['reference_number']);
    }
}
