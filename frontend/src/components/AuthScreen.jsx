import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from './Toast';

const AuthScreen = () => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (tab === 'login') await login(username, password);
      else await register(username, password);
      toast(tab === 'login' ? 'Logged in' : 'Registered successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen" className="screen active">
      <div className="auth-card glass">
        <div className="brand">
          <div className="brand-icon">⬡</div>
          <h1 className="brand-name">NEXUS</h1>
          <p className="brand-sub">5 connections. Total privacy.</p>
        </div>

        <div className="tab-switcher">
          <button className={`tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Login</button>
          <button className={`tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Register</button>
          <div className={`tab-indicator ${tab === 'register' ? 'right' : ''}`}></div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input type="text" placeholder="enter username" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            <span>{tab === 'login' ? 'Login' : 'Register'}</span>
            <div className="btn-shimmer"></div>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
