import React, { forwardRef } from 'react';

const PrintDO = forwardRef(({ shipment }, ref) => {
  if (!shipment) return null;

  const so = shipment.sales_order || {};
  const customer = shipment.customer || {};

  return (
    <div ref={ref} style={{ padding: '2rem', fontFamily: 'sans-serif', color: 'black', background: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>AERO WMS</h1>
          <p style={{ margin: 0, color: '#555' }}>Enterprise Warehouse Management</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>SURAT JALAN (DELIVERY ORDER)</h2>
          <p style={{ margin: 0, fontWeight: 'bold' }}>NO DO: {shipment.do_number}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h4 style={{ margin: '0 0 0.5rem' }}>PENGIRIM:</h4>
          <p style={{ margin: 0 }}>Aero Main Warehouse (JKT)</p>
          <p style={{ margin: 0 }}>Jl. Contoh Gudang No. 123</p>
          <p style={{ margin: 0 }}>Jakarta, Indonesia</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h4 style={{ margin: '0 0 0.5rem' }}>KEPADA YTH:</h4>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{customer.name || 'N/A'}</p>
          <p style={{ margin: 0 }}>{customer.address || 'N/A'}</p>
          <p style={{ margin: 0 }}>UP: {customer.contact_person || 'N/A'} ({customer.phone || 'N/A'})</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <tbody>
            <tr>
              <th style={{ border: '1px solid black', padding: '0.5rem' }}>No. Sales Order</th>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{so.so_number || '-'}</td>
              <th style={{ border: '1px solid black', padding: '0.5rem' }}>Tanggal Kirim</th>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{new Date().toLocaleDateString('id-ID')}</td>
            </tr>
            <tr>
              <th style={{ border: '1px solid black', padding: '0.5rem' }}>Ekspedisi</th>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{shipment.carrier || '-'}</td>
              <th style={{ border: '1px solid black', padding: '0.5rem' }}>Status</th>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{shipment.status}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ border: '1px solid black', padding: '0.5rem' }}>No</th>
            <th style={{ border: '1px solid black', padding: '0.5rem' }}>Kode Barang (SKU)</th>
            <th style={{ border: '1px solid black', padding: '0.5rem' }}>Nama Barang</th>
            <th style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'center' }}>Qty</th>
            <th style={{ border: '1px solid black', padding: '0.5rem' }}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {(so.items || []).map((item, idx) => (
            <tr key={item.id || idx}>
              <td style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{item.product?.sku || '-'}</td>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{item.product?.name || '-'}</td>
              <td style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}>{item.ordered_qty} {item.product?.uom || 'pcs'}</td>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}></td>
            </tr>
          ))}
          {(!so.items || so.items.length === 0) && (
             <tr><td colSpan="5" style={{ border: '1px solid black', padding: '1rem', textAlign: 'center' }}>Detail item tidak ditemukan.</td></tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginTop: '4rem' }}>
        <div style={{ width: '200px' }}>
          <p style={{ marginBottom: '4rem' }}>Penerima,</p>
          <div style={{ borderBottom: '1px solid black' }}></div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>Nama Jelas & Tanda Tangan</p>
        </div>
        <div style={{ width: '200px' }}>
          <p style={{ marginBottom: '4rem' }}>Pengirim,</p>
          <div style={{ borderBottom: '1px solid black' }}></div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>Bagian Gudang (WMS)</p>
        </div>
      </div>
    </div>
  );
});

export default PrintDO;
