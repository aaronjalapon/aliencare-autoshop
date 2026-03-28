<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BayStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bay extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => BayStatus::class,
        ];
    }

    public function jobOrders(): HasMany
    {
        return $this->hasMany(JobOrder::class);
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', BayStatus::Available);
    }

    public function scopeOccupied($query)
    {
        return $query->where('status', BayStatus::Occupied);
    }
}
