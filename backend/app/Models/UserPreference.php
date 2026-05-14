<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPreference extends Model
{
    protected $fillable = [
        'user_id',
        'key',
        'value',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public static function getForUser(int $userId, string $key, mixed $default = null): mixed
    {
        $pref = static::where('user_id', $userId)->where('key', $key)->first();

        if ($pref === null) {
            return $default;
        }

        return json_decode((string) $pref->value, true) ?? $default;
    }

    public static function setForUser(int $userId, string $key, mixed $value): void
    {
        static::updateOrCreate(
            ['user_id' => $userId, 'key' => $key],
            ['value' => json_encode($value)],
        );
    }
}
