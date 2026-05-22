import React, { forwardRef } from 'react';

const PrintPO = forwardRef(({ po }, ref) => {
  if (!po) return null;

  const supplier = po.supplier || {};

  return (
    <div ref={ref} style={{ padding: '2rem', fontFamily: 'sans-serif', color: 'black', background: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>AERO WMS</h1>
          <p style={{ margin: 0, color: '#555' }}>Enterprise Warehouse Management</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>PURCHASE ORDER (PO)</h2>
          <p style={{ margin: 0, fontWeight: 'bold' }}>NO PO: PO-{po.id.substring(0,8).toUpperCase()}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h4 style={{ margin: '0 0 0.5rem' }}>PEMESAN:</h4>
          <p style={{ margin: 0 }}>Aero Main Warehouse (JKT)</p>
          <p style={{ margin: 0 }}>Jl. Contoh Gudang No. 123</p>
          <p style={{ margin: 0 }}>Jakarta, Indonesia</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h4 style={{ margin: '0 0 0.5rem' }}>KEPADA VENDOR:</h4>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{supplier.name || 'N/A'}</p>
          <p style={{ margin: 0 }}>{supplier.address || 'N/A'}</p>
          <p style={{ margin: 0 }}>UP: {supplier.contact_person || 'N/A'} ({supplier.phone || 'N/A'})</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <tbody>
            <tr>
              <th style={{ border: '1px solid black', padding: '0.5rem' }}>Tanggal Order</th>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{new Date(po.order_date).toLocaleDateString('id-ID')}</td>
              <th style={{ border: '1px solid black', padding: '0.5rem' }}>Estimasi Tiba</th>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{po.expected_arrival ? new Date(po.expected_arrival).toLocaleDateString('id-ID') : '-'}</td>
            </tr>
            <tr>
              <th style={{ border: '1px solid black', padding: '0.5rem' }}>Status</th>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{po.status}</td>
              <th style={{ border: '1px solid black', padding: '0.5rem' }}>Catatan</th>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{po.notes || '-'}</td>
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
            <th style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'center' }}>Qty Pesanan</th>
            <th style={{ border: '1px solid black', padding: '0.5rem' }}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {(po.items || []).map((item, idx) => (
            <tr key={item.id || idx}>
              <td style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{item.product?.sku || '-'}</td>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}>{item.product?.name || '-'}</td>
              <td style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}>{item.ordered_qty} {item.product?.uom || 'pcs'}</td>
              <td style={{ border: '1px solid black', padding: '0.5rem' }}></td>
            </tr>
          ))}
          {(!po.items || po.items.length === 0) && (
             <tr><td colSpan="5" style={{ border: '1px solid black', padding: '1rem', textAlign: 'center' }}>Detail item tidak ditemukan.</td></tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginTop: '4rem' }}>
        <div style={{ width: '200px' }}>
          <p style={{ marginBottom: '4rem' }}>Disetujui Oleh,</p>
          <div style={{ borderBottom: '1px solid black' }}></div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>Manager Pembelian</p>
        </div>
        <div style={{ width: '200px' }}>
          <p style={{ marginBottom: '4rem' }}>Diterima Oleh Vendor,</p>
          <div style={{ borderBottom: '1px solid black' }}></div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>Tanda Tangan & Cap</p>
        </div>
      </div>
    </div>
  );
});

export default PrintPO;
