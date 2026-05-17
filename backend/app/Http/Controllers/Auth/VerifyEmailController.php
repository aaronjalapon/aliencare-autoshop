<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;

class VerifyEmailController extends Controller
{
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        if (! $request->user()->hasVerifiedEmail()) {
            $request->fulfill();
        }

        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        $path = $request->user()->role === UserRole::Customer
            ? '/customer?verified=1'
            : '/dashboard?verified=1';

        return redirect($frontendUrl . $path);
    }
}
