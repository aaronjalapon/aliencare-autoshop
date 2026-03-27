<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    // Using default 'id' primary key (auto-incrementing)

    protected $fillable = [
        'report_type',
        'generated_date',
        'report_date',
        'data_summary',
        'forecast_period',
        'forecast_value',
        'confidence_level',
        'generated_by',
    ];

    protected $casts = [
        'data_summary' => 'array',
        'generated_date' => 'datetime',
        'report_date' => 'date',
        'forecast_value' => 'decimal:2',
        'confidence_level' => 'decimal:2',
        'forecast_period' => 'integer',
    ];

    /**
     * Scope for daily usage reports.
     */
    public function scopeDailyUsage($query)
    {
        return $query->where('report_type', 'daily_usage');
    }

    /**
     * Scope for monthly procurement reports.
     */
    public function scopeMonthlyProcurement($query)
    {
        return $query->where('report_type', 'monthly_procurement');
    }

    /**
     * Scope for low stock alerts.
     */
    public function scopeLowStockAlerts($query)
    {
        return $query->where('report_type', 'low_stock_alert');
    }

    /**
     * Scope for reconciliation reports.
     */
    public function scopeReconciliation($query)
    {
        return $query->where('report_type', 'reconciliation');
    }

    /**
     * Scope for forecast reports.
     */
    public function scopeForecast($query)
    {
        return $query->where('report_type', 'forecast');
    }

    /**
     * Scope for reports within date range.
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('report_date', [$startDate, $endDate]);
    }
}
