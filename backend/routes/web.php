<?php

use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::get('/verify-email/{id}/{hash}', VerifyEmailController::class)
	->middleware(['signed', 'throttle:6,1'])
	->name('verification.verify');
