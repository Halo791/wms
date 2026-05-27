<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use App\Models\Location;
use App\Models\InventoryStock;
use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\InventoryTransactionController;
use App\Http\Controllers\OperationalController;

echo "===============================================\n";
echo "AERO WMS - STRESS TEST & BUG HUNTER\n";
echo "===============================================\n\n";

$operator = User::where('role', 'operator')->first();
$opController = new OperationalController();
$invController = new InventoryTransactionController();
$bugsFound = 0;

$product = Product::first();
$location = Location::first();

// TEST 1: Request Pick List for an item that has 0 stock (or requests more than exists)
echo "[TEST 1] Outbound Picklist: Meminta stok jauh lebih besar dari yang ada di gudang (Misal: 999999 pcs)\n";
$req1 = Request::create('/api/outbound/generate-picklist', 'POST', [
    'product_id' => $product->id,
    'quantity' => 999999
]);
$req1->setUserResolver(function() use ($operator) { return $operator; });
$res1 = $invController->generatePickList($req1);
$res1Data = json_decode($res1->getContent(), true);

if ($res1->status() == 500) {
    echo "  -> BUG DITEMUKAN! Sistem Crash 500: " . $res1Data['message'] . "\n";
    $bugsFound++;
} else if ($res1Data['success'] == false) {
    echo "  -> Aman. Sistem menolak dengan elegan: " . $res1Data['message'] . "\n";
}

// TEST 2: Submit Manual Transaction (Transfer) with identical source and destination
echo "\n[TEST 2] Transfer Relokasi: Memindahkan barang ke rak yang sama persis\n";
$req2 = Request::create('/api/manual-transaction', 'POST', [
    'type' => 'TRANSFER',
    'product_id' => $product->id,
    'quantity' => 10,
    'source_location_id' => $location->id,
    'destination_location_id' => $location->id, // SAMA
    'notes' => 'Hack transfer'
]);
$req2->setUserResolver(function() use ($operator) { return $operator; });
$res2 = $opController->submitManualTransaction($req2);
$res2Data = json_decode($res2->getContent(), true);

// Secara logika, transfer ke rak yang sama tidak boleh
if ($res2Data['success'] == true) {
    echo "  -> BUG DITEMUKAN! Sistem mengizinkan memindahkan barang ke rak yang sama!\n";
    $bugsFound++;
} else {
    echo "  -> Aman. Sistem memblokir / error: " . ($res2Data['message'] ?? 'Error') . "\n";
}

// TEST 3: Submit Manual Transaction with Negative Quantity
echo "\n[TEST 3] Form Input Hack: Mengirim nilai minus (-50 pcs) pada form Inbound/Transfer\n";
$req3 = Request::create('/api/manual-transaction', 'POST', [
    'type' => 'ADJUSTMENT_UP',
    'product_id' => $product->id,
    'quantity' => -50,
    'notes' => 'Hack qty negatif'
]);
$req3->setUserResolver(function() use ($operator) { return $operator; });
// Bypass Laravel Validation for a direct test (Simulating postman or buggy frontend)
// Instead of calling controller which triggers validation, let's see if the validator throws 422
try {
    $res3 = $opController->submitManualTransaction($req3);
    $res3Data = json_decode($res3->getContent(), true);
    if (isset($res3Data['success']) && $res3Data['success'] == true) {
        echo "  -> BUG FATAL DITEMUKAN! Sistem mengizinkan penambahan kuantitas minus!\n";
        $bugsFound++;
    } else {
        echo "  -> Aman. Ditolak oleh sistem.\n";
    }
} catch (\Illuminate\Validation\ValidationException $e) {
    echo "  -> Aman. Ditolak oleh Laravel Validator: " . collect($e->errors())->flatten()->first() . "\n";
}

// TEST 4: Execute Putaway with non-existent barcode
echo "\n[TEST 4] Execute Putaway dengan Barcode Lokasi Palsu / Dihapus\n";
$req4 = Request::create('/api/inbound/putaway', 'POST', [
    'location_id' => 'GHOST-LOCATION-999',
    'scanned_items' => [
        ['barcode' => $product->barcode, 'quantity' => 10]
    ]
]);
$req4->setUserResolver(function() use ($operator) { return $operator; });
try {
    $res4 = $invController->putaway($req4);
    $res4Data = json_decode($res4->getContent(), true);
    if ($res4Data['success'] == true) {
        echo "  -> BUG DITEMUKAN! Sistem mengizinkan barang masuk ke dimensi ghaib (lokasi tak ada)!\n";
        $bugsFound++;
    } else {
        echo "  -> Aman. Ditolak sistem: " . $res4Data['message'] . "\n";
    }
} catch (\Exception $e) {
    echo "  -> Aman. Crash ditangkap: " . $e->getMessage() . "\n";
}

// TEST 5: Double Scanner / Duplicate Request Simulation (1 Millisecond gap)
// We already have a 1 minute duplicate block, let's test if it works.
echo "\n[TEST 5] Double Scan Glitch: Barcode Scanner rusak menscan 2 kali dalam 1 detik\n";
$req5 = Request::create('/api/inbound/putaway', 'POST', [
    'location_id' => $location->id,
    'scanned_items' => [
        ['barcode' => $product->barcode, 'quantity' => 5]
    ],
    'reference_document' => 'PO-TEST-DBL'
]);
$req5->setUserResolver(function() use ($operator) { return $operator; });
$invController->putaway($req5); // First scan
$res5b = $invController->putaway($req5); // Second identical scan instantly
$res5bData = json_decode($res5b->getContent(), true);
if ($res5bData['success'] == true) {
    echo "  -> BUG DITEMUKAN! Sistem mencatat duplikat (Double Scan tidak keblokir)!\n";
    $bugsFound++;
} else {
    echo "  -> Aman. Blokir duplikat berfungsi: " . $res5bData['message'] . "\n";
}

echo "\n===============================================\n";
echo "Total BUG yang berhasil dibobol: $bugsFound\n";
echo "===============================================\n";
