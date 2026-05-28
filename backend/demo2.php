<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use App\Models\Location;
use App\Models\User;
use App\Models\InventoryStock;
use App\Models\InventoryTransaction;
use Illuminate\Http\Request;
use App\Http\Controllers\OperationalController;

echo "===============================================\n";
echo "gudang.hovertech - SIMULASI E2E MENU LANJUTAN\n";
echo "(Stock Opname, Transfer/Relokasi)\n";
echo "===============================================\n\n";

$operator = User::where('role', 'operator')->first();
$manager = User::where('role', 'manager')->first();
$opController = new OperationalController();

// Cari satu stok yang ada quantity-nya
$stock = InventoryStock::with(['product', 'location'])->where('quantity', '>', 50)->first();
if (!$stock) {
    echo "Stok awal tidak ditemukan. Pastikan sudah menjalankan php populate_dummy.php\n";
    exit;
}

$product = $stock->product;
$sourceLocation = $stock->location;

// Cari lokasi tujuan untuk transfer
$destLocation = Location::where('id', '!=', $sourceLocation->id)->first();

echo "[1] Cek Stok Awal\n";
echo "    Produk : {$product->name}\n";
echo "    Rak Asal: {$sourceLocation->barcode} -> Stok: {$stock->quantity} pcs\n\n";

// ==========================================
// A. STOCK OPNAME (ADJUSTMENT DOWN - BARANG RUSAK/HILANG)
// ==========================================
echo "[2] Simulasi STOCK OPNAME (Barang Rusak/Hilang -2 pcs)\n";
$reqAdjDown = Request::create('/api/manual-transaction', 'POST', [
    'type' => 'ADJUSTMENT_DOWN',
    'product_id' => $product->id,
    'source_location_id' => $sourceLocation->id,
    'quantity' => 2,
    'notes' => 'Ditemukan 2 barang cacat saat audit.'
]);
$reqAdjDown->setUserResolver(function() use ($operator) { return $operator; });
$resAdjDown = json_decode($opController->submitManualTransaction($reqAdjDown)->getContent(), true);

echo "    Response: " . $resAdjDown['message'] . "\n";
$trxDown = InventoryTransaction::orderBy('created_at', 'desc')->first();
echo "    TRX Code: " . $trxDown->transaction_code . "\n";

echo "    [Manager Approval] Menyetujui Stock Opname...\n";
$reqApproveDown = Request::create("/api/approvals/{$trxDown->id}/process", 'POST', ['status' => 'APPROVED', 'notes' => 'ACC']);
$reqApproveDown->setUserResolver(function() use ($manager) { return $manager; });
$opController->approveTransaction($reqApproveDown, $trxDown->id);

$stockAfterDown = InventoryStock::find($stock->id)->quantity;
echo "    Stok saat ini: {$stockAfterDown} pcs (Berkurang 2)\n\n";

// ==========================================
// B. TRANSFER BARANG ANTAR RAK (RELOKASI)
// ==========================================
echo "[3] Simulasi TRANSFER (Relokasi Rak)\n";
$transferQty = 10;
echo "    Memindahkan {$transferQty} pcs dari {$sourceLocation->barcode} ke {$destLocation->barcode}\n";

$reqTransfer = Request::create('/api/manual-transaction', 'POST', [
    'type' => 'TRANSFER',
    'product_id' => $product->id,
    'source_location_id' => $sourceLocation->id,
    'destination_location_id' => $destLocation->id,
    'quantity' => $transferQty,
    'notes' => 'Relokasi untuk konsolidasi ruang.'
]);
$reqTransfer->setUserResolver(function() use ($operator) { return $operator; });
$resTransfer = json_decode($opController->submitManualTransaction($reqTransfer)->getContent(), true);

echo "    Response: " . $resTransfer['message'] . "\n";
$trxTransfer = InventoryTransaction::orderBy('created_at', 'desc')->first();
echo "    TRX Code: " . $trxTransfer->transaction_code . "\n";

echo "    [Manager Approval] Menyetujui Relokasi...\n";
$reqApproveTransfer = Request::create("/api/approvals/{$trxTransfer->id}/process", 'POST', ['status' => 'APPROVED', 'notes' => 'Pindah ACC']);
$reqApproveTransfer->setUserResolver(function() use ($manager) { return $manager; });
$opController->approveTransaction($reqApproveTransfer, $trxTransfer->id);

// Pengecekan Akhir
$finalSourceStock = InventoryStock::where('product_id', $product->id)->where('location_id', $sourceLocation->id)->value('quantity');
$finalDestStock = InventoryStock::where('product_id', $product->id)->where('location_id', $destLocation->id)->value('quantity');

echo "\n[4] HASIL AKHIR SETELAH SELURUH TRANSAKSI:\n";
echo "    Rak Asal ({$sourceLocation->barcode}) -> Sisa Stok: {$finalSourceStock} pcs\n";
echo "    Rak Tujuan ({$destLocation->barcode}) -> Sisa Stok: {$finalDestStock} pcs\n";
echo "===============================================\n";
echo "UJI COBA MENU LANJUTAN SELESAI\n";
