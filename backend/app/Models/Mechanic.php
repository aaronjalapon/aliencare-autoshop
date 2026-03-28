<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MechanicAvailability;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Mechanic extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'specialization',
        'availability_status',
    ];

    protected function casts(): array
    {
        return [
            'availability_status' => MechanicAvailability::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function jobOrders(): HasMany
    {
        return $this->hasMany(JobOrder::class, 'assigned_mechanic_id');
    }

    public function scopeAvailable($query)
    {
        return $query->where('availability_status', MechanicAvailability::Available);
    }
}
