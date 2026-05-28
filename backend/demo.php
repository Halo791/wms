<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use App\Models\Location;
use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\InventoryTransactionController;
use App\Http\Controllers\OperationalController;
use App\Models\InventoryStock;
use App\Models\InventoryTransaction;

echo "===============================================\n";
echo "gudang.hovertech - SIMULASI E2E DEMO (INBOUND & OUTBOUND)\n";
echo "===============================================\n\n";

$operator = User::where('role', 'operator')->first();
$manager = User::where('role', 'manager')->first();

$product = Product::where('sku', 'PRD-ELC-001')->first();
$location = Location::where('barcode', 'LOC-A1-T1-B1')->first();

echo "[1] Cek Stok Awal\n";
$initialStock = InventoryStock::where('product_id', $product->id)->where('location_id', $location->id)->sum('quantity');
echo "    Stok awal " . $product->name . " di rak " . $location->barcode . ": " . $initialStock . " pcs\n\n";

echo "[2] Simulasi INBOUND (Penerimaan Barang)\n";
$controller = new InventoryTransactionController();

$inboundRequest = Request::create('/api/mobile/putaway/submit', 'POST', [
    'location_id' => $location->id,
    'scanned_items' => [
        ['barcode' => $product->barcode, 'quantity' => 10]
    ]
]);
$inboundRequest->setUserResolver(function() use ($operator) { return $operator; });

$inboundResponse = $controller->putaway($inboundRequest);
$inboundData = json_decode($inboundResponse->getContent(), true);
echo "    Response: " . $inboundData['message'] . "\n";
echo "    TRX Code: " . $inboundData['transaction_code'] . "\n\n";

echo "[3] Approval INBOUND oleh Manager\n";
$trxIn = InventoryTransaction::where('transaction_code', $inboundData['transaction_code'])->first();
$opController = new OperationalController();
$approveRequest = Request::create("/api/approvals/{$trxIn->id}/process", 'POST', ['status' => 'APPROVED']);
$approveRequest->setUserResolver(function() use ($manager) { return $manager; });
$approveResponse = $opController->approveTransaction($approveRequest, $trxIn->id);
echo "    Approval Response: " . $approveResponse->getContent() . "\n";
echo "    Manager telah meng-approve TRX INBOUND.\n";

$currentStock = InventoryStock::where('product_id', $product->id)->where('location_id', $location->id)->sum('quantity');
echo "    Stok sekarang: " . $currentStock . " pcs (Bertambah 10)\n\n";

echo "[4] Simulasi OUTBOUND (Generate Picklist)\n";
$pickRequest = Request::create('/api/outbound/generate-picklist', 'POST', [
    'product_id' => $product->id,
    'quantity' => 5
]);
$pickResponse = $controller->generatePickList($pickRequest);
$pickData = json_decode($pickResponse->getContent(), true);
echo "    Sistem membuat rute FIFO: Ambil 5 pcs dari lokasi " . $pickData['pick_list'][0]['location_barcode'] . "\n\n";

echo "[5] Simulasi OUTBOUND (Execute Picking)\n";
$outRequest = Request::create('/api/outbound/execute-picking', 'POST', [
    'product_id' => $product->id,
    'reference_document' => 'SO-DEMO-001',
    'pick_items' => [
        [
            'stock_id' => $pickData['pick_list'][0]['stock_id'],
            'pick_qty' => 5
        ]
    ]
]);
$outRequest->setUserResolver(function() use ($operator) { return $operator; });
$outResponse = $controller->picking($outRequest);
$outData = json_decode($outResponse->getContent(), true);
echo "    Response: " . $outData['message'] . "\n";
echo "    TRX Code: " . $outData['transaction_code'] . "\n\n";

echo "[6] Approval OUTBOUND oleh Manager\n";
$trxOut = InventoryTransaction::where('transaction_code', $outData['transaction_code'])->first();
$approveOutRequest = Request::create("/api/approvals/{$trxOut->id}/process", 'POST', ['status' => 'APPROVED']);
$approveOutRequest->setUserResolver(function() use ($manager) { return $manager; });
$approveOutResponse = $opController->approveTransaction($approveOutRequest, $trxOut->id);
echo "    Approval Response: " . $approveOutResponse->getContent() . "\n";
echo "    Manager telah meng-approve TRX OUTBOUND.\n\n";

echo "[7] Cek Stok Akhir\n";
$finalStock = InventoryStock::where('product_id', $product->id)->where('location_id', $location->id)->sum('quantity');
echo "    Stok akhir " . $product->name . " di rak " . $location->barcode . ": " . $finalStock . " pcs (Berkurang 5)\n";
echo "===============================================\n";
echo "DEMO SELESAI\n";
