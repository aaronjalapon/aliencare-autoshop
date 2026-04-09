<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ServiceCategory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceCatalog extends Model
{
    use HasFactory;

    protected $table = 'service_catalogs';

    protected $fillable = [
        'name',
        'description',
        'price_label',
        'price_fixed',
        'duration',
        'estimated_duration',
        'category',
        'features',
        'includes',
        'rating',
        'rating_count',
        'queue_label',
        'recommended',
        'recommended_note',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'category' => ServiceCategory::class,
            'features' => 'array',
            'includes' => 'array',
            'price_fixed' => 'decimal:2',
            'rating' => 'decimal:1',
            'rating_count' => 'integer',
            'recommended' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCategory($query, ServiceCategory $category)
    {
        return $query->where('category', $category);
    }
}
