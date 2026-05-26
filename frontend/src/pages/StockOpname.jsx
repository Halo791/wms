import React, { useState, useEffect } from 'react';
import { ClipboardCheck, RefreshCw, Search, CheckCircle2, AlertTriangle, Send, Filter } from 'lucide-react';
import api from '../services/api';
import './StockOpname.css';

const StockOpname = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [opnameData, setOpnameData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { fetchStocks(); }, []);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const data = await api.getStocks();
      setStocks(data || []);
      setOpnameData({});
      setSubmitted(false);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const updateActualQty = (stockId, qty) => {
    setOpnameData(prev => ({
      ...prev,
      [stockId]: parseInt(qty) || 0
    }));
  };

  const filteredStocks = stocks.filter(stock => {
    const term = searchTerm.toLowerCase();
    return (
      (stock.product?.name?.toLowerCase().includes(term)) ||
      (stock.product?.sku?.toLowerCase().includes(term)) ||
      (stock.location?.barcode?.toLowerCase().includes(term))
    );
  });

  const getAdjustments = () => {
    return Object.entries(opnameData)
      .map(([stockId, actualQty]) => {
        const stock = stocks.find(s => String(s.id) === String(stockId));
        if (!stock) return null;
        const diff = actualQty - stock.quantity;
        if (diff === 0) return null;
        return { stock_id: stockId, product_id: stock.product?.id, location_id: stock.location?.id, system_qty: stock.quantity, actual_qty: actualQty, difference: diff };
      })
      .filter(Boolean);
  };

  const handleSubmit = async () => {
    const adjustments = getAdjustments();
    if (adjustments.length === 0) {
      setStatusMsg({ text: 'Tidak ada selisih yang perlu disesuaikan.', type: 'success' });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);
    try {
      // Submit each adjustment as a manual transaction
      for (const adj of adjustments) {
        await api.submitManualTransaction({
          type: adj.difference > 0 ? 'ADJUSTMENT' : 'ADJUSTMENT',
          product_id: adj.product_id,
          destination_location_id: adj.location_id,
          quantity: Math.abs(adj.difference),
          notes: `Stok Opname: sistem ${adj.system_qty}, aktual ${adj.actual_qty}, selisih ${adj.difference > 0 ? '+' : ''}${adj.difference}`,
          reference_document: `OPNAME-${new Date().toISOString().slice(0, 10)}`,
        });
      }
      setStatusMsg({ text: `Berhasil! ${adjustments.length} penyesuaian stok telah dicatat.`, type: 'success' });
      setSubmitted(true);
    } catch (e) {
      setStatusMsg({ text: e.data?.message || 'Gagal menyimpan hasil opname', type: 'error' });
    }
    setSubmitting(false);
  };

  const adjustments = getAdjustments();
  const countedItems = Object.keys(opnameData).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="header-title">
          <div className="icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
            <ClipboardCheck size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2>Stok Opname</h2>
            <p className="text-muted">Hitung stok fisik di gudang, cocokkan dengan data sistem, dan catat penyesuaian</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="secondary-btn" onClick={fetchStocks}>
            <RefreshCw size={18} /> Muat Ulang
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`global-status-banner ${statusMsg.type}`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Summary Bar */}
      <div className="glass" style={{ display: 'flex', gap: '2rem', padding: '1.5rem 1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>Total Item</span>
          <span style={{ fontWeight: 700, fontSize: '1.3rem' }}>{filteredStocks.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>Sudah Dihitung</span>
          <span style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary)' }}>{countedItems}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>Ada Selisih</span>
          <span style={{ fontWeight: 700, fontSize: '1.3rem', color: adjustments.length > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {adjustments.length}
          </span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="primary-btn" onClick={handleSubmit} disabled={submitting || submitted || countedItems === 0}>
            <Send size={18} />
            <span>{submitting ? 'Menyimpan...' : submitted ? 'Sudah Disimpan ✓' : 'Simpan Hasil Opname'}</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass table-card">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Cari lokasi, SKU, atau nama produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lokasi Rak</th>
                <th>SKU & Produk</th>
                <th>Zona</th>
                <th>Qty Sistem</th>
                <th>Qty Aktual</th>
                <th>Selisih</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">
                    <div className="table-loading-state">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                      <div className="table-state-title">Memuat Data Stok</div>
                      <div className="table-state-desc">Sedang sinkronisasi data opname...</div>
                    </div>
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="table-empty-state">
                      <Search />
                      <div className="table-state-title">Data tidak ditemukan</div>
                      <div className="table-state-desc">Coba gunakan kata kunci lain untuk pencarian.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStocks.map(stock => {
                  const actualQty = opnameData[stock.id];
                  const hasInput = actualQty !== undefined;
                  const diff = hasInput ? actualQty - stock.quantity : null;

                  return (
                    <tr key={stock.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="font-medium">{stock.location?.barcode || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{stock.product?.sku || 'N/A'}</div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>{stock.product?.name || 'Unknown'}</div>
                      </td>
                      <td><span className="badge-zone">{stock.location?.zone || '-'}</span></td>
                      <td className="font-medium">{stock.quantity} {stock.product?.uom || 'pcs'}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          placeholder="—"
                          value={hasInput ? actualQty : ''}
                          onChange={(e) => updateActualQty(stock.id, e.target.value)}
                          disabled={submitted}
                          style={{
                            width: '80px', padding: '0.5rem', textAlign: 'center',
                            background: 'var(--bg-surface)', border: '2px solid var(--border)',
                            borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
                            color: 'var(--text-primary)',
                            borderColor: hasInput ? (diff === 0 ? 'var(--success)' : 'var(--warning)') : 'var(--border)'
                          }}
                        />
                      </td>
                      <td>
                        {hasInput ? (
                          <span style={{
                            fontWeight: 700,
                            color: diff === 0 ? 'var(--success)' : diff > 0 ? 'var(--warning)' : 'var(--danger)'
                          }}>
                            {diff === 0 ? '0' : `${diff > 0 ? '+' : ''}${diff}`}
                          </span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {!hasInput ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Belum dihitung</span>
                        ) : diff === 0 ? (
                          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>✓ Cocok</span>
                        ) : (
                          <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.85rem' }}>⚠ Selisih</span>
                        )}
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

export default StockOpname;
