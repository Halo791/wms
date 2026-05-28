<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Warehouse;
use App\Models\Location;
use App\Models\Product;
use App\Models\InventoryStock;
use App\Models\Supplier;
use App\Models\Customer;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Default Users for RBAC
        User::firstOrCreate(['username' => 'superadmin'], [
            'id' => Str::uuid(),
            'full_name' => 'System Administrator',
            'email' => 'admin@wms.local',
            'password' => Hash::make('password'),
            'role' => 'superadmin',
            'is_active' => true,
        ]);

        User::firstOrCreate(['username' => 'manager'], [
            'id' => Str::uuid(),
            'full_name' => 'Warehouse Manager',
            'email' => 'manager@wms.local',
            'password' => Hash::make('password'),
            'role' => 'manager',
            'is_active' => true,
        ]);

        User::firstOrCreate(['username' => 'operator'], [
            'id' => Str::uuid(),
            'full_name' => 'Warehouse Operator',
            'email' => 'operator@wms.local',
            'password' => Hash::make('password'),
            'role' => 'operator',
            'is_active' => true,
        ]);

        // 2. Create Warehouse
        $warehouse = Warehouse::firstOrCreate(['code' => 'WH-JKT-01'], [
            'id' => Str::uuid(),
            'name' => 'gudang.hovertech Hub Jakarta Pusat',
            'address' => 'Jl. Jenderal Sudirman Kav. 21, Jakarta Pusat, DKI Jakarta',
            'is_active' => true,
        ]);

        // 3. Create Realistic Locations (ASRS Grid)
        $locationsData = [
            ['barcode' => 'LOC-A1-T1-B1', 'zone' => 'Area A (Fast Moving)', 'aisle' => 'A1', 'tier' => 'T1', 'bin' => 'B1', 'max_weight_kg' => 500.00],
            ['barcode' => 'LOC-A1-T2-B1', 'zone' => 'Area A (Fast Moving)', 'aisle' => 'A1', 'tier' => 'T2', 'bin' => 'B1', 'max_weight_kg' => 500.00],
            ['barcode' => 'LOC-B1-T1-B1', 'zone' => 'Area B (Medium Moving)', 'aisle' => 'B1', 'tier' => 'T1', 'bin' => 'B1', 'max_weight_kg' => 1000.00],
            ['barcode' => 'LOC-B2-T1-B1', 'zone' => 'Area B (Medium Moving)', 'aisle' => 'B2', 'tier' => 'T1', 'bin' => 'B1', 'max_weight_kg' => 1000.00],
            ['barcode' => 'LOC-C1-T1-B1', 'zone' => 'Area C (High Value)', 'aisle' => 'C1', 'tier' => 'T1', 'bin' => 'B1', 'max_weight_kg' => 200.00],
        ];

        $locations = [];
        foreach ($locationsData as $loc) {
            $locations[] = Location::firstOrCreate(['barcode' => $loc['barcode']], array_merge(['id' => Str::uuid(), 'warehouse_id' => $warehouse->id, 'is_active' => true], $loc));
        }

        // 4. Create Realistic Electronics Products
        $productsData = [
            ['sku' => 'PRD-ELC-001', 'barcode' => '899123456001', 'name' => 'Apple MacBook Pro M3 Max 16-inch', 'category' => 'A', 'uom' => 'unit', 'safety_stock' => 5, 'weight_kg' => 2.15],
            ['sku' => 'PRD-ELC-002', 'barcode' => '899123456002', 'name' => 'Sony PlayStation 5 Disc Edition', 'category' => 'A', 'uom' => 'unit', 'safety_stock' => 10, 'weight_kg' => 4.5],
            ['sku' => 'PRD-ELC-003', 'barcode' => '899123456003', 'name' => 'Samsung Odyssey G9 49" OLED Monitor', 'category' => 'B', 'uom' => 'unit', 'safety_stock' => 3, 'weight_kg' => 12.0],
            ['sku' => 'PRD-ELC-004', 'barcode' => '899123456004', 'name' => 'Logitech MX Master 3S Wireless Mouse', 'category' => 'A', 'uom' => 'pcs', 'safety_stock' => 20, 'weight_kg' => 0.14],
            ['sku' => 'PRD-ELC-005', 'barcode' => '899123456005', 'name' => 'NVIDIA GeForce RTX 4090 24GB GDDR6X', 'category' => 'C', 'uom' => 'pcs', 'safety_stock' => 2, 'weight_kg' => 2.5],
            ['sku' => 'PRD-ELC-006', 'barcode' => '899123456006', 'name' => 'Keychron Q1 Pro Mechanical Keyboard', 'category' => 'A', 'uom' => 'pcs', 'safety_stock' => 15, 'weight_kg' => 1.7],
            ['sku' => 'PRD-ELC-007', 'barcode' => '899123456007', 'name' => 'Apple iPad Pro 13-inch M4 (2024)', 'category' => 'A', 'uom' => 'unit', 'safety_stock' => 8, 'weight_kg' => 0.58],
            ['sku' => 'PRD-ELC-008', 'barcode' => '899123456008', 'name' => 'Dyson V15 Detect Absolute Vacuum', 'category' => 'B', 'uom' => 'unit', 'safety_stock' => 5, 'weight_kg' => 3.1],
        ];

        $products = [];
        foreach ($productsData as $prod) {
            $products[] = Product::firstOrCreate(['sku' => $prod['sku']], array_merge(['id' => Str::uuid()], $prod));
        }

        // 5. Create Suppliers
        $supplier1 = Supplier::firstOrCreate(['code' => 'SUP-APPLE'], [
            'id' => Str::uuid(),
            'name' => 'Apple Indonesia (PT. Teletama Artha Mandiri)',
            'contact_person' => 'Budi Santoso',
            'email' => 'budi.s@tam.co.id',
            'phone' => '021-555-0101',
            'address' => 'Gedung Erajaya Plaza, Jakarta Barat',
        ]);

        $supplier2 = Supplier::firstOrCreate(['code' => 'SUP-SONY'], [
            'id' => Str::uuid(),
            'name' => 'Sony Electronics Asia Pacific',
            'contact_person' => 'Kenji Tanaka',
            'email' => 'kenji.t@sony.ap.com',
            'phone' => '+65-6544-8000',
            'address' => '315 Alexandra Road, Singapore',
        ]);

        $supplier3 = Supplier::firstOrCreate(['code' => 'SUP-SAMSUNG'], [
            'id' => Str::uuid(),
            'name' => 'Samsung Electronics Indonesia (SEIN)',
            'contact_person' => 'Dian Sastrowardoyo',
            'email' => 'b2b.dian@samsung.com',
            'phone' => '021-555-0202',
            'address' => 'World Trade Center Jakarta, Kav 29-31',
        ]);

        // 6. Create Customers
        $customer1 = Customer::firstOrCreate(['code' => 'CUS-ERA'], [
            'id' => Str::uuid(),
            'name' => 'Erafone Megastore (PT Erajaya Swasembada)',
            'contact_person' => 'Andi Susanto',
            'email' => 'andi.procurement@erafone.com',
            'phone' => '021-777-1111',
            'address' => 'Kelapa Gading Mall 3, Jakarta Utara',
        ]);

        $customer2 = Customer::firstOrCreate(['code' => 'CUS-ELC'], [
            'id' => Str::uuid(),
            'name' => 'Electronic City Indonesia',
            'contact_person' => 'Rini Yuliana',
            'email' => 'rini.y@electronic-city.co.id',
            'phone' => '021-777-2222',
            'address' => 'SCBD Lot 22, Jakarta Selatan',
        ]);

        // 7. Create Stock
        // Distribute stocks randomly among locations
        DB::table('inventory_stocks')->truncate(); // Clear old stocks
        foreach ($products as $index => $prod) {
            InventoryStock::create([
                'id' => Str::uuid(),
                'product_id' => $prod->id,
                'location_id' => $locations[$index % count($locations)]->id,
                'quantity' => rand(15, 50),
            ]);
        }

        // 8. Create Purchase Orders (Inbound)
        $po1 = PurchaseOrder::firstOrCreate(['po_number' => 'PO-2024-001'], [
            'id' => Str::uuid(),
            'supplier_id' => $supplier1->id,
            'status' => 'CONFIRMED',
            'order_date' => now()->subDays(1),
            'expected_arrival' => now()->addDays(2),
        ]);
        
        PurchaseOrderItem::firstOrCreate(['po_id' => $po1->id, 'product_id' => $products[0]->id], [
            'id' => Str::uuid(),
            'ordered_qty' => 50,
            'received_qty' => 0,
        ]);
        PurchaseOrderItem::firstOrCreate(['po_id' => $po1->id, 'product_id' => $products[6]->id], [
            'id' => Str::uuid(),
            'ordered_qty' => 30,
            'received_qty' => 0,
        ]);

        $po2 = PurchaseOrder::firstOrCreate(['po_number' => 'PO-2024-002'], [
            'id' => Str::uuid(),
            'supplier_id' => $supplier2->id,
            'status' => 'RECEIVING',
            'order_date' => now()->subDays(5),
            'expected_arrival' => now()->subDays(1), // Overdue/Arrived
        ]);

        PurchaseOrderItem::firstOrCreate(['po_id' => $po2->id, 'product_id' => $products[1]->id], [
            'id' => Str::uuid(),
            'ordered_qty' => 100,
            'received_qty' => 20, // Partially received
        ]);

        // 9. Create Sales Orders (Outbound)
        $so1 = SalesOrder::firstOrCreate(['so_number' => 'SO-2024-001'], [
            'id' => Str::uuid(),
            'customer_id' => $customer1->id,
            'status' => 'CONFIRMED',
            'order_date' => now()->subDays(1),
            'ship_by_date' => now()->addDays(3),
        ]);

        SalesOrderItem::firstOrCreate(['so_id' => $so1->id, 'product_id' => $products[1]->id], [
            'id' => Str::uuid(),
            'ordered_qty' => 10,
            'picked_qty' => 0,
        ]);
        SalesOrderItem::firstOrCreate(['so_id' => $so1->id, 'product_id' => $products[3]->id], [
            'id' => Str::uuid(),
            'ordered_qty' => 25,
            'picked_qty' => 0,
        ]);

        $so2 = SalesOrder::firstOrCreate(['so_number' => 'SO-2024-002'], [
            'id' => Str::uuid(),
            'customer_id' => $customer2->id,
            'status' => 'PICKING',
            'order_date' => now()->subDays(2),
            'ship_by_date' => now()->addDays(1),
        ]);

        SalesOrderItem::firstOrCreate(['so_id' => $so2->id, 'product_id' => $products[2]->id], [
            'id' => Str::uuid(),
            'ordered_qty' => 2,
            'picked_qty' => 0,
        ]);
    }
}
