<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Archive extends Model
{
    use HasFactory;

    // Using default 'id' primary key (auto-incrementing)

    protected $fillable = [
        'entity_type',
        'entity_id',
        'action',
        'old_data',
        'new_data',
        'user_id',
        'reference_number',
        'notes',
        'archived_date',
    ];

    protected $casts = [
        'old_data' => 'array',
        'new_data' => 'array',
        'archived_date' => 'datetime',
    ];

    /**
     * Scope for inventory archives.
     */
    public function scopeInventoryArchives($query)
    {
        return $query->where('entity_type', 'inventory');
    }

    /**
     * Scope for reservation archives.
     */
    public function scopeReservationArchives($query)
    {
        return $query->where('entity_type', 'reservation');
    }

    /**
     * Scope for transaction archives.
     */
    public function scopeTransactionArchives($query)
    {
        return $query->where('entity_type', 'transaction');
    }

    /**
     * Scope for archives within date range.
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('archived_date', [$startDate, $endDate]);
    }
}
