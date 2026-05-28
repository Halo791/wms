import React, { useState, useEffect } from 'react';
import { ScanLine, MapPin, Package, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import api from '../services/api';
import './MobileScanner.css';

const MobileScanner = () => {
  const [scannedLocation, setScannedLocation] = useState('');
  const [locationId, setLocationId] = useState('');
  const [scannedItems, setScannedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: 'Sistem Siap', type: 'info' });

  const [inputVal, setInputVal] = useState('');
  
  // Shortcut demo resources
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);

  // Auto focus to body for dark theme application on this page specifically
  useEffect(() => {
    const token = localStorage.getItem('wms_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    document.body.classList.add('mobile-scanner-active');
    loadDemoShortcuts();
    return () => {
      document.body.classList.remove('mobile-scanner-active');
    };
  }, []);

  const loadDemoShortcuts = async () => {
    try {
      const locs = await api.getLocations();
      setLocations(locs || []);
      const prods = await api.getProducts({ per_page: 20 });
      setProducts(prods.data || []);
    } catch (e) {
      console.error('Error loading demo shortcuts:', e);
    }
  };

  const handleScan = async (barcode) => {
    if (!barcode || isProcessing) return;
    setIsProcessing(true);
    setStatusMsg({ text: 'Memproses...', type: 'info' });

    try {
      if (!locationId) {
        // Step 1: Validasi Lokasi
        const result = await api.validateLocation(barcode);
        if (result.valid) {
          setScannedLocation(result.location.name);
          setLocationId(result.location.id);
          setStatusMsg({ text: `Lokasi Tervalidasi: ${result.location.name}`, type: 'success' });
          
          // Trigger mock haptic feedback (browser)
          if (navigator.vibrate) navigator.vibrate(50);
        } else {
          throw new Error('Lokasi tidak valid');
        }
      } else {
        // Step 2: Tambah Produk
        // Temukan detail SKU berdasarkan barcode/SKU
        const matchProd = products.find(p => p.barcode === barcode || p.sku === barcode);
        const skuLabel = matchProd ? matchProd.sku : barcode;
        
        setScannedItems(prev => [...prev, { barcode: barcode, quantity: 1, sku: skuLabel }]);
        setStatusMsg({ text: `Item Ditambahkan: ${skuLabel}`, type: 'success' });
        
        if (navigator.vibrate) navigator.vibrate(50);
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Gagal memindai';
      setStatusMsg({ text: msg, type: 'error' });
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Error vibrate
    } finally {
      setIsProcessing(false);
      setInputVal(''); // Clear input for next scan
    }
  };

  const submitPutaway = async () => {
    if (!locationId || scannedItems.length === 0) return;
    setIsProcessing(true);
    setStatusMsg({ text: 'Mengirim misi ke gudang.hovertech...', type: 'info' });

    try {
      const payload = {
        location_id: locationId,
        scanned_items: scannedItems.map(item => ({
          barcode: item.barcode,
          quantity: item.quantity
        }))
      };
      const res = await api.submitPutaway(payload);
      
      setStatusMsg({ text: `SUKSES! TRX: ${res.transaction_code}`, type: 'success' });
      if (navigator.vibrate) navigator.vibrate(200);
      
      // Reset for next task
      setTimeout(() => {
        setScannedLocation('');
        setLocationId('');
        setScannedItems([]);
        setStatusMsg({ text: 'Sistem Siap untuk Misi Berikutnya', type: 'info' });
      }, 3000);

    } catch (err) {
      const msg = err.data?.message || err.message || 'Gagal submit';
      setStatusMsg({ text: `GAGAL: ${msg}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mobile-scanner-layout">
      {/* Header */}
      <div className="scanner-header">
        <h1 className="app-title">gudang<span>.hovertech</span> MOBILE</h1>
        <div className="operator-badge">
          <span className="dot online"></span>
          <span>Operator 1</span>
        </div>
      </div>

      {/* Camera Viewport (Simulated) */}
      <div className="camera-viewport">
        <div className="reticle">
          <div className="reticle-corner tl"></div>
          <div className="reticle-corner tr"></div>
          <div className="reticle-corner bl"></div>
          <div className="reticle-corner br"></div>
          <div className="laser-line"></div>
        </div>
        <div className="camera-overlay-text">ARAHKAN KE BARCODE</div>
      </div>

      {/* Task Panel */}
      <div className="task-panel">
        <div className={`status-bar ${statusMsg.type}`}>
          {statusMsg.type === 'success' && <CheckCircle2 size={18} />}
          {statusMsg.type === 'error' && <AlertTriangle size={18} />}
          {statusMsg.type === 'info' && <ScanLine size={18} />}
          <span>{statusMsg.text}</span>
        </div>

        {/* Quick Demo Scan Shortcuts */}
        <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            {!locationId ? '👉 Tap Barcode Lokasi:' : '👉 Tap Barcode Produk:'}
          </h5>
          {!locationId ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '70px', overflowY: 'auto' }}>
              {locations.map(loc => (
                <button 
                  key={loc.id} 
                  onClick={() => handleScan(loc.barcode)}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid var(--primary)', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                >
                  📍 {loc.barcode}
                </button>
              ))}
              {locations.length === 0 && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Memuat lokasi...</span>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '70px', overflowY: 'auto' }}>
              {products.map(prod => (
                <button 
                  key={prod.id} 
                  onClick={() => handleScan(prod.barcode || prod.sku)}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'var(--success-transparent)', border: '1px solid var(--success)', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                >
                  📦 {prod.sku}
                </button>
              ))}
              {products.length === 0 && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Memuat produk...</span>}
            </div>
          )}
        </div>

        <div className="steps-container">
          <div className={`step-item ${locationId ? 'completed' : 'active'}`}>
            <div className="step-icon"><MapPin size={20} /></div>
            <div className="step-content">
              <h4>Langkah 1: Lokasi Rak</h4>
              <p>{scannedLocation || 'Belum discan'}</p>
            </div>
          </div>
          
          <div className={`step-item ${locationId ? 'active' : 'waiting'}`}>
            <div className="step-icon"><Package size={20} /></div>
            <div className="step-content">
              <h4>Langkah 2: Barcode Palet</h4>
              <p>{scannedItems.length} Palet terscan</p>
              {scannedItems.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                  {scannedItems.map((item, idx) => (
                    <span key={idx} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                      {item.sku}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manual Input for Simulation */}
        <div className="manual-input-group">
          <input 
            type="text" 
            placeholder={!locationId ? "Ketik Barcode Lokasi..." : "Ketik Barcode Palet..."}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan(inputVal)}
            disabled={isProcessing}
          />
          <button className="scan-btn" onClick={() => handleScan(inputVal)} disabled={isProcessing || !inputVal}>
            <ScanLine size={20} />
          </button>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          {locationId && (
            <button 
              className="submit-task-btn" 
              style={{ background: 'var(--danger-transparent)', color: 'var(--danger)', flex: '0 0 50px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => { setLocationId(''); setScannedLocation(''); setScannedItems([]); }}
            >
              Reset
            </button>
          )}
          <button 
            className="submit-task-btn" 
            style={{ flex: 1 }}
            disabled={!locationId || scannedItems.length === 0 || isProcessing}
            onClick={submitPutaway}
          >
            {isProcessing ? 'Memproses...' : 'SELESAIKAN PUTAWAY'}
            <Send size={20} className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileScanner;
