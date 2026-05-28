import React, { useState } from 'react';
import { Layers, Lock, User } from 'lucide-react';
import api from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.login({ username, password });
      localStorage.setItem('wms_token', res.token);
      localStorage.setItem('wms_user', JSON.stringify(res.user));
      window.location.href = '/';
    } catch (err) {
      setError(err.data?.message || 'Login gagal. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '400px', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Layers size={56} color="var(--primary)" style={{ marginBottom: '1rem', dropShadow: '0 4px 6px rgba(99, 102, 241, 0.3)' }} />
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>gudang<span style={{ color: 'var(--primary)' }}>.hovertech</span></h2>
          <p className="text-muted" style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Sistem Informasi Gudang</p>
        </div>
        
        {error && <div style={{ background: 'var(--danger-transparent)', color: 'var(--danger)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: '500' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.8rem 1rem', transition: 'var(--transition)' }}>
            <User size={20} style={{ color: 'var(--text-muted)', marginRight: '0.8rem' }} />
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontSize: '1rem' }}
              required 
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.8rem 1rem', transition: 'var(--transition)' }}>
            <Lock size={20} style={{ color: 'var(--text-muted)', marginRight: '0.8rem' }} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontSize: '1rem' }}
              required 
            />
          </div>

          <button type="submit" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition)', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '2.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '1rem', fontWeight: '500' }}>Quick Access Demo Accounts:</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
            <span style={{cursor: 'pointer', color: 'var(--primary)', fontWeight: '600', padding: '0.3rem 0.6rem', background: 'var(--primary-transparent)', borderRadius: '4px'}} onClick={() => setUsername('superadmin')}>SuperAdmin</span>
            <span style={{cursor: 'pointer', color: 'var(--primary)', fontWeight: '600', padding: '0.3rem 0.6rem', background: 'var(--primary-transparent)', borderRadius: '4px'}} onClick={() => setUsername('manager')}>Manager</span>
            <span style={{cursor: 'pointer', color: 'var(--primary)', fontWeight: '600', padding: '0.3rem 0.6rem', background: 'var(--primary-transparent)', borderRadius: '4px'}} onClick={() => setUsername('operator')}>Operator</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
