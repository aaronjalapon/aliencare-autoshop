<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mechanic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MechanicController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Mechanic::with('user');

        if ($request->has('availability_status')) {
            $query->where('availability_status', $request->input('availability_status'));
        }

        $mechanics = $query->get()->map(function ($mechanic) {
            return [
                'id' => $mechanic->id,
                'user_id' => $mechanic->user_id,
                'name' => $mechanic->user?->name,
                'specialization' => $mechanic->specialization,
                'availability_status' => $mechanic->availability_status,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $mechanics,
        ]);
    }
}
