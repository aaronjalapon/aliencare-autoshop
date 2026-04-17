<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ServiceCatalog\ServiceCatalogIndexRequest;
use App\Http\Requests\Api\ServiceCatalog\ServiceCatalogManageIndexRequest;
use App\Http\Requests\Api\ServiceCatalog\StoreServiceCatalogRequest;
use App\Http\Requests\Api\ServiceCatalog\UpdateServiceCatalogRequest;
use App\Http\Resources\ServiceCatalogResource;
use App\Models\ServiceCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ServiceCatalogController extends Controller
{
    public function index(ServiceCatalogIndexRequest $request): JsonResponse
    {
        $query = ServiceCatalog::active();

        $this->applyCommonFilters($query, $request->input('category'), $request->input('search'));

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

    public function manageIndex(ServiceCatalogManageIndexRequest $request): JsonResponse
    {
        Gate::authorize('manage-services');

        $query = ServiceCatalog::query();

        $this->applyCommonFilters($query, $request->input('category'), $request->input('search'));

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $services = $query->orderByDesc('recommended')
            ->orderBy('name')
            ->paginate((int) $request->get('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => ServiceCatalogResource::collection($services)->response()->getData(),
        ]);
    }

    public function store(StoreServiceCatalogRequest $request): JsonResponse
    {
        Gate::authorize('manage-services');

        $service = ServiceCatalog::create($this->normalizePayload($request->validated()));

        return response()->json([
            'success' => true,
            'data' => new ServiceCatalogResource($service),
            'message' => 'Service created successfully.',
        ], 201);
    }

    public function update(UpdateServiceCatalogRequest $request, int $id): JsonResponse
    {
        Gate::authorize('manage-services');

        $service = ServiceCatalog::query()->findOrFail($id);
        $service->fill($this->normalizePayload($request->validated()));
        $service->save();

        return response()->json([
            'success' => true,
            'data' => new ServiceCatalogResource($service),
            'message' => 'Service updated successfully.',
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        Gate::authorize('manage-services');

        $service = ServiceCatalog::query()->findOrFail($id);
        $service->is_active = false;
        $service->save();

        return response()->json([
            'success' => true,
            'data' => new ServiceCatalogResource($service),
            'message' => 'Service deactivated successfully.',
        ]);
    }

    private function applyCommonFilters($query, ?string $category, ?string $search): void
    {
        if ($category !== null && $category !== '') {
            $query->where('category', $category);
        }

        if ($search !== null && $search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizePayload(array $data): array
    {
        if (array_key_exists('recommended', $data) && $data['recommended'] === false) {
            $data['recommended_note'] = null;
        }

        return $data;
    }
}
