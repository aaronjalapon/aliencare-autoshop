<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Archive\ArchiveIndexRequest;
use App\Models\Archive;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * Controller for archive/audit record management.
 */
class ArchiveController extends Controller
{
    /**
     * Get a paginated list of archive records with optional filtering.
     */
    public function index(ArchiveIndexRequest $request): JsonResponse
    {
        Gate::authorize('view-archives');

        $query = Archive::query();
        $filters = $request->validated();

        if (isset($filters['entity_type'])) {
            $query->where('entity_type', $filters['entity_type']);
        }

        if (isset($filters['entity_id'])) {
            $query->where('entity_id', $filters['entity_id']);
        }

        if (isset($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (isset($filters['start_date'], $filters['end_date'])) {
            $query->whereBetween('archived_date', [
                $filters['start_date'],
                $filters['end_date'],
            ]);
        }

        $archives = $query->orderBy('archived_date', 'desc')
            ->paginate((int) ($filters['per_page'] ?? 15));

        return response()->json([
            'success' => true,
            'data' => $archives,
        ]);
    }

    /**
     * Get a specific archive record by ID.
     */
    public function show(int $id): JsonResponse
    {
        Gate::authorize('view-archives');

        $archive = Archive::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $archive,
        ]);
    }
}
