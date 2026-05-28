import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PackageSearch, RefreshCw, Filter, ShieldCheck, MapPin, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import './Inventory.css';

const Inventory = () => {
  const location = useLocation();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Advanced Filter states
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    fetchStocks();
    const params = new URLSearchParams(location.search);
    const searchVal = params.get('search');
    if (searchVal) {
      setSearchTerm(searchVal);
    }
  }, [location.search]);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const data = await api.getStocks();
      setStocks(data || []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStocks = stocks.filter(stock => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      (stock.product && stock.product.name.toLowerCase().includes(term)) ||
      (stock.product && stock.product.sku.toLowerCase().includes(term)) ||
      (stock.location && stock.location.barcode.toLowerCase().includes(term))
    );
    const matchesZone = selectedZone === 'ALL' || (stock.location && stock.location.zone === selectedZone);
    const matchesCategory = selectedCategory === 'ALL' || (stock.product && stock.product.category === selectedCategory);
    return matchesSearch && matchesZone && matchesCategory;
  });

  // Extract unique zones and categories from data dynamically
  const uniqueZones = Array.from(new Set(stocks.map(s => s.location?.zone).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(stocks.map(s => s.product?.category).filter(Boolean)));

  return (
    <div className="inventory-container">
      <div className="page-header">
        <div className="header-title">
          <div className="icon-wrapper bg-primary-transparent">
            <PackageSearch size={24} className="text-primary" />
          </div>
          <div>
            <h2>Stok Barang (FIFO)</h2>
            <p className="text-muted">Pantau status stok fisik secara real-time, koordinasi ASRS, dan penempatan rak.</p>
          </div>
        </div>
        <div className="header-actions-inventory">
          <button className="secondary-btn" onClick={fetchStocks} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            <span>Sync gudang.hovertech</span>
          </button>
          <button 
            className={`primary-btn ${showAdvanced ? 'active-filter' : ''}`} 
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ background: showAdvanced ? 'var(--primary-dark)' : '' }}
          >
            <Filter size={20} />
            <span>Advanced Filter</span>
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="glass" style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Zona Lokasi</label>
            <select 
              value={selectedZone} 
              onChange={e => setSelectedZone(e.target.value)} 
              style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', minWidth: '150px' }}
            >
              <option value="ALL">Semua Zona</option>
              {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kategori Produk</label>
            <select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)} 
              style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', minWidth: '150px' }}
            >
              <option value="ALL">Semua Kategori</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button 
            className="secondary-btn" 
            style={{ marginTop: 'auto', padding: '0.5rem 1rem' }} 
            onClick={() => { setSelectedZone('ALL'); setSelectedCategory('ALL'); }}
          >
            Reset
          </button>
        </div>
      )}

      <div className="glass table-card">
        <div className="table-toolbar">
          <div className="search-box">
            <MapPin size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan Location Barcode, SKU, atau Nama..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="system-status">
            <div className="status-indicator">
              <span className="pulse-dot green"></span>
              <span>ProfiNET: Online</span>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Location Coordinate</th>
                <th>SKU & Product</th>
                <th>Zone / Tier</th>
                <th>Stock Qty</th>
                <th>Validation</th>
                <th className="text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">
                    <div className="table-loading-state">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                      <div className="table-state-title">Sinkronisasi Data</div>
                      <div className="table-state-desc">Mengambil data real-time dari Siemens PLC...</div>
                    </div>
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="table-empty-state">
                      <PackageSearch />
                      <div className="table-state-title">Tidak ada data stok</div>
                      <div className="table-state-desc">Ubah kriteria pencarian atau sinkronisasikan ulang dengan gudang.hovertech.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStocks.map(stock => {
                  const isLowStock = stock.product && stock.quantity < (stock.product.safety_stock || 0);
                  return (
                    <tr key={stock.id}>
                      <td>
                        <div className="location-barcode">
                          <MapPin size={14} className="text-muted" />
                          <span className="font-medium">{stock.location ? stock.location.barcode : 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{stock.product ? stock.product.sku : 'N/A'}</div>
                        <div className="text-muted" style={{fontSize: '0.8rem'}}>{stock.product ? stock.product.name : 'Unknown'}</div>
                      </td>
                      <td>
                        <div className="zone-info">
                          <span className="badge-zone">{stock.location ? stock.location.zone : 'N/A'}</span>
                          <span className="text-muted text-sm ml-2">Tier: {stock.location ? stock.location.tier : '-'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="stock-quantity font-bold">{stock.quantity}</span>
                        <span className="text-muted text-sm ml-1">{stock.product ? stock.product.uom : 'pcs'}</span>
                      </td>
                      <td>
                        {isLowStock ? (
                          <div className="validation-status warning" style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <AlertTriangle size={16} />
                            <span>Stok Kritis</span>
                          </div>
                        ) : (
                          <div className="validation-status success" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <ShieldCheck size={16} />
                            <span>Verified</span>
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="text-muted" style={{fontSize: '0.85rem'}}>
                          {new Date(stock.updated_at || stock.created_at).toLocaleString('id-ID')}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
