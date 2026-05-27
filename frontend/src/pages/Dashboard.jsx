import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, AlertTriangle, ArrowRightLeft, RefreshCw, Plus, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Dashboard.css';

const StatCard = ({ title, value, icon: Icon, trend, trendUp, color, loading }) => (
  <div className="stat-card glass hover-lift">
    <div className="stat-header">
      <div className="stat-title">{title}</div>
      <div className={`stat-icon-wrapper`} style={{ background: `var(--${color}-transparent)`, color: `var(--${color})` }}>
        <Icon size={20} />
      </div>
    </div>
    <div className="stat-value">{loading ? '...' : value}</div>
    <div className={`stat-trend ${trendUp ? 'positive' : 'negative'}`}>
      <TrendingUp size={14} className={!trendUp ? 'rotate-180' : ''} />
      <span>{trend}</span>
      <span className="trend-label">vs kemarin</span>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { total_sku: 0, low_stock: 0, today_inbound: 0, today_outbound: 0 },
    movement: [],
    recent_activity: []
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardStats();
      if (res) {
        setData(res);
      }
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  // Find max value in chart for scaling
  const maxChartVal = data.movement.length > 0 
    ? Math.max(...data.movement.map(d => Math.max(d.inbound, d.outbound)), 10) 
    : 10;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Ringkasan Dashboard</h1>
          <p className="text-muted">Pantau aktivitas, pergerakan stok, dan status gudang Anda secara real-time.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="secondary-btn" onClick={fetchStats} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
          <button className="primary-btn" onClick={() => navigate('/transfer')}>
            <Plus size={18} />
            Transaksi Baru
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard 
          title="Total SKU Aktif" 
          value={data.stats.total_sku} 
          icon={Package} 
          trend="+5%" 
          trendUp={true} 
          color="primary"
          loading={loading}
        />
        <StatCard 
          title="Alert Stok Kritis" 
          value={data.stats.low_stock} 
          icon={AlertTriangle} 
          trend={data.stats.low_stock > 0 ? 'Perlu Order' : 'Aman'} 
          trendUp={data.stats.low_stock === 0} 
          color={data.stats.low_stock > 0 ? 'warning' : 'success'}
          loading={loading}
        />
        <StatCard 
          title="Barang Masuk (Hari Ini)" 
          value={`${data.stats.today_inbound} unit`} 
          icon={ArrowRightLeft} 
          trend="Masuk" 
          trendUp={true} 
          color="success"
          loading={loading}
        />
        <StatCard 
          title="Barang Keluar (Hari Ini)" 
          value={`${data.stats.today_outbound} unit`} 
          icon={ArrowRightLeft} 
          trend="Keluar" 
          trendUp={false} 
          color="danger"
          loading={loading}
        />
      </div>

      <div className="dashboard-content-grid">
        {/* Dynamic SVG / HTML Chart */}
        <div className="main-chart glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Tren Pergerakan Stok (7 Hari Terakhir)</h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--success)', borderRadius: '3px' }}></span> Inbound
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--danger)', borderRadius: '3px' }}></span> Outbound
              </span>
            </div>
          </div>
          
          <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', height: '220px', justifyContent: 'space-between' }}>
            {loading ? (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Memuat data grafik...
              </div>
            ) : data.movement.length === 0 ? (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Belum ada data transaksi 7 hari terakhir.
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flex: 1, paddingBottom: '1rem', gap: '1rem' }}>
                {data.movement.map((day, idx) => {
                  const inboundHeight = (day.inbound / maxChartVal) * 100;
                  const outboundHeight = (day.outbound / maxChartVal) * 100;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%' }}>
                      {/* Bars Wrapper */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100%', width: '100%', justifyContent: 'center', position: 'relative' }}>
                        {/* Inbound Bar */}
                        <div 
                          className="chart-bar-inbound"
                          style={{ 
                            height: `${Math.max(inboundHeight, 4)}%`, 
                            background: 'var(--success)', 
                            width: '14px', 
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.5s ease',
                            cursor: 'pointer'
                          }}
                          title={`Inbound: ${day.inbound} unit`}
                        />
                        {/* Outbound Bar */}
                        <div 
                          className="chart-bar-outbound"
                          style={{ 
                            height: `${Math.max(outboundHeight, 4)}%`, 
                            background: 'var(--danger)', 
                            width: '14px', 
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.5s ease',
                            cursor: 'pointer'
                          }}
                          title={`Outbound: ${day.outbound} unit`}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', whiteSpace: 'nowrap' }}>
                        {day.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Activity List */}
        <div className="recent-activity glass">
          <h3>Aktivitas Transaksi Terbaru</h3>
          <div className="activity-list" style={{ marginTop: '1rem' }}>
            {loading ? (
              <div className="text-muted text-center" style={{ padding: '2rem' }}>Memuat data...</div>
            ) : data.recent_activity.length === 0 ? (
              <div className="text-muted text-center" style={{ padding: '2rem' }}>Belum ada riwayat aktivitas.</div>
            ) : (
              data.recent_activity.map((act) => (
                <div key={act.id} className="activity-item">
                  <div className={`activity-icon ${act.type === 'INBOUND' ? 'bg-success-transparent' : act.type === 'OUTBOUND' ? 'bg-danger-transparent' : 'bg-primary-transparent'}`}>
                    <ArrowRightLeft size={14} style={{ color: act.type === 'INBOUND' ? 'var(--success)' : act.type === 'OUTBOUND' ? 'var(--danger)' : 'var(--primary)' }} />
                  </div>
                  <div className="activity-details">
                    <div className="activity-text">
                      <strong className="mono">{act.code}</strong> - {act.type} {act.quantity} pcs <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({act.product_sku})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span><Clock size={12} style={{ display: 'inline', marginRight: '3px' }} />{act.time}</span>
                      <span>Oleh: {act.operator}</span>
                    </div>
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

export default Dashboard;
