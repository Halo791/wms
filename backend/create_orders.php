<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use Illuminate\Support\Str;

$supplierId = (string) Str::uuid();
\Illuminate\Support\Facades\DB::table('suppliers')->insert([
    'id' => $supplierId,
    'code' => 'SUP-001',
    'name' => 'PT Global Supplier',
    'created_at' => now(),
    'updated_at' => now(),
]);

$customerId = (string) Str::uuid();
\Illuminate\Support\Facades\DB::table('customers')->insert([
    'id' => $customerId,
    'code' => 'CUST-001',
    'name' => 'Toko Maju Jaya',
    'created_at' => now(),
    'updated_at' => now(),
]);

$products = Product::inRandomOrder()->limit(3)->get();

// Create PO
$poId = (string) Str::uuid();
\Illuminate\Support\Facades\DB::table('purchase_orders')->insert([
    'id' => $poId,
    'po_number' => 'PO-DUMMY-001',
    'supplier_id' => $supplierId,
    'order_date' => now(),
    'status' => 'CONFIRMED',
    'created_at' => now(),
    'updated_at' => now(),
]);

foreach ($products as $p) {
    \Illuminate\Support\Facades\DB::table('purchase_order_items')->insert([
        'id' => (string) Str::uuid(),
        'po_id' => $poId,
        'product_id' => $p->id,
        'ordered_qty' => rand(50, 100),
        'received_qty' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

// Create SO
$soId = (string) Str::uuid();
\Illuminate\Support\Facades\DB::table('sales_orders')->insert([
    'id' => $soId,
    'so_number' => 'SO-DUMMY-001',
    'customer_id' => $customerId,
    'order_date' => now(),
    'status' => 'CONFIRMED',
    'created_at' => now(),
    'updated_at' => now(),
]);

foreach ($products as $p) {
    \Illuminate\Support\Facades\DB::table('sales_order_items')->insert([
        'id' => (string) Str::uuid(),
        'so_id' => $soId,
        'product_id' => $p->id,
        'ordered_qty' => rand(5, 20),
        'picked_qty' => 0,
        'packed_qty' => 0,
        'shipped_qty' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

echo "PO and SO Dummy Data Created!\n";
