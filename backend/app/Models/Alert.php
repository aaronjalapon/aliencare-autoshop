<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'item_name',
        'current_stock',
        'reorder_level',
        'category',
        'supplier',
        'urgency',
        'alert_type',
        'message',
        'acknowledged',
        'acknowledged_by',
        'acknowledged_at',
    ];

    protected $casts = [
        'acknowledged' => 'boolean',
        'acknowledged_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the inventory item associated with this alert.
     */
    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class, 'item_id', 'item_id');
    }

    /**
     * Scope for unacknowledged alerts.
     */
    public function scopeUnacknowledged($query)
    {
        return $query->where('acknowledged', false);
    }

    /**
     * Scope for acknowledged alerts.
     */
    public function scopeAcknowledged($query)
    {
        return $query->where('acknowledged', true);
    }

    /**
     * Scope for alerts by urgency level.
     */
    public function scopeByUrgency($query, $urgency)
    {
        return $query->where('urgency', $urgency);
    }

    /**
     * Scope for critical alerts.
     */
    public function scopeCritical($query)
    {
        return $query->where('urgency', 'critical');
    }

    /**
     * Scope for high priority alerts.
     */
    public function scopeHigh($query)
    {
        return $query->where('urgency', 'high');
    }

    /**
     * Acknowledge this alert.
     */
    public function acknowledge($acknowledgedBy = 'System')
    {
        $this->update([
            'acknowledged' => true,
            'acknowledged_by' => $acknowledgedBy,
            'acknowledged_at' => now(),
        ]);
    }
}
