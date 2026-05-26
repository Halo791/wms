import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, CheckCircle2, AlertTriangle, ChevronRight, Package, MapPin, FileText, Play, RefreshCw } from 'lucide-react';
import api from '../services/api';
import './Inbound.css';

const Inbound = () => {
  const [step, setStep] = useState('select'); // select | verify | putaway | done
  const [pos, setPos] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [receivedItems, setReceivedItems] = useState([]);
  const [locationBarcode, setLocationBarcode] = useState('');
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => { loadPOs(); loadLocations(); }, []);

  const loadPOs = async () => {
    setLoading(true);
    try {
      const res = await api.getPurchaseOrders({});
      const all = res.data || res || [];
      setPos(all.filter(p => p.status === 'CONFIRMED' || p.status === 'RECEIVING'));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadLocations = async () => {
    try {
      const locs = await api.getLocations();
      setLocations(Array.isArray(locs) ? locs : (locs?.data || []));
    } catch (e) { console.error(e); }
  };

  const selectPO = async (po) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const detail = await api.getPurchaseOrder(po.id);
      setSelectedPO(detail);
      const items = (detail.items || []).map(item => ({
        ...item,
        product_name: item.product?.name || 'N/A',
        product_sku: item.product?.sku || 'N/A',
        product_uom: item.product?.uom || 'pcs',
        received_qty: item.ordered_qty - (item.received_qty || 0),
      }));
      setReceivedItems(items);
      setStep('verify');
    } catch (e) {
      setStatusMsg({ text: 'Gagal memuat detail PO', type: 'error' });
    }
    setLoading(false);
  };

  const updateReceivedQty = (index, qty) => {
    setReceivedItems(prev => prev.map((item, i) =>
      i === index ? { ...item, received_qty: Math.max(0, parseInt(qty) || 0) } : item
    ));
  };

  const goToPutaway = () => {
    const hasItems = receivedItems.some(it => it.received_qty > 0);
    if (!hasItems) {
      setStatusMsg({ text: 'Minimal 1 item harus diterima!', type: 'error' });
      return;
    }
    setStatusMsg(null);
    setStep('putaway');
  };

  const handleSubmit = async () => {
    if (!locationBarcode) {
      setStatusMsg({ text: 'Pilih lokasi rak tujuan!', type: 'error' });
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    try {
      // Find location id if they typed a barcode
      const loc = locations.find(l => l.barcode === locationBarcode || l.id === locationBarcode);
      if (!loc) {
        setStatusMsg({ text: 'Lokasi rak tidak ditemukan', type: 'error' });
        setLoading(false);
        return;
      }
      const finalLocationId = loc.id;

      // Submit each received item as putaway with PO reference
      const itemsToReceive = receivedItems.filter(it => it.received_qty > 0);
      for (const item of itemsToReceive) {
        await api.submitPutaway({
          location_id: finalLocationId,
          scanned_items: [{ barcode: item.product_sku, quantity: item.received_qty }],
          reference_document: selectedPO.po_number,
        });
      }
      // Update PO status
      try { await api.updatePOStatus(selectedPO.id, 'COMPLETED'); } catch (e) { /* OK if fails */ }

      setStatusMsg({ text: `Berhasil! ${itemsToReceive.length} item diterima dan disimpan ke rak.`, type: 'success' });
      setStep('done');
    } catch (e) {
      setStatusMsg({ text: e.data?.message || 'Gagal menyimpan penerimaan barang', type: 'error' });
    }
    setLoading(false);
  };

  const resetFlow = () => {
    setStep('select');
    setSelectedPO(null);
    setReceivedItems([]);
    setLocationBarcode('');
    setStatusMsg(null);
    loadPOs();
  };

  const stepIndex = step === 'select' ? 0 : step === 'verify' ? 1 : step === 'putaway' ? 2 : 3;
  const stepDefs = [
    { label: 'Pilih PO', num: 1 },
    { label: 'Cocokkan Barang', num: 2 },
    { label: 'Simpan ke Rak', num: 3 },
  ];

  return (
    <div className="inbound-container">
      <div className="page-header">
        <div className="header-title">
          <div className="icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <ArrowDownToLine size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <h2>Barang Masuk (Penerimaan)</h2>
            <p className="text-muted">Terima barang berdasarkan Purchase Order, cocokkan jumlah, lalu simpan ke rak</p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`global-status-banner ${statusMsg.type}`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Step Tracker */}
      <div className="glass step-tracker">
        {stepDefs.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={16} className="text-muted" />}
            <div className={`tracker-step ${stepIndex === i ? 'active' : stepIndex > i ? 'done' : ''}`}>
              <div className="tracker-dot">{stepIndex > i ? '✓' : s.num}</div>
              <span>{s.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Pilih PO */}
      {step === 'select' && (
        <div className="glass" style={{ padding: '2rem' }}>
          <h3 className="card-title"><FileText size={18} /> Pilih Purchase Order yang Barangnya Sudah Datang</h3>
          {loading ? (
            <div className="text-center text-muted" style={{ padding: '3rem' }}>Memuat data PO...</div>
          ) : pos.length === 0 ? (
            <div className="text-center" style={{ padding: '3rem' }}>
              <p className="text-muted">Belum ada PO berstatus siap terima.</p>
              <button className="secondary-btn" onClick={loadPOs} style={{ marginTop: '1rem' }}>
                <RefreshCw size={16} /> Muat Ulang
              </button>
            </div>
          ) : (
            <div className="product-selector">
              {pos.map(po => (
                <div key={po.id} className="product-option" onClick={() => selectPO(po)}>
                  <div className="product-option-info">
                    <span className="sku-label">{po.po_number}</span>
                    <span className="product-name">{po.supplier?.name || 'Supplier'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {po.items?.length || '?'} item
                    </span>
                    <span className="badge" style={{
                      background: po.status === 'CONFIRMED' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)',
                      color: po.status === 'CONFIRMED' ? '#6D5DF6' : '#f59e0b',
                      border: `1px solid ${po.status === 'CONFIRMED' ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`,
                      padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600
                    }}>{po.status}</span>
                    <ChevronRight size={18} className="text-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Cocokkan Barang */}
      {step === 'verify' && selectedPO && (
        <div className="glass" style={{ padding: '2rem' }}>
          <h3 className="card-title"><Package size={18} /> Cocokkan Barang — {selectedPO.po_number}</h3>
          <div className="picklist-product-info" style={{ marginBottom: '1.5rem' }}>
            <FileText size={18} className="text-muted" />
            <span className="font-medium">{selectedPO.supplier?.name || 'Supplier'}</span>
            <span className="qty-badge">{receivedItems.length} item dipesan</span>
          </div>

          <div className="picklist-table-wrap">
            <table className="data-table picklist-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>Nama Produk</th>
                  <th>Qty Dipesan</th>
                  <th>Qty Diterima</th>
                  <th>Selisih</th>
                </tr>
              </thead>
              <tbody>
                {receivedItems.map((item, idx) => {
                  const diff = item.received_qty - item.ordered_qty;
                  return (
                    <tr key={idx}>
                      <td><span className="pick-order">{idx + 1}</span></td>
                      <td><span className="mono font-medium">{item.product_sku}</span></td>
                      <td>{item.product_name}</td>
                      <td className="font-medium">{item.ordered_qty} {item.product_uom}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={item.ordered_qty}
                          value={item.received_qty}
                          onChange={(e) => updateReceivedQty(idx, e.target.value)}
                          style={{
                            width: '80px', padding: '0.5rem', textAlign: 'center',
                            background: 'var(--bg-surface)', border: '2px solid var(--primary)',
                            borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 600,
                          color: diff === 0 ? 'var(--success)' : 'var(--warning)'
                        }}>
                          {diff === 0 ? '✓ Cocok' : `${diff > 0 ? '+' : ''}${diff}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="picklist-actions">
            <button className="secondary-btn" onClick={resetFlow}>Kembali</button>
            <button className="primary-btn" onClick={goToPutaway}>
              <MapPin size={18} /> Lanjut ke Putaway →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Pilih Lokasi & Submit */}
      {step === 'putaway' && (
        <div className="glass" style={{ padding: '2rem' }}>
          <h3 className="card-title"><MapPin size={18} /> Pilih Lokasi Rak Tujuan</h3>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            Pilih lokasi rak tempat barang akan disimpan. Semua item yang diterima akan masuk ke lokasi ini.
          </p>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Barcode Lokasi Rak</label>
            <input
              type="text"
              placeholder="Ketik atau scan barcode lokasi..."
              value={locationBarcode}
              onChange={(e) => setLocationBarcode(e.target.value)}
            />
            <div className="hints">
              {locations.slice(0, 12).map(l => (
                <span key={l.id} className="hint-chip" onClick={() => setLocationBarcode(l.id)}>
                  {l.barcode} ({l.zone})
                </span>
              ))}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem'
          }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ringkasan Penerimaan:</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {receivedItems.filter(i => i.received_qty > 0).map((item, idx) => (
                <span key={idx} style={{
                  background: 'var(--primary-transparent)', color: 'var(--primary)',
                  padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600
                }}>
                  {item.product_sku}: {item.received_qty} {item.product_uom}
                </span>
              ))}
            </div>
          </div>

          <div className="picklist-actions">
            <button className="secondary-btn" onClick={() => setStep('verify')}>← Kembali</button>
            <button className="primary-btn execute-pick-btn" onClick={handleSubmit} disabled={loading}>
              <Play size={18} />
              <span>{loading ? 'Memproses...' : 'Simpan & Selesai'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="glass done-card">
          <CheckCircle2 size={60} style={{ color: 'var(--success)' }} />
          <h3>Penerimaan Selesai!</h3>
          <p className="text-muted">Barang dari PO {selectedPO?.po_number} sudah disimpan ke rak.</p>
          <button className="primary-btn" onClick={resetFlow}>
            <ArrowDownToLine size={18} />
            <span>Terima Barang Lagi</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Inbound;
