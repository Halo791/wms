import React, { useState, useEffect } from 'react';
import { ArrowUpFromLine, CheckCircle2, AlertTriangle, ChevronRight, Route, PackageCheck, Clock, MapPin, ShoppingCart, Truck } from 'lucide-react';
import api from '../services/api';
import './Outbound.css';

const Outbound = () => {
  const [sos, setSos] = useState([]);
  const [selectedSO, setSelectedSO] = useState(null);
  const [pickLists, setPickLists] = useState([]);
  const [step, setStep] = useState('select'); // select | picklist | done
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { loadSOs(); loadHistory(); }, []);

  const loadSOs = async () => {
    setLoading(true);
    try {
      const res = await api.getSalesOrders({});
      const all = res.data || res || [];
      setSos(all.filter(s => s.status === 'CONFIRMED'));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadHistory = async () => {
    try {
      const data = await api.getHistory();
      setHistory((data || []).filter(t => t.type === 'OUTBOUND').slice(0, 10));
    } catch (e) { console.error(e); }
  };

  const selectSO = async (so) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const detail = await api.getSalesOrder(so.id);
      setSelectedSO(detail);

      // Generate pick list for each item in SO
      const lists = [];
      const items = detail.items || [];
      for (const item of items) {
        try {
          const res = await api.generatePickList(item.product_id, item.ordered_qty);
          lists.push({
            product: res.product || item.product || { sku: 'N/A', name: 'N/A', uom: 'pcs' },
            requested_qty: item.ordered_qty,
            pick_list: res.pick_list || [],
          });
        } catch (e) {
          lists.push({
            product: item.product || { sku: 'N/A', name: 'N/A', uom: 'pcs' },
            requested_qty: item.ordered_qty,
            pick_list: [],
            error: e.data?.message || 'Stok tidak mencukupi',
          });
        }
      }
      setPickLists(lists);
      setStep('picklist');
    } catch (e) {
      setStatusMsg({ text: 'Gagal memuat detail SO', type: 'error' });
    }
    setLoading(false);
  };

  const handleExecutePicking = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      for (const pl of pickLists) {
        if (pl.pick_list.length === 0 || pl.error) continue;
        await api.executePicking({
          product_id: pl.product.id,
          pick_items: pl.pick_list.map(item => ({
            stock_id: item.stock_id,
            pick_qty: item.pick_qty,
          })),
          reference_document: selectedSO.so_number,
        });
      }
      // Update SO status to PICKING
      try { await api.updateSOStatus(selectedSO.id, 'PICKING'); } catch (e) { /* OK */ }

      setStatusMsg({
        text: `Picking selesai untuk ${selectedSO.so_number}. Barang siap dipacking.`,
        type: 'success'
      });
      setStep('done');
      loadHistory();
    } catch (e) {
      setStatusMsg({ text: e.data?.message || 'Gagal eksekusi picking', type: 'error' });
    }
    setLoading(false);
  };

  const resetFlow = () => {
    setSelectedSO(null);
    setPickLists([]);
    setStep('select');
    setStatusMsg(null);
    loadSOs();
  };

  const stepIndex = step === 'select' ? 0 : step === 'picklist' ? 1 : 2;
  const stepDefs = [
    { label: 'Pilih Sales Order', num: 1 },
    { label: 'Periksa Pick List', num: 2 },
    { label: 'Selesai', num: 3 },
  ];

  return (
    <div className="outbound-container">
      <div className="page-header">
        <div className="header-title">
          <div className="icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <ArrowUpFromLine size={24} style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <h2>Barang Keluar (Picking)</h2>
            <p className="text-muted">Proses pengambilan barang dari rak berdasarkan Sales Order dengan urutan FIFO</p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`global-status-banner ${statusMsg.type}`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="outbound-grid">
        <div className="pick-flow-column">
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

          {/* Step 1: Pilih SO */}
          {step === 'select' && (
            <div className="glass pick-form-card">
              <h3 className="card-title"><ShoppingCart size={18} /> Pilih Sales Order yang Akan Diproses</h3>

              {loading ? (
                <div className="text-center text-muted" style={{ padding: '3rem' }}>Memuat data SO...</div>
              ) : sos.length === 0 ? (
                <div className="text-center text-muted" style={{ padding: '3rem' }}>
                  Belum ada SO berstatus CONFIRMED.
                </div>
              ) : (
                <div className="product-selector">
                  {sos.map(so => (
                    <div key={so.id} className="product-option" onClick={() => selectSO(so)}>
                      <div className="product-option-info">
                        <span className="sku-label">{so.so_number}</span>
                        <span className="product-name">{so.customer?.name || 'Customer'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                          {so.items?.length || '?'} item
                        </span>
                        {so.ship_by_date && (
                          <span style={{
                            fontSize: '0.75rem', color: 'var(--warning)',
                            background: 'rgba(245,158,11,0.1)', padding: '0.2rem 0.5rem',
                            borderRadius: '4px'
                          }}>
                            Kirim: {new Date(so.ship_by_date).toLocaleDateString('id-ID')}
                          </span>
                        )}
                        <ChevronRight size={18} className="text-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Pick List dari SO */}
          {step === 'picklist' && selectedSO && (
            <div className="glass picklist-card">
              <h3 className="card-title"><Route size={18} /> Pick List FIFO — {selectedSO.so_number}</h3>

              <div className="picklist-product-info">
                <ShoppingCart size={18} className="text-muted" />
                <span className="font-medium">{selectedSO.customer?.name || 'Customer'}</span>
                <span className="qty-badge">{pickLists.length} produk</span>
              </div>

              {pickLists.map((pl, plIdx) => (
                <div key={plIdx} style={{
                  marginBottom: '1.5rem', border: '1px solid var(--border)',
                  borderRadius: '12px', overflow: 'hidden'
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.8rem 1.2rem', background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    <div>
                      <span className="sku-label">{pl.product.sku}</span>
                      <span style={{ marginLeft: '0.8rem' }}>{pl.product.name}</span>
                    </div>
                    <span className="qty-badge">Diminta: {pl.requested_qty} {pl.product.uom}</span>
                  </div>

                  {pl.error ? (
                    <div style={{
                      padding: '1rem', color: 'var(--danger)', background: 'rgba(239,68,68,0.05)',
                      display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
                    }}>
                      <AlertTriangle size={16} /> {pl.error}
                    </div>
                  ) : (
                    <table className="data-table picklist-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Lokasi Rak</th>
                          <th>Zone</th>
                          <th>Stok Tersedia</th>
                          <th>Ambil</th>
                          <th>Tanggal FIFO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pl.pick_list.map((item, idx) => (
                          <tr key={item.stock_id}>
                            <td><span className="pick-order">{idx + 1}</span></td>
                            <td>
                              <div className="location-barcode">
                                <MapPin size={14} className="text-muted" />
                                <span className="font-medium">{item.location_barcode}</span>
                              </div>
                            </td>
                            <td><span className="badge-zone">{item.zone}</span></td>
                            <td>{item.available_qty}</td>
                            <td><span className="pick-qty-highlight">{item.pick_qty}</span></td>
                            <td className="text-muted text-sm">
                              <Clock size={12} style={{ marginRight: '0.3rem' }} />
                              {new Date(item.fifo_date).toLocaleDateString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}

              <div className="picklist-actions" style={{ marginTop: '1rem' }}>
                <button className="secondary-btn" onClick={resetFlow}>Batalkan</button>
                <button className="primary-btn execute-pick-btn" onClick={handleExecutePicking} disabled={loading || pickLists.every(p => p.error)}>
                  <PackageCheck size={18} />
                  <span>{loading ? 'Memproses...' : 'Eksekusi Picking'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && (
            <div className="glass done-card">
              <CheckCircle2 size={60} style={{ color: 'var(--success)' }} />
              <h3>Picking Selesai!</h3>
              <p className="text-muted">SO {selectedSO?.so_number} — Barang siap dikemas dan dikirim.</p>
              <button className="primary-btn" onClick={resetFlow}>
                <Truck size={18} />
                <span>Proses SO Berikutnya</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Riwayat */}
        <div className="history-column">
          <div className="glass history-card">
            <h3 className="card-title"><Clock size={18} /> Riwayat Barang Keluar</h3>
            <div className="history-list">
              {history.length === 0 ? (
                <div className="text-muted text-center" style={{ padding: '2rem' }}>Belum ada riwayat.</div>
              ) : (
                history.map((trx, idx) => (
                  <div key={idx} className="history-item">
                    <div className="history-icon"><ArrowUpFromLine size={16} /></div>
                    <div className="history-info">
                      <span className="history-code">{trx.transaction_code}</span>
                      <span className="history-detail">
                        {trx.product?.name || 'N/A'} — {trx.quantity} {trx.product?.uom || 'pcs'}
                      </span>
                      <span className="history-time">{new Date(trx.created_at).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Outbound;
