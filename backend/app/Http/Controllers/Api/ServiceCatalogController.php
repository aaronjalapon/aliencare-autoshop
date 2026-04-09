<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ServiceCatalog\ServiceCatalogIndexRequest;
use App\Http\Resources\ServiceCatalogResource;
use App\Models\ServiceCatalog;
use Illuminate\Http\JsonResponse;

class ServiceCatalogController extends Controller
{
    public function index(ServiceCatalogIndexRequest $request): JsonResponse
    {
        $query = ServiceCatalog::active();

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $services = $query->orderByDesc('recommended')
            ->orderBy('name')
            ->paginate((int) $request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => ServiceCatalogResource::collection($services)->response()->getData(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $service = ServiceCatalog::active()->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new ServiceCatalogResource($service),
        ]);
    }
}
