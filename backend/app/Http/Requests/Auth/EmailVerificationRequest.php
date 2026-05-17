<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Auth\EmailVerificationRequest as BaseEmailVerificationRequest;

class EmailVerificationRequest extends BaseEmailVerificationRequest
{
    /**
     * Resolve the user from the signed URL's {id} parameter
     * so the route works without auth:sanctum middleware.
     */
    public function user($guard = null): ?User
    {
        if ($this->user) {
            return $this->user;
        }

        return $this->user = User::find($this->route('id'));
    }
}
