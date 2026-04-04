// Determine current environment
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// PRODUCTION BACKEND URL
// Replace this with your actual Render URL later (e.g. 'https://nexus-chat-api.onrender.com')
const RENDER_BACKEND_URL = '';

window.CONFIG = {
  API: isLocalhost ? 'http://127.0.0.1:4000/api' : (RENDER_BACKEND_URL ? `${RENDER_BACKEND_URL}/api` : '/api'),
  SOCKET: isLocalhost ? 'http://127.0.0.1:4000' : (RENDER_BACKEND_URL || '/')
};
