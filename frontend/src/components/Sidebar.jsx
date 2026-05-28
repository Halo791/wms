import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Layers, Truck, ArrowDownToLine, ArrowUpFromLine, PackageSearch, ClipboardCheck, ArrowLeftRight, Users, ShieldCheck, LogOut, X } from 'lucide-react';
import api from '../services/api';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const userStr = localStorage.getItem('wms_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role || 'operator';

  const handleLogout = async () => {
    try { await api.logout(); } catch (e) {}
    localStorage.removeItem('wms_token');
    localStorage.removeItem('wms_user');
    window.location.href = '/login';
  };

  const navItems = [
    { path: '/', label: 'Dashboard Gudang', icon: LayoutDashboard, roles: ['superadmin', 'manager', 'operator'] },
    { path: '/products', label: 'Katalog Produk', icon: Layers, roles: ['superadmin', 'manager'] },
    { path: '/inventory', label: 'Stok Barang', icon: PackageSearch, roles: ['superadmin', 'manager', 'operator'] },
    { path: '/supply-chain', label: 'Pembelian (PO)', icon: Truck, roles: ['superadmin', 'manager'] },
    { path: '/inbound', label: 'Barang Masuk', icon: ArrowDownToLine, roles: ['superadmin', 'manager', 'operator'] },
    { path: '/outbound', label: 'Barang Keluar', icon: ArrowUpFromLine, roles: ['superadmin', 'manager', 'operator'] },
    { path: '/stock-opname', label: 'Stok Opname', icon: ClipboardCheck, roles: ['superadmin', 'manager', 'operator'] },
    { path: '/transfer', label: 'Pindah Barang', icon: ArrowLeftRight, roles: ['superadmin', 'manager', 'operator'] },
    { path: '/fulfillment', label: 'Penjualan & Kirim', icon: Users, roles: ['superadmin', 'manager'] },
    { path: '/approvals', label: 'Audit & Persetujuan', icon: ShieldCheck, roles: ['superadmin', 'manager'] },
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      {/* Mobile close button */}
      <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
        <X size={20} />
      </button>

      <div className="sidebar-header">
        <div className="logo-icon">
          <Layers size={22} />
        </div>
        <h2 className="logo-text">gudang<span>.hovertech</span></h2>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          {allowedItems.map((item) => (
            <li key={item.path}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon className="nav-icon" size={20} />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-profile-left">
            <div className="avatar">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.username || 'Guest'}</span>
              <span className="user-role">{role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout" aria-label="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
