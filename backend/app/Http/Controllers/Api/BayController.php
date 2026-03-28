<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BayController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Bay::query();

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $bays = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $bays,
        ]);
    }
}
