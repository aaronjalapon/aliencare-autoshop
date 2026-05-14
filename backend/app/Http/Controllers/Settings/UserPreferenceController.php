<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UserPreferenceUpdateRequest;
use App\Models\UserPreference;
use Illuminate\Http\JsonResponse;

class UserPreferenceController extends Controller
{
    public function index(): JsonResponse
    {
        $userId = (int) request()->user()->id;

        $preferences = UserPreference::forUser($userId)
            ->get()
            ->pluck('value', 'key')
            ->map(fn ($v) => json_decode((string) $v, true))
            ->toArray();

        // Merge with role-based defaults for any missing keys
        $defaults = $this->defaultsForRole(request()->user()->role->value);

        return response()->json([
            'preferences' => array_merge($defaults, $preferences),
        ]);
    }

    public function update(UserPreferenceUpdateRequest $request): JsonResponse
    {
        $userId = (int) $request->user()->id;
        $preferences = $request->validated('preferences');

        foreach ($preferences as $key => $value) {
            UserPreference::setForUser($userId, $key, $value);
        }

        // Return all preferences after update
        $all = UserPreference::forUser($userId)
            ->get()
            ->pluck('value', 'key')
            ->map(fn ($v) => json_decode((string) $v, true))
            ->toArray();

        $defaults = $this->defaultsForRole($request->user()->role->value);

        return response()->json([
            'preferences' => array_merge($defaults, $all),
            'message' => 'Preferences updated',
        ]);
    }

    private function defaultsForRole(string $role): array
    {
        if ($role === 'customer') {
            return [
                'push_notifications' => true,
                'email_notifications' => true,
            ];
        }

        // frontdesk (and admin)
        return [
            'payment_alerts' => true,
            'service_completion_alerts' => true,
            'session_timeout_minutes' => 30,
        ];
    }
}
