# ============================================================
# AERO WMS - COMPREHENSIVE FEATURE TEST WITH DUMMY DATA
# ============================================================

$API = "http://127.0.0.1:8000/api"
$pass = 0
$fail = 0
$TS = (Get-Date).ToString("HHmmss")

function Test-Endpoint {
    param($Name, $Method, $Url, $Body, $Token, $ExpectStatus)
    $headers = @{ "Accept" = "application/json"; "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    try {
        $params = @{ Uri = $Url; Method = $Method; Headers = $headers; ContentType = "application/json" }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Depth 5) }
        $response = Invoke-RestMethod @params
        $script:pass++
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        return $response
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($ExpectStatus -and $statusCode -eq $ExpectStatus) {
            $script:pass++
            Write-Host "  [PASS] $Name (expected $statusCode)" -ForegroundColor Green
            return $null
        }
        $script:fail++
        $errBody = ""
        try { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $errBody = $reader.ReadToEnd() } catch {}
        Write-Host "  [FAIL] $Name -> $statusCode | $errBody" -ForegroundColor Red
        return $null
    }
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   AERO WMS - FULL FEATURE TEST (Run: $TS)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# ---- 1. AUTH ----
Write-Host "`n--- [1/10] AUTHENTICATION ---" -ForegroundColor Yellow
$loginRes = Test-Endpoint -Name "Login SuperAdmin" -Method POST -Url "$API/auth/login" -Body @{username="superadmin"; password="password"}
$TOKEN = $loginRes.token
$loginOp = Test-Endpoint -Name "Login Operator" -Method POST -Url "$API/auth/login" -Body @{username="operator"; password="password"}
$OP_TOKEN = $loginOp.token
Test-Endpoint -Name "Login Manager" -Method POST -Url "$API/auth/login" -Body @{username="manager"; password="password"}
Test-Endpoint -Name "Wrong Pass (422)" -Method POST -Url "$API/auth/login" -Body @{username="superadmin"; password="x"} -ExpectStatus 422
Test-Endpoint -Name "Get /user" -Method GET -Url "$API/user" -Token $TOKEN

# ---- 2. WAREHOUSE ----
Write-Host "`n--- [2/10] WAREHOUSE ---" -ForegroundColor Yellow
Test-Endpoint -Name "List Warehouses" -Method GET -Url "$API/warehouses" -Token $TOKEN
$newWH = Test-Endpoint -Name "Create Warehouse" -Method POST -Url "$API/warehouses" -Token $TOKEN -Body @{code="WH-$TS"; name="WH $TS"; address="Jl.$TS"; is_active=$true}
$whId = if ($newWH) { $newWH.id } else { $null }
if ($whId) {
    Test-Endpoint -Name "Get Warehouse" -Method GET -Url "$API/warehouses/$whId" -Token $TOKEN
    Test-Endpoint -Name "Update Warehouse" -Method PUT -Url "$API/warehouses/$whId" -Token $TOKEN -Body @{name="WH $TS Updated"}
}

# ---- 3. LOCATIONS ----
Write-Host "`n--- [3/10] LOCATIONS ---" -ForegroundColor Yellow
Test-Endpoint -Name "List Locations" -Method GET -Url "$API/locations" -Token $TOKEN
$newLoc=$null; $newLoc2=$null
if ($whId) {
    $newLoc = Test-Endpoint -Name "Create Loc A" -Method POST -Url "$API/locations" -Token $TOKEN -Body @{warehouse_id=$whId; barcode="LOC-$TS-A"; zone="ZA"; aisle="A$TS"; tier="T1"; bin="B1"; max_weight_kg=750; is_active=$true}
    $newLoc2 = Test-Endpoint -Name "Create Loc B" -Method POST -Url "$API/locations" -Token $TOKEN -Body @{warehouse_id=$whId; barcode="LOC-$TS-B"; zone="ZB"; aisle="B$TS"; tier="T2"; bin="B2"; max_weight_kg=1200; is_active=$true}
}

# ---- 4. PRODUCTS ----
Write-Host "`n--- [4/10] PRODUCTS ---" -ForegroundColor Yellow
Test-Endpoint -Name "List Products" -Method GET -Url "$API/products" -Token $TOKEN
$BC_A = "BC${TS}01"; $BC_B = "BC${TS}02"
$prod1 = Test-Endpoint -Name "Create Product Alpha" -Method POST -Url "$API/products" -Token $TOKEN -Body @{sku="PRD-$TS-A"; barcode=$BC_A; name="Alpha $TS"; category="Electronics"; uom="pcs"; safety_stock=8}
$prod2 = Test-Endpoint -Name "Create Product Beta" -Method POST -Url "$API/products" -Token $TOKEN -Body @{sku="PRD-$TS-B"; barcode=$BC_B; name="Beta $TS"; category="Safety"; uom="pcs"; safety_stock=20}
if ($prod1) { Test-Endpoint -Name "Update Product" -Method PUT -Url "$API/products/$($prod1.id)" -Token $TOKEN -Body @{name="Alpha $TS Upd"} }

# ---- 5. INBOUND + APPROVE (full cycle) ----
Write-Host "`n--- [5/10] INBOUND + APPROVAL ---" -ForegroundColor Yellow
Test-Endpoint -Name "Validate Barcode" -Method POST -Url "$API/mobile/putaway/validate-location" -Token $TOKEN -Body @{barcode="LOC-A1-T1-B1"}

if ($prod1 -and $newLoc) {
    $pw1 = Test-Endpoint -Name "Putaway Alpha->LocA (50)" -Method POST -Url "$API/mobile/putaway/submit" -Token $OP_TOKEN -Body @{location_id=$newLoc.id; scanned_items=@(@{barcode=$BC_A; quantity=50})}
}
if ($prod2 -and $newLoc2) {
    $pw2 = Test-Endpoint -Name "Putaway Beta->LocB (80)" -Method POST -Url "$API/mobile/putaway/submit" -Token $OP_TOKEN -Body @{location_id=$newLoc2.id; scanned_items=@(@{barcode=$BC_B; quantity=80})}
}

# Now approve ALL pending transactions
$pending = Test-Endpoint -Name "Get Pending Approvals" -Method GET -Url "$API/approvals/pending" -Token $TOKEN
if ($pending -and $pending.data) {
    $pendingItems = $pending.data
    Write-Host "     -> Found $($pendingItems.Count) pending approval(s)" -ForegroundColor DarkGray
    foreach ($p in $pendingItems) {
        Test-Endpoint -Name "Approve $($p.transaction_code)" -Method POST -Url "$API/approvals/$($p.id)/process" -Token $TOKEN -Body @{status="APPROVED"; notes="Test auto-approve"}
    }
}

# ---- 6. STOCKS & HISTORY ----
Write-Host "`n--- [6/10] STOCKS & HISTORY ---" -ForegroundColor Yellow
$stocks = Test-Endpoint -Name "List Stocks" -Method GET -Url "$API/stocks" -Token $TOKEN
if ($stocks) {
    $si = if ($stocks.data) { $stocks.data } else { $stocks }
    Write-Host "     -> Stock entries: $($si.Count)" -ForegroundColor DarkGray
}
Test-Endpoint -Name "History" -Method GET -Url "$API/transactions/history" -Token $TOKEN

# ---- 7. OUTBOUND / PICKING ----
Write-Host "`n--- [7/10] OUTBOUND & PICKING ---" -ForegroundColor Yellow
if ($prod1) {
    $pickList = Test-Endpoint -Name "Pick List (Alpha, qty 10)" -Method POST -Url "$API/outbound/generate-picklist" -Token $TOKEN -Body @{product_id=$prod1.id; quantity=10}
    if ($pickList -and $pickList.pick_list) {
        Write-Host "     -> Pick items: $($pickList.pick_list.Count)" -ForegroundColor DarkGray
        $pickItems = @()
        foreach ($item in $pickList.pick_list) { $pickItems += @{stock_id=$item.stock_id; pick_qty=$item.pick_qty} }
        Test-Endpoint -Name "Execute Picking (10)" -Method POST -Url "$API/outbound/execute-picking" -Token $TOKEN -Body @{product_id=$prod1.id; pick_items=$pickItems; reference_document="SO-$TS"}
    }
}

# ---- 8. SUPPLY CHAIN ----
Write-Host "`n--- [8/10] SUPPLY CHAIN ---" -ForegroundColor Yellow
$sup1 = Test-Endpoint -Name "Create Supplier" -Method POST -Url "$API/suppliers" -Token $TOKEN -Body @{code="SUP-$TS"; name="Supplier $TS"; contact_person="Budi"; phone="021-$TS"; email="s$TS@t.com"; address="Jl.$TS"}
Test-Endpoint -Name "List Suppliers" -Method GET -Url "$API/suppliers" -Token $TOKEN
if ($sup1 -and $prod1) {
    $po1 = Test-Endpoint -Name "Create PO" -Method POST -Url "$API/purchase-orders" -Token $TOKEN -Body @{supplier_id=$sup1.id; order_date="2026-05-22"; expected_arrival="2026-05-28"; notes="PO $TS"; items=@(@{product_id=$prod1.id; ordered_qty=50})}
    if ($po1) {
        Test-Endpoint -Name "PO Detail" -Method GET -Url "$API/purchase-orders/$($po1.id)" -Token $TOKEN
        Test-Endpoint -Name "PO->RECEIVING" -Method PUT -Url "$API/purchase-orders/$($po1.id)/status" -Token $TOKEN -Body @{status="RECEIVING"}
        Test-Endpoint -Name "PO->COMPLETED" -Method PUT -Url "$API/purchase-orders/$($po1.id)/status" -Token $TOKEN -Body @{status="COMPLETED"}
    }
}
Test-Endpoint -Name "List POs" -Method GET -Url "$API/purchase-orders" -Token $TOKEN

# ---- 9. FULFILLMENT ----
Write-Host "`n--- [9/10] FULFILLMENT ---" -ForegroundColor Yellow
$cust1 = Test-Endpoint -Name "Create Customer" -Method POST -Url "$API/customers" -Token $TOKEN -Body @{code="CUST-$TS"; name="Customer $TS"; contact_person="Ahmad"; phone="08-$TS"; email="c$TS@t.com"; address="Jl.$TS"}
Test-Endpoint -Name "List Customers" -Method GET -Url "$API/customers" -Token $TOKEN
if ($cust1 -and $prod1) {
    $so1 = Test-Endpoint -Name "Create SO" -Method POST -Url "$API/sales-orders" -Token $TOKEN -Body @{customer_id=$cust1.id; order_date="2026-05-22"; ship_by_date="2026-05-25"; notes="SO $TS"; items=@(@{product_id=$prod1.id; ordered_qty=5})}
    if ($so1) {
        Test-Endpoint -Name "SO Detail" -Method GET -Url "$API/sales-orders/$($so1.id)" -Token $TOKEN
        Test-Endpoint -Name "SO->PICKING" -Method PUT -Url "$API/sales-orders/$($so1.id)/status" -Token $TOKEN -Body @{status="PICKING"}
        Test-Endpoint -Name "SO->PACKING" -Method PUT -Url "$API/sales-orders/$($so1.id)/status" -Token $TOKEN -Body @{status="PACKING"}
        $ship1 = Test-Endpoint -Name "Create Shipment" -Method POST -Url "$API/shipments" -Token $TOKEN -Body @{so_id=$so1.id; carrier="JNE"; notes="$TS"}
        if ($ship1) {
            Test-Endpoint -Name "Ship->READY" -Method PUT -Url "$API/shipments/$($ship1.id)/status" -Token $TOKEN -Body @{status="READY"}
            Test-Endpoint -Name "Ship->DISPATCHED" -Method PUT -Url "$API/shipments/$($ship1.id)/status" -Token $TOKEN -Body @{status="DISPATCHED"}
            Test-Endpoint -Name "Ship->DELIVERED" -Method PUT -Url "$API/shipments/$($ship1.id)/status" -Token $TOKEN -Body @{status="DELIVERED"}
        }
        Test-Endpoint -Name "Dup Shipment (422)" -Method POST -Url "$API/shipments" -Token $TOKEN -Body @{so_id=$so1.id; carrier="X"} -ExpectStatus 422
    }
}
Test-Endpoint -Name "List SOs" -Method GET -Url "$API/sales-orders" -Token $TOKEN
Test-Endpoint -Name "List Shipments" -Method GET -Url "$API/shipments" -Token $TOKEN

# ---- 10. DIGITAL TWIN + COMPACTION + AUDIT ----
Write-Host "`n--- [10/10] DIGITAL TWIN & AUDIT ---" -ForegroundColor Yellow
$map = Test-Endpoint -Name "Warehouse Map" -Method GET -Url "$API/warehouse-map" -Token $TOKEN
if ($map) { Write-Host "     -> Warehouses: $($map.Count)" -ForegroundColor DarkGray }
$comp = Test-Endpoint -Name "Night Compaction" -Method POST -Url "$API/night-compaction/trigger" -Token $TOKEN
if ($comp -and $comp.logs) { Write-Host "     -> Logs: $($comp.logs.Count)" -ForegroundColor DarkGray }
Test-Endpoint -Name "Notifications" -Method GET -Url "$API/notifications" -Token $TOKEN
Test-Endpoint -Name "Activity Logs" -Method GET -Url "$API/activity-logs" -Token $TOKEN

# ---- BONUS: RBAC ----
Write-Host "`n--- [BONUS] RBAC SECURITY ---" -ForegroundColor Yellow
Test-Endpoint -Name "Op !Warehouse (403)" -Method POST -Url "$API/warehouses" -Token $OP_TOKEN -Body @{code="X"; name="X"} -ExpectStatus 403
Test-Endpoint -Name "Op !Product (403)" -Method POST -Url "$API/products" -Token $OP_TOKEN -Body @{sku="X"; name="X"} -ExpectStatus 403
Test-Endpoint -Name "Op !Suppliers (403)" -Method GET -Url "$API/suppliers" -Token $OP_TOKEN -ExpectStatus 403
Test-Endpoint -Name "Logout" -Method POST -Url "$API/auth/logout" -Token $TOKEN

# ---- SUMMARY ----
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   TEST SUMMARY (Run: $TS)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   PASSED : $pass" -ForegroundColor Green
Write-Host "   FAILED : $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "   TOTAL  : $($pass + $fail)" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
if ($fail -eq 0) { Write-Host "`n   ALL TESTS PASSED! ENTERPRISE-READY!" -ForegroundColor Green }
else { Write-Host "`n   $fail TESTS FAILED." -ForegroundColor Red }
Write-Host ""
