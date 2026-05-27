<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use App\Models\Location;
use App\Models\Warehouse;
use App\Models\InventoryStock;
use App\Models\InventoryTransaction;
use Illuminate\Support\Str;
use Faker\Factory as Faker;

$faker = Faker::create('id_ID');

echo "Membuat Data Dummy Massal untuk Uji Sistem WMS...\n";

// 1. Ambil Warehouse utama
$warehouse = Warehouse::first();

// 2. Buat 50 Lokasi Rak (Locations)
$locations = [];
$zones = ['A', 'B', 'C', 'D'];
for ($i = 1; $i <= 50; $i++) {
    $zone = $faker->randomElement($zones);
    $aisle = $zone . rand(1, 9);
    $tier = 'T' . rand(1, 4);
    $bin = 'B' . rand(1, 5);
    
    $locations[] = Location::create([
        'warehouse_id' => $warehouse->id,
        'barcode' => "LOC-{$zone}-{$aisle}-{$tier}-{$bin}-" . str_pad($i, 2, '0', STR_PAD_LEFT),
        'zone' => "Area $zone",
        'aisle' => $aisle,
        'tier' => $tier,
        'bin' => $bin,
        'max_weight_kg' => $faker->randomFloat(2, 100, 1000),
        'is_active' => true,
    ]);
}
echo "- 50 Lokasi Rak berhasil dibuat.\n";

// 3. Buat 30 Produk (Products)
$products = [];
$categories = ['Electronics', 'FMCG', 'Spareparts', 'Apparel'];
$uoms = ['pcs', 'box', 'pack', 'pallet'];
for ($i = 1; $i <= 30; $i++) {
    $products[] = Product::create([
        'sku' => 'SKU-' . strtoupper($faker->bothify('???-####')),
        'barcode' => $faker->unique()->ean13(),
        'name' => 'Produk Dummy ' . $faker->words(3, true),
        'category' => $faker->randomElement($categories),
        'uom' => $faker->randomElement($uoms),
        'weight_kg' => $faker->randomFloat(2, 0.5, 20),
        'safety_stock' => rand(10, 50),
    ]);
}
echo "- 30 Produk Dummy berhasil dibuat.\n";

// 4. Sebar Stok secara Acak (Simulasi Inbound Masa Lalu)
// Kita buat 100 catatan stok acak agar ada produk yang tersebar di beberapa rak (untuk tes FIFO/Routing)
for ($i = 1; $i <= 100; $i++) {
    $product = $faker->randomElement($products);
    $location = $faker->randomElement($locations);
    
    // Jangan sampai duplikat kombinasi product & location
    $exists = InventoryStock::where('product_id', $product->id)->where('location_id', $location->id)->exists();
    if (!$exists) {
        $qty = rand(10, 200);
        
        // Simpan ke tabel stok
        $stock = InventoryStock::create([
            'product_id' => $product->id,
            'location_id' => $location->id,
            'quantity' => $qty,
            // Simulasi tanggal masuk acak selama 1 bulan terakhir untuk FIFO
            'created_at' => $faker->dateTimeBetween('-1 month', 'now') 
        ]);
        
        // Catat sebagai transaksi historis (Approved Inbound)
        InventoryTransaction::create([
            'transaction_code' => 'TRX-IN-DUMMY-' . strtoupper(Str::random(6)),
            'type' => 'INBOUND',
            'product_id' => $product->id,
            'destination_location_id' => $location->id,
            'quantity' => $qty,
            'status' => 'APPROVED',
            'notes' => 'Initial Dummy Data',
            'created_at' => $stock->created_at,
            'approved_at' => $stock->created_at
        ]);
    }
}
echo "- 100 Distribusi Stok Acak & Riwayat Transaksi berhasil dibuat (Tes FIFO siap).\n";

// 5. Tes FIFO & Picklist
$testProduct = InventoryStock::with('product')->inRandomOrder()->first()->product;
echo "\n============================================\n";
echo "UJI COBA FIFO PICKLIST DENGAN DATA DUMMY\n";
echo "============================================\n";
echo "Mencari produk: {$testProduct->name} ({$testProduct->sku})\n";
$totalStock = InventoryStock::where('product_id', $testProduct->id)->sum('quantity');
echo "Total Stok di seluruh gudang: {$totalStock} {$testProduct->uom}\n\n";

$requestData = [
    'product_id' => $testProduct->id,
    'quantity' => min(50, $totalStock) // Minta 50 pcs (atau max stok)
];
echo "Minta untuk dikeluarkan (Outbound): {$requestData['quantity']} {$testProduct->uom}\n";

$controller = new App\Http\Controllers\InventoryTransactionController();
$request = Illuminate\Http\Request::create('/api/outbound/generate-picklist', 'POST', $requestData);
$response = $controller->generatePickList($request);
$result = json_decode($response->getContent(), true);

if ($result['success']) {
    echo "Sistem berhasil menemukan rute FIFO terbaik:\n";
    foreach ($result['pick_list'] as $idx => $pick) {
        echo "  " . ($idx+1) . ". Ambil {$pick['pick_qty']} dari rak {$pick['location_barcode']} (Tgl Masuk: {$pick['fifo_date']})\n";
    }
} else {
    echo "Error: " . $result['message'] . "\n";
}

echo "============================================\n";
echo "UJI DATA DUMMY SELESAI\n";
