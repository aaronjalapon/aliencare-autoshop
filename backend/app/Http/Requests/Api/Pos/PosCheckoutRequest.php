<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Pos;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PosCheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'payment_mode' => ['required', 'string', Rule::in(['cash', 'online'])],
            'notes' => ['nullable', 'string', 'max:500'],
            'cart' => ['required', 'array', 'min:1'],
            'cart.*.item_id' => ['required', 'integer', 'exists:inventories,item_id'],
            'cart.*.quantity' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'customer_id.required' => 'Please select a customer before checkout.',
            'customer_id.exists' => 'Selected customer does not exist.',
            'payment_mode.required' => 'Please choose a payment mode.',
            'payment_mode.in' => 'Payment mode must be cash or online.',
            'cart.required' => 'Cart is required for checkout.',
            'cart.min' => 'Add at least one item to the cart.',
            'cart.*.item_id.required' => 'Each cart item must include an item ID.',
            'cart.*.item_id.exists' => 'One or more cart items are no longer available.',
            'cart.*.quantity.required' => 'Each cart item must include a quantity.',
            'cart.*.quantity.min' => 'Each cart quantity must be at least 1.',
        ];
    }
}
