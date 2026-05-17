<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class VerifyEmailController extends Controller
{
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        if (! $request->user()->hasVerifiedEmail()) {
            $request->fulfill();
        }

        Auth::login($request->user());
        $request->session()->regenerate();

        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        $role = $request->user()->role;
        $next = match ($role) {
            UserRole::Admin => '/admin',
            UserRole::Customer => '/customer',
            default => '/dashboard',
        };

        return redirect($frontendUrl . '/verify-complete?next=' . urlencode($next));
    }
}
