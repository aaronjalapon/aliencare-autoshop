<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\JobOrderItemType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_order_id',
        'item_type',
        'item_id',
        'description',
        'quantity',
        'unit_price',
        'total_price',
    ];

    protected function casts(): array
    {
        return [
            'item_type' => JobOrderItemType::class,
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'total_price' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (JobOrderItem $item) {
            $item->total_price = $item->quantity * $item->unit_price;
        });
    }

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(Inventory::class, 'item_id', 'item_id');
    }
}
