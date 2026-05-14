<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\SystemSettingUpdateRequest;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;

class SystemSettingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $group = $request->query('group');

        $settings = Cache::remember('system_settings', 60, function () use ($group) {
            $query = SystemSetting::query();

            if ($group) {
                $query->byGroup($group);
            }

            return $query->get()
                ->mapWithKeys(fn (SystemSetting $s) => [$s->key => json_decode((string) $s->value, true)])
                ->toArray();
        });

        return response()->json([
            'settings' => $settings,
            'can_manage' => Gate::allows('manage-system-settings'),
        ]);
    }

    public function update(SystemSettingUpdateRequest $request): JsonResponse
    {
        $settings = $request->validated('settings');

        foreach ($settings as $key => $value) {
            SystemSetting::setValue($key, $value);
        }

        Cache::forget('system_settings');

        // Re-read the full set to return consistent response
        $allSettings = SystemSetting::all()
            ->pluck('value', 'key')
            ->map(fn ($v) => json_decode((string) $v, true))
            ->toArray();

        return response()->json([
            'settings' => $allSettings,
            'message' => 'System settings updated',
        ]);
    }
}
