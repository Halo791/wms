<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use App\Models\Location;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class WarehouseMapController extends Controller
{
    /**
     * Get warehouse map data for Digital Twin visualization.
     * Returns all locations with their stock status, zone, tier, and fill level.
     */
    public function getMapData()
    {
        $warehouses = Warehouse::all();
        $result = [];

        foreach ($warehouses as $warehouse) {
            $locations = Location::where('warehouse_id', $warehouse->id)
                ->where('is_active', true)
                ->with(['stocks.product'])
                ->get();

            $locationData = $locations->map(function ($loc) {
                $totalQty = $loc->stocks->sum('quantity');
                $products = $loc->stocks->where('quantity', '>', 0)->map(function ($s) {
                    return [
                        'sku' => $s->product->sku ?? 'N/A',
                        'name' => $s->product->name ?? 'Unknown',
                        'qty' => $s->quantity,
                        'uom' => $s->product->uom ?? 'pcs',
                    ];
                })->values();

                // Determine fill status
                $status = 'empty';
                if ($totalQty > 0 && $totalQty < 50) $status = 'partial';
                if ($totalQty >= 50) $status = 'full';

                return [
                    'id' => $loc->id,
                    'barcode' => $loc->barcode,
                    'name' => $loc->name,
                    'zone' => $loc->zone,
                    'tier' => $loc->tier,
                    'aisle' => $loc->aisle,
                    'bay' => $loc->bay,
                    'total_qty' => $totalQty,
                    'status' => $status,
                    'products' => $products,
                ];
            });

            $result[] = [
                'warehouse' => [
                    'id' => $warehouse->id,
                    'name' => $warehouse->name,
                    'code' => $warehouse->code,
                ],
                'locations' => $locationData,
                'summary' => [
                    'total' => $locationData->count(),
                    'empty' => $locationData->where('status', 'empty')->count(),
                    'partial' => $locationData->where('status', 'partial')->count(),
                    'full' => $locationData->where('status', 'full')->count(),
                ],
            ];
        }

        return response()->json($result);
    }

    /**
     * Trigger Night Compaction manually for demo/testing purposes.
     */
    public function triggerNightCompaction()
    {
        try {
            $logs = [];

            DB::beginTransaction();

            // PHASE 1: CONSOLIDATE FRAGMENTED STOCKS
            $logs[] = ['phase' => 1, 'action' => 'CONSOLIDATION_START', 'message' => 'Mulai konsolidasi stok terfragmentasi'];

            $fragmentedProducts = InventoryStock::select('product_id')
                ->where('quantity', '>', 0)
                ->groupBy('product_id')
                ->havingRaw('COUNT(*) > 1')
                ->pluck('product_id');

            $consolidations = 0;

            foreach ($fragmentedProducts as $productId) {
                $stocks = InventoryStock::where('product_id', $productId)
                    ->where('quantity', '>', 0)
                    ->orderBy('quantity', 'desc')
                    ->get();

                if ($stocks->count() <= 1) continue;

                $target = $stocks->first();
                $sources = $stocks->slice(1);

                foreach ($sources as $source) {
                    $movedQty = $source->quantity;

                    \App\Models\InventoryTransaction::create([
                        'transaction_code' => 'COMPACT-' . strtoupper(\Illuminate\Support\Str::random(6)),
                        'type' => 'TRANSFER',
                        'product_id' => $productId,
                        'source_location_id' => $source->location_id,
                        'destination_location_id' => $target->location_id,
                        'quantity' => $movedQty,
                        'notes' => 'Night Compaction: Konsolidasi stok terfragmentasi',
                    ]);

                    $target->quantity += $movedQty;
                    $source->quantity = 0;
                    $source->save();

                    $consolidations++;
                    $logs[] = ['phase' => 1, 'action' => 'STOCK_MOVED', 'message' => "Pindah {$movedQty} unit dari LOC:{$source->location_id} ke LOC:{$target->location_id}", 'qty' => $movedQty];
                }

                $target->save();
            }

            $logs[] = ['phase' => 1, 'action' => 'CONSOLIDATION_DONE', 'message' => "{$consolidations} stok dikonsolidasi"];

            // PHASE 2: CLEANUP EMPTY STOCK RECORDS
            $cleaned = InventoryStock::where('quantity', 0)->delete();
            $logs[] = ['phase' => 2, 'action' => 'CLEANUP', 'message' => "{$cleaned} record stok kosong dihapus"];

            // PHASE 3: SPACE UTILIZATION REPORT
            $totalLocations = Location::where('is_active', true)->count();
            $occupiedLocations = InventoryStock::where('quantity', '>', 0)
                ->distinct('location_id')
                ->count('location_id');
            $emptyLocations = $totalLocations - $occupiedLocations;
            $utilization = $totalLocations > 0 ? round(($occupiedLocations / $totalLocations) * 100, 1) : 0;

            $logs[] = [
                'phase' => 3,
                'action' => 'UTILIZATION_REPORT',
                'message' => "Utilisasi: {$utilization}%",
                'data' => [
                    'total_locations' => $totalLocations,
                    'occupied' => $occupiedLocations,
                    'empty' => $emptyLocations,
                    'utilization_pct' => $utilization,
                ]
            ];

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Night Compaction selesai dijalankan.',
                'logs' => $logs,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Night Compaction gagal: ' . $e->getMessage(),
                'logs' => [['phase' => 0, 'action' => 'ERROR', 'message' => $e->getMessage()]],
            ], 500);
        }
    }
}
