import React, { useState, useEffect } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Header.css';

const Header = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWH, setSelectedWH] = useState(localStorage.getItem('wms_active_warehouse') || '');
  const [searchVal, setSearchVal] = useState('');

  useEffect(() => {
    loadNotifs();
    loadWarehouses();
    const interval = setInterval(loadNotifs, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  const loadNotifs = async () => {
    try {
      const data = await api.getNotifications();
      setNotifs(data || []);
    } catch (e) { console.error(e); }
  };

  const loadWarehouses = async () => {
    try {
      const data = await api.getWarehouses();
      setWarehouses(data || []);
      if (data && data.length > 0 && !localStorage.getItem('wms_active_warehouse')) {
        localStorage.setItem('wms_active_warehouse', data[0].id);
        setSelectedWH(data[0].id);
      }
    } catch (e) { console.error(e); }
  };

  const handleWarehouseChange = (e) => {
    const id = e.target.value;
    localStorage.setItem('wms_active_warehouse', id);
    setSelectedWH(id);
    window.location.reload(); // Reload to refresh contexts across pages
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      navigate(`/inventory?search=${encodeURIComponent(searchVal)}`);
      setSearchVal('');
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      loadNotifs();
    } catch (e) { console.error(e); }
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <header className="header">
      {/* Mobile hamburger */}
      <button className="menu-toggle-btn" onClick={onMenuToggle} aria-label="Toggle menu">
        <Menu size={22} />
      </button>

      <div className="header-search">
        <Search size={18} className="search-icon" />
        <input 
          type="text" 
          placeholder="Cari SKU, Barcode, atau Lokasi (Tekan Enter)..." 
          className="search-input"
          aria-label="Search"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
      </div>
      
      <div className="header-actions">
        <div className="warehouse-selector">
          <span className="warehouse-label" id="warehouse-label">Gudang</span>
          <select className="warehouse-select" aria-labelledby="warehouse-label" value={selectedWH} onChange={handleWarehouseChange}>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
            ))}
            {warehouses.length === 0 && <option>Main Warehouse (JKT)</option>}
          </select>
        </div>
        
        <div className="notification-wrapper">
          <button className="notification-btn" aria-label="Notifications" aria-expanded={showDropdown} onClick={() => setShowDropdown(!showDropdown)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge" aria-label={`${unreadCount} unread`}>{unreadCount}</span>}
          </button>
 
          {showDropdown && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <h4>Notifikasi</h4>
                {unreadCount > 0 && <span className="unread-dot-label">{unreadCount} Baru</span>}
              </div>
              {notifs.length === 0 ? (
                <div className="notif-empty">
                  <p>Tidak ada notifikasi baru</p>
                </div>
              ) : (
                <div className="notif-list">
                  {notifs.map(n => (
                    <div key={n.id} className={`notif-item ${n.is_read ? 'read' : 'unread'}`}>
                      <div className="notif-item-header">
                        <span className={`notif-tag ${n.type.toLowerCase()}`}>
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <button className="mark-read-btn" onClick={() => markAsRead(n.id)}>
                            Tandai dibaca
                          </button>
                        )}
                      </div>
                      <p className="notif-message">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
