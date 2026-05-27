import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DigitalTwin from './pages/DigitalTwin';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Inbound from './pages/Inbound';
import Outbound from './pages/Outbound';
import StockOpname from './pages/StockOpname';
import Transfer from './pages/Transfer';
import SupplyChain from './pages/SupplyChain';
import Fulfillment from './pages/Fulfillment';
import Approvals from './pages/Approvals';
import MobileScanner from './pages/MobileScanner';
import './index.css';
import './App.css';

import Login from './pages/Login';

function App() {
  const token = localStorage.getItem('wms_token');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={token ? <Layout /> : <Login />}>
          <Route index element={<DigitalTwin />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="supply-chain" element={<SupplyChain />} />
          <Route path="inbound" element={<Inbound />} />
          <Route path="outbound" element={<Outbound />} />
          <Route path="stock-opname" element={<StockOpname />} />
          <Route path="transfer" element={<Transfer />} />
          <Route path="fulfillment" element={<Fulfillment />} />
          <Route path="approvals" element={<Approvals />} />
        </Route>

        {/* Fullscreen Route for Mobile Scanner / PWA */}
        <Route path="/scanner" element={<MobileScanner />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
