<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialiteController
{
    private const ALLOWED_PROVIDERS = ['google', 'facebook'];

    public function redirect(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::ALLOWED_PROVIDERS), 404);

        return Socialite::driver($provider)->redirect();
    }

    public function callback(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::ALLOWED_PROVIDERS), 404);

        try {
            $socialUser = Socialite::driver($provider)->user();
        } catch (\Exception $e) {
            return redirect()->to(
                config('app.frontend_url').'/auth/oauth-callback?status=error&message='.urlencode('Unable to authenticate with '.ucfirst($provider))
            );
        }

        $user = User::updateOrCreate(
            [
                'provider_name' => $provider,
                'provider_id' => $socialUser->getId(),
            ],
            [
                'name' => $socialUser->getName() ?? $socialUser->getNickname() ?? ucfirst($provider).' User',
                'email' => $socialUser->getEmail(),
                'password' => Str::random(32),
                'role' => 'customer',
                'email_verified_at' => now(),
            ]
        );

        Auth::login($user, true);

        return redirect()->to(config('app.frontend_url').'/auth/oauth-callback?status=success');
    }
}
