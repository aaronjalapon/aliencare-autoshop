<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'group',
        'type',
        'label',
        'description',
    ];

    public function scopeByGroup(Builder $query, string $group): Builder
    {
        return $query->where('group', $group);
    }

    public static function getValue(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();

        if ($setting === null) {
            return $default;
        }

        return json_decode((string) $setting->value, true) ?? $default;
    }

    public static function setValue(string $key, mixed $value, ?string $group = null, ?string $type = null): void
    {
        $data = [
            'value' => json_encode($value),
        ];

        if ($group !== null) {
            $data['group'] = $group;
        }

        if ($type !== null) {
            $data['type'] = $type;
        }

        static::updateOrCreate(['key' => $key], $data);
    }
}
