<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use App\Models\InventoryStock;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OperationalController extends Controller
{
    // ==========================================
    // NOTIFICATIONS & ALERTS
    // ==========================================
    public function getNotifications(Request $request)
    {
        $userId = $request->user()->id ?? null;
        $notifs = Notification::whereNull('user_id')
            ->orWhere('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();
        return response()->json($notifs);
    }

    public function markNotificationRead($id)
    {
        Notification::where('id', $id)->update(['is_read' => true]);
        return response()->json(['success' => true]);
    }

    // ==========================================
    // ACTIVITY LOGS (AUDIT TRAIL)
    // ==========================================
    public function getActivityLogs(Request $request)
    {
        $logs = ActivityLog::with('user')->orderBy('created_at', 'desc')->paginate(20);
        return response()->json($logs);
    }

    // ==========================================
    // APPROVAL WORKFLOW
    // ==========================================
    public function getPendingApprovals(Request $request)
    {
        $transactions = InventoryTransaction::with(['product', 'sourceLocation', 'destinationLocation'])
            ->where('status', 'PENDING')
            ->orderBy('created_at', 'asc')
            ->paginate($request->input('per_page', 50));
        return response()->json($transactions);
    }

    public function approveTransaction(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:APPROVED,REJECTED', 'notes' => 'nullable|string']);
        
        try {
            DB::beginTransaction();
            $trx = InventoryTransaction::findOrFail($id);
            if ($trx->status !== 'PENDING') throw new \Exception("Transaksi sudah diproses sebelumnya.");

            $trx->status = $request->status;
            $trx->approved_by = $request->user()->id ?? null;
            $trx->approved_at = now();
            $trx->approval_notes = $request->notes;
            $trx->save();

            // Eksekusi perpindahan fisik stok JIKA DI-APPROVE
            if ($request->status === 'APPROVED') {
                if ($trx->type === 'INBOUND' || $trx->type === 'RETURN' || $trx->type === 'ADJUSTMENT_UP') {
                    $stock = InventoryStock::where('product_id', $trx->product_id)
                        ->where('location_id', $trx->destination_location_id)
                        
                        ->first();
                        
                    if (!$stock) {
                        $stock = InventoryStock::create([
                            'product_id' => $trx->product_id, 
                            'location_id' => $trx->destination_location_id,
                            'quantity' => 0
                        ]);
                    }
                    $stock->quantity += $trx->quantity;
                    $stock->save();
                } 
                elseif ($trx->type === 'OUTBOUND' || $trx->type === 'ADJUSTMENT_DOWN') {
                    $stock = InventoryStock::where('product_id', $trx->product_id)
                        ->where('location_id', $trx->source_location_id)
                        
                        ->first();
                        
                    if (!$stock || $stock->quantity < $trx->quantity) throw new \Exception("Stok fisik tidak mencukupi untuk di-approve.");
                    $stock->quantity -= $trx->quantity;
                    $stock->save();
                }
                elseif ($trx->type === 'TRANSFER') {
                    // Kurangi dari source
                    $sourceStock = InventoryStock::where('product_id', $trx->product_id)
                        ->where('location_id', $trx->source_location_id)
                        
                        ->first();
                        
                    if (!$sourceStock || $sourceStock->quantity < $trx->quantity) throw new \Exception("Stok sumber tidak mencukupi.");
                    $sourceStock->quantity -= $trx->quantity;
                    $sourceStock->save();

                    // Tambah ke destination
                    $destStock = InventoryStock::where('product_id', $trx->product_id)
                        ->where('location_id', $trx->destination_location_id)
                        
                        ->first();
                        
                    if (!$destStock) {
                        $destStock = InventoryStock::create([
                            'product_id' => $trx->product_id, 
                            'location_id' => $trx->destination_location_id,
                            'quantity' => 0
                        ]);
                    }
                    $destStock->quantity += $trx->quantity;
                    $destStock->save();
                }

                // Check Safety Stock Alert (Peringatan Dini)
                $product = Product::find($trx->product_id);
                $totalStock = InventoryStock::where('product_id', $product->id)->sum('quantity');
                if ($totalStock < $product->safety_stock) {
                    Notification::create([
                        'title' => '🚨 Safety Stock Warning!',
                        'message' => "Stok {$product->name} (SKU: {$product->sku}) menyentuh batas kritis ({$totalStock} {$product->uom}). Minimal: {$product->safety_stock}.",
                        'type' => 'WARNING'
                    ]);
                }
            }

            // Create Audit Log
            ActivityLog::create([
                'user_id' => $request->user()->id ?? null,
                'action' => 'APPROVAL',
                'model_type' => 'InventoryTransaction',
                'model_id' => $trx->id,
                'description' => "Manager melakukan {$request->status} pada TRX {$trx->transaction_code}",
            ]);

            DB::commit();
            return response()->json(['success' => true, 'message' => "Transaksi berhasil {$request->status}"]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    // ==========================================
    // MANUAL TRANSACTIONS (ADJUST, TRANSFER, RETURN)
    // ==========================================
    public function submitManualTransaction(Request $request)
    {
        $request->validate([
            'type' => 'required|in:ADJUSTMENT_UP,ADJUSTMENT_DOWN,TRANSFER,RETURN',
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'source_location_id' => 'nullable|exists:locations,id',
            'destination_location_id' => 'nullable|exists:locations,id|different:source_location_id',
            'notes' => 'required|string'
        ]);

        try {
            DB::beginTransaction();

            $code = 'TRX-' . substr($request->type, 0, 3) . '-' . strtoupper(\Str::random(6));
            
            $trx = InventoryTransaction::create([
                'transaction_code' => $code,
                'type' => $request->type,
                'product_id' => $request->product_id,
                'source_location_id' => $request->source_location_id,
                'destination_location_id' => $request->destination_location_id,
                'quantity' => $request->quantity,
                'notes' => $request->notes,
                'operator_id' => $request->user()->id ?? null,
                'status' => 'PENDING', // WAJIB APPROVAL
            ]);

            Notification::create([
                'title' => 'Menunggu Approval',
                'message' => "Transaksi {$request->type} ($code) membutuhkan approval manajer.",
                'type' => 'APPROVAL_REQUIRED'
            ]);

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Transaksi diajukan, menunggu Approval.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    // ==========================================
    // DASHBOARD OVERVIEW STATS
    // ==========================================
    public function getDashboardStats(Request $request)
    {
        try {
            $totalSkuInStock = InventoryStock::where('quantity', '>', 0)->distinct('product_id')->count('product_id');
            
            $lowStockAlerts = Product::where('safety_stock', '>', 0)
                ->where(function($query) {
                    $query->selectRaw('COALESCE(SUM(quantity), 0)')
                        ->from('inventory_stocks')
                        ->whereColumn('inventory_stocks.product_id', 'products.id');
                }, '<', DB::raw('safety_stock'))
                ->count();

            $todayInboundCount = InventoryTransaction::where('type', 'INBOUND')
                ->whereDate('created_at', today())
                ->sum('quantity');

            $todayOutboundCount = InventoryTransaction::where('type', 'OUTBOUND')
                ->whereDate('created_at', today())
                ->sum('quantity');

            // Last 7 days movement
            $dates = collect(range(0, 6))->map(fn($i) => now()->subDays($i)->format('Y-m-d'))->reverse()->values();
            
            $inboundData = InventoryTransaction::where('type', 'INBOUND')
                ->where('created_at', '>=', now()->subDays(6)->startOfDay())
                ->selectRaw('DATE(created_at) as date, SUM(quantity) as qty')
                ->groupBy('date')
                ->pluck('qty', 'date');

            $outboundData = InventoryTransaction::where('type', 'OUTBOUND')
                ->where('created_at', '>=', now()->subDays(6)->startOfDay())
                ->selectRaw('DATE(created_at) as date, SUM(quantity) as qty')
                ->groupBy('date')
                ->pluck('qty', 'date');

            $movement = $dates->map(function($date) use ($inboundData, $outboundData) {
                return [
                    'date' => date('d M', strtotime($date)),
                    'inbound' => (int) $inboundData->get($date, 0),
                    'outbound' => (int) $outboundData->get($date, 0),
                ];
            });

            // Recent activity
            $recentActivity = InventoryTransaction::with(['product', 'operator'])
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function($trx) {
                    return [
                        'id' => $trx->id,
                        'code' => $trx->transaction_code,
                        'type' => $trx->type,
                        'product_sku' => $trx->product ? $trx->product->sku : 'N/A',
                        'product_name' => $trx->product ? $trx->product->name : 'Unknown',
                        'quantity' => $trx->quantity,
                        'operator' => $trx->operator ? $trx->operator->username : 'System',
                        'time' => $trx->created_at->diffForHumans()
                    ];
                });

            return response()->json([
                'stats' => [
                    'total_sku' => $totalSkuInStock,
                    'low_stock' => $lowStockAlerts,
                    'today_inbound' => (int) $todayInboundCount,
                    'today_outbound' => (int) $todayOutboundCount,
                ],
                'movement' => $movement,
                'recent_activity' => $recentActivity
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
