import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, MapPin, Package, CheckCircle2, AlertTriangle, Send, RefreshCw, ChevronRight } from 'lucide-react';
import api from '../services/api';
import './Transfer.css';

const Transfer = () => {
  const [stocks, setStocks] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Form
  const [sourceLocation, setSourceLocation] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [transferQty, setTransferQty] = useState(1);
  const [destLocation, setDestLocation] = useState('');

  // History
  const [history, setHistory] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stockData, locData, histData] = await Promise.all([
        api.getStocks(),
        api.getLocations(),
        api.getHistory().catch(() => []),
      ]);
      setStocks(stockData || []);
      setLocations(Array.isArray(locData) ? locData : (locData?.data || []));
      setHistory((histData || []).filter(t => t.type === 'TRANSFER').slice(0, 10));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Get unique source locations that have stock
  const sourceLocations = [...new Map(
    stocks.filter(s => s.quantity > 0).map(s => [s.location?.id, s.location])
  ).values()].filter(Boolean);

  // Get stocks at selected source location
  const stocksAtSource = stocks.filter(
    s => s.location?.id === sourceLocation || s.location?.barcode === sourceLocation
  );

  // Get destination locations (exclude source)
  const destLocations = locations.filter(l => l.id !== sourceLocation && l.barcode !== sourceLocation);

  const handleSubmit = async () => {
    if (!selectedStock || !destLocation || transferQty < 1) {
      setStatusMsg({ text: 'Lengkapi semua data!', type: 'error' });
      return;
    }
    if (transferQty > selectedStock.quantity) {
      setStatusMsg({ text: `Qty melebihi stok tersedia (${selectedStock.quantity})!`, type: 'error' });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);
    try {
      await api.submitManualTransaction({
        type: 'TRANSFER',
        product_id: selectedStock.product?.id,
        source_location_id: selectedStock.location?.id,
        destination_location_id: destLocation,
        quantity: transferQty,
        notes: `Pindah barang dari ${selectedStock.location?.barcode} ke lokasi tujuan`,
        reference_document: `TRF-${Date.now()}`,
      });
      setStatusMsg({
        text: `Berhasil! ${transferQty} ${selectedStock.product?.uom || 'pcs'} ${selectedStock.product?.name} dipindahkan.`,
        type: 'success'
      });
      // Reset form
      setSourceLocation('');
      setSelectedStock(null);
      setTransferQty(1);
      setDestLocation('');
      loadData();
    } catch (e) {
      setStatusMsg({ text: e.data?.message || 'Gagal memindahkan barang', type: 'error' });
    }
    setSubmitting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="header-title">
          <div className="icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
            <ArrowLeftRight size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2>Pindah Barang</h2>
            <p className="text-muted">Pindahkan barang antar lokasi rak dalam gudang</p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`global-status-banner ${statusMsg.type}`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
        {/* Left: Transfer Form */}
        <div className="glass" style={{ padding: '2rem' }}>
          {/* Visual Flow */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
            marginBottom: '2rem', padding: '1rem', background: 'var(--bg-surface)',
            borderRadius: '12px', border: '1px solid var(--border)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <MapPin size={20} style={{ color: sourceLocation ? 'var(--primary)' : 'var(--text-muted)' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.3rem' }}>
                {sourceLocation ? (stocksAtSource[0]?.location?.barcode || 'Asal') : 'Lokasi Asal'}
              </div>
            </div>
            <ChevronRight size={20} className="text-muted" />
            <div style={{ textAlign: 'center' }}>
              <Package size={20} style={{ color: selectedStock ? 'var(--warning)' : 'var(--text-muted)' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.3rem' }}>
                {selectedStock ? `${transferQty} ${selectedStock.product?.uom || 'pcs'}` : 'Barang'}
              </div>
            </div>
            <ChevronRight size={20} className="text-muted" />
            <div style={{ textAlign: 'center' }}>
              <MapPin size={20} style={{ color: destLocation ? 'var(--success)' : 'var(--text-muted)' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.3rem' }}>
                {destLocation ? (locations.find(l => l.id === destLocation)?.barcode || 'Tujuan') : 'Lokasi Tujuan'}
              </div>
            </div>
          </div>

          {/* Step 1: Pilih Lokasi Asal */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>1. Lokasi Asal</label>
            <select
              value={sourceLocation}
              onChange={(e) => { setSourceLocation(e.target.value); setSelectedStock(null); }}
              style={{
                width: '100%', padding: '0.8rem 1rem', background: 'var(--bg-surface)',
                border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            >
              <option value="">— Pilih lokasi asal —</option>
              {sourceLocations.map(l => (
                <option key={l.id} value={l.id}>{l.barcode} ({l.zone})</option>
              ))}
            </select>
          </div>

          {/* Step 2: Pilih Barang */}
          {sourceLocation && (
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>2. Pilih Barang</label>
              {stocksAtSource.length === 0 ? (
                <p className="text-muted">Tidak ada stok di lokasi ini.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {stocksAtSource.map(s => (
                    <div
                      key={s.id}
                      onClick={() => { setSelectedStock(s); setTransferQty(Math.min(1, s.quantity)); }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.8rem 1rem', borderRadius: '8px', cursor: 'pointer',
                        border: `2px solid ${selectedStock?.id === s.id ? 'var(--primary)' : 'var(--border)'}`,
                        background: selectedStock?.id === s.id ? 'var(--primary-transparent)' : 'var(--bg-surface)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div className="font-medium">{s.product?.sku} — {s.product?.name}</div>
                      </div>
                      <span style={{ fontWeight: 700 }}>{s.quantity} {s.product?.uom || 'pcs'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Qty + Lokasi Tujuan */}
          {selectedStock && (
            <>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  3. Jumlah (max: {selectedStock.quantity})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedStock.quantity}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.min(parseInt(e.target.value) || 1, selectedStock.quantity))}
                  style={{
                    width: '120px', padding: '0.8rem', textAlign: 'center', fontWeight: 700,
                    fontSize: '1.2rem', background: 'var(--bg-surface)', border: '2px solid var(--primary)',
                    borderRadius: '8px', color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>4. Lokasi Tujuan</label>
                <select
                  value={destLocation}
                  onChange={(e) => setDestLocation(e.target.value)}
                  style={{
                    width: '100%', padding: '0.8rem 1rem', background: 'var(--bg-surface)',
                    border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">— Pilih lokasi tujuan —</option>
                  {destLocations.map(l => (
                    <option key={l.id} value={l.id}>{l.barcode} ({l.zone})</option>
                  ))}
                </select>
              </div>

              <button
                className="primary-btn"
                onClick={handleSubmit}
                disabled={submitting || !destLocation}
                style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
              >
                <Send size={18} />
                <span>{submitting ? 'Memproses...' : 'Pindahkan Barang'}</span>
              </button>
            </>
          )}
        </div>

        {/* Right: Riwayat Transfer */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <ArrowLeftRight size={18} /> Riwayat Pemindahan
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '500px', overflowY: 'auto' }}>
            {history.length === 0 ? (
              <div className="text-muted text-center" style={{ padding: '2rem' }}>Belum ada riwayat pemindahan.</div>
            ) : (
              history.map((trx, idx) => (
                <div key={idx} style={{
                  display: 'flex', gap: '1rem', padding: '1rem', borderRadius: '12px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)'
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <ArrowLeftRight size={16} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', fontFamily: 'monospace' }}>{trx.transaction_code}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {trx.product?.name || 'N/A'} — {trx.quantity} {trx.product?.uom || 'pcs'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(trx.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
