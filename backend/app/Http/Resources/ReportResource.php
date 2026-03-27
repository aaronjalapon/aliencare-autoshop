<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for Report model.
 *
 * @mixin Report
 */
class ReportResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'report_type' => $this->report_type,
            'generated_date' => $this->generated_date,
            'report_date' => $this->report_date,
            'data_summary' => $this->data_summary,
            'forecast_period' => $this->forecast_period,
            'forecast_value' => $this->forecast_value,
            'confidence_level' => $this->confidence_level,
            'generated_by' => $this->generated_by,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
