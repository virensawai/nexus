import React, { createContext, useContext, useState, useEffect } from 'react';
import { CONFIG } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [me, setMe] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('nexus_token') || null);
  const [loading, setLoading] = useState(true);

  const apiFetch = async (path, method = 'GET', body = null) => {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const currentToken = localStorage.getItem('nexus_token');
    if (currentToken) opts.headers['Authorization'] = `Bearer ${currentToken}`;
    if (body) opts.body = JSON.stringify(body);
    return fetch(CONFIG.API + path, opts);
  };

  const loadMe = async () => {
    try {
      const res = await apiFetch('/me');
      if (res.ok) {
        const data = await res.json();
        setMe(data);
      } else {
        logout();
      }
    } catch (e) {
      console.error(e);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadMe();
    else setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    const res = await apiFetch('/login', 'POST', { username, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('nexus_token', data.token);
    setToken(data.token);
    setMe(data.user);
    await loadMe();
  };

  const register = async (username, password) => {
    const res = await apiFetch('/register', 'POST', { username, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('nexus_token', data.token);
    setToken(data.token);
    setMe(data.user);
    await loadMe();
  };

  const logout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_msg_cache');
    localStorage.removeItem('nexus_unread_cache');
    setToken(null);
    setMe(null);
  };

  return (
    <AuthContext.Provider value={{ me, token, login, register, logout, loading, apiFetch, setMe }}>
      {children}
    </AuthContext.Provider>
  );
};
