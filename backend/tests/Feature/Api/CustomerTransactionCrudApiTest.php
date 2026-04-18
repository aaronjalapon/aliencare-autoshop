<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerTransactionCrudApiTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    private User $frontDeskUser;

    private User $customerUser;

    private Customer $customerProfile;

    private Customer $managedCustomer;

    private Customer $otherCustomer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
        ]);

        $this->frontDeskUser = User::factory()->create([
            'role' => 'frontdesk',
        ]);

        $this->customerUser = User::factory()->create([
            'role' => 'customer',
        ]);

        $this->customerProfile = Customer::factory()->create([
            'email' => $this->customerUser->email,
        ]);

        $this->managedCustomer = Customer::factory()->create();
        $this->otherCustomer = Customer::factory()->create();
    }

    public function test_frontdesk_can_create_transaction_for_customer(): void
    {
        $payload = [
            'type' => 'invoice',
            'amount' => 1750.5,
            'payment_method' => 'cash',
            'reference_number' => 'INV-2026-1001',
            'notes' => 'Manual invoice from frontdesk',
        ];

        $response = $this->actingAs($this->frontDeskUser)
            ->postJson('/api/v1/customers/'.$this->managedCustomer->id.'/transactions', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.customer_id', $this->managedCustomer->id)
            ->assertJsonPath('data.type', 'invoice')
            ->assertJsonPath('data.payment_method', 'cash')
            ->assertJsonPath('data.reference_number', 'INV-2026-1001')
            ->assertJsonPath('data.notes', 'Manual invoice from frontdesk');

        $this->assertDatabaseHas('customer_transactions', [
            'customer_id' => $this->managedCustomer->id,
            'type' => 'invoice',
            'payment_method' => 'cash',
            'reference_number' => 'INV-2026-1001',
            'notes' => 'Manual invoice from frontdesk',
        ]);
    }

    public function test_frontdesk_can_update_pending_transaction_amount_and_type(): void
    {
        $transaction = CustomerTransaction::create([
            'customer_id' => $this->managedCustomer->id,
            'type' => 'invoice',
            'amount' => 1200,
            'notes' => 'Initial invoice',
        ]);

        $payload = [
            'type' => 'payment',
            'amount' => 1000,
            'payment_method' => 'gcash',
            'reference_number' => 'PMT-2026-2001',
            'notes' => 'Updated by frontdesk',
        ];

        $response = $this->actingAs($this->frontDeskUser)
            ->patchJson('/api/v1/customers/'.$this->managedCustomer->id.'/transactions/'.$transaction->id, $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.type', 'payment')
            ->assertJsonPath('data.payment_method', 'gcash')
            ->assertJsonPath('data.reference_number', 'PMT-2026-2001')
            ->assertJsonPath('data.notes', 'Updated by frontdesk');

        $this->assertDatabaseHas('customer_transactions', [
            'id' => $transaction->id,
            'type' => 'payment',
            'amount' => 1000,
            'payment_method' => 'gcash',
            'reference_number' => 'PMT-2026-2001',
            'notes' => 'Updated by frontdesk',
        ]);
    }

    public function test_transactions_endpoint_supports_job_order_and_reference_filters(): void
    {
        $jobOrder = JobOrder::factory()->create([
            'customer_id' => $this->managedCustomer->id,
            'status' => 'completed',
        ]);

        $target = CustomerTransaction::create([
            'customer_id' => $this->managedCustomer->id,
            'job_order_id' => $jobOrder->id,
            'type' => 'invoice',
            'amount' => 1800,
            'reference_number' => 'INV-FILTER-001',
            'notes' => 'Target transaction',
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->managedCustomer->id,
            'type' => 'invoice',
            'amount' => 2200,
            'reference_number' => 'INV-FILTER-002',
            'notes' => 'Non-matching transaction',
        ]);

        $response = $this->actingAs($this->frontDeskUser)
            ->getJson('/api/v1/customers/'.$this->managedCustomer->id.'/transactions?job_order_id='.$jobOrder->id.'&reference_number=INV-FILTER-001');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $transactions = $response->json('data.data');
        $this->assertCount(1, $transactions);
        $this->assertSame($target->id, $transactions[0]['id']);
    }

    public function test_paid_or_linked_transactions_reject_amount_or_type_updates(): void
    {
        $paidTransaction = CustomerTransaction::create([
            'customer_id' => $this->managedCustomer->id,
            'type' => 'invoice',
            'amount' => 1300,
            'xendit_status' => 'PAID',
            'paid_at' => now(),
            'notes' => 'Paid invoice',
        ]);

        $this->actingAs($this->adminUser)
            ->patchJson('/api/v1/customers/'.$this->managedCustomer->id.'/transactions/'.$paidTransaction->id, [
                'amount' => 900,
            ])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Amount and type cannot be updated for paid or payment-linked transactions.');

        $linkedTransaction = CustomerTransaction::create([
            'customer_id' => $this->managedCustomer->id,
            'type' => 'invoice',
            'amount' => 1450,
            'external_id' => 'TXN-linked-100',
            'xendit_invoice_id' => 'xnd-linked-100',
            'xendit_status' => 'PENDING',
            'notes' => 'Linked invoice',
        ]);

        $this->actingAs($this->adminUser)
            ->patchJson('/api/v1/customers/'.$this->managedCustomer->id.'/transactions/'.$linkedTransaction->id, [
                'type' => 'refund',
            ])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Amount and type cannot be updated for paid or payment-linked transactions.');
    }

    public function test_paid_transactions_still_allow_notes_and_reference_updates(): void
    {
        $paidTransaction = CustomerTransaction::create([
            'customer_id' => $this->managedCustomer->id,
            'type' => 'invoice',
            'amount' => 2200,
            'xendit_status' => 'PAID',
            'paid_at' => now(),
            'notes' => 'Paid invoice',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->patchJson('/api/v1/customers/'.$this->managedCustomer->id.'/transactions/'.$paidTransaction->id, [
                'reference_number' => 'RCPT-3001',
                'notes' => 'Clerk annotation added',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.reference_number', 'RCPT-3001')
            ->assertJsonPath('data.notes', 'Clerk annotation added');

        $this->assertDatabaseHas('customer_transactions', [
            'id' => $paidTransaction->id,
            'type' => 'invoice',
            'amount' => 2200,
            'reference_number' => 'RCPT-3001',
            'notes' => 'Clerk annotation added',
        ]);
    }

    public function test_customer_role_cannot_create_or_update_transactions(): void
    {
        $this->actingAs($this->customerUser)
            ->postJson('/api/v1/customers/'.$this->customerProfile->id.'/transactions', [
                'type' => 'invoice',
                'amount' => 500,
            ])
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Only admin or frontdesk accounts can manage customer transactions.');

        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customerProfile->id,
            'type' => 'invoice',
            'amount' => 500,
            'notes' => 'Owned by customer',
        ]);

        $this->actingAs($this->customerUser)
            ->patchJson('/api/v1/customers/'.$this->customerProfile->id.'/transactions/'.$transaction->id, [
                'notes' => 'Attempted update',
            ])
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Only admin or frontdesk accounts can manage customer transactions.');
    }

    public function test_update_requires_transaction_to_belong_to_route_customer(): void
    {
        $foreignTransaction = CustomerTransaction::create([
            'customer_id' => $this->otherCustomer->id,
            'type' => 'invoice',
            'amount' => 900,
            'notes' => 'Foreign transaction',
        ]);

        $this->actingAs($this->frontDeskUser)
            ->patchJson('/api/v1/customers/'.$this->managedCustomer->id.'/transactions/'.$foreignTransaction->id, [
                'notes' => 'Should not update',
            ])
            ->assertStatus(404)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Transaction not found.');
    }
}
