// Determine current environment
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// PRODUCTION BACKEND URL

const RENDER_BACKEND_URL = 'https://nexus-o9t2.onrender.com';

window.CONFIG = {
  API: isLocalhost ? 'http://127.0.0.1:4000/api' : (RENDER_BACKEND_URL ? `${RENDER_BACKEND_URL}/api` : '/api'),
  SOCKET: isLocalhost ? 'http://127.0.0.1:4000' : (RENDER_BACKEND_URL || '/')
};
