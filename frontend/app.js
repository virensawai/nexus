/* ── Config ──────────────────────────────────────────────────────── */
const API = window.CONFIG.API;
let socket = null;

/* ── State ───────────────────────────────────────────────────────── */
let state = {
  me: null,
  connections: [],
  activeChatId: null,
  messages: {},        // { userId: [msg, ...] }
  unread: {},          // { userId: count }
  scannerStream: null,
  scannerInterval: null,
  scannedUser: null,
  currentTab: 'login'
};

/* ── Init ─────────────────────────────────────────────────────────── */
window.addEventListener('load', async () => {
  try {
    const res = await apiFetch('/me');
    if (res.ok) {
      const data = await res.json();
      state.me = data;
      state.connections = data.connections || [];
      initApp();
    } else {
      showScreen('auth-screen');
    }
  } catch (e) {
    showScreen('auth-screen');
  }
});

/* ── Auth ─────────────────────────────────────────────────────────── */
function switchTab(tab) {
  state.currentTab = tab;
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('tab-indicator').classList.toggle('right', tab === 'register');
  document.getElementById('auth-btn-text').textContent = tab === 'login' ? 'Login' : 'Register';
  hideError('auth-error');
}

async function handleAuth(e) {
  e.preventDefault();
  const username = document.getElementById('inp-username').value.trim();
  const password = document.getElementById('inp-password').value;
  const endpoint = state.currentTab === 'login' ? '/login' : '/register';

  const btn = document.getElementById('auth-submit');
  btn.disabled = true; btn.style.opacity = '0.7';

  try {
    const res = await apiFetch(endpoint, 'POST', { username, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');

    state.me = data.user;
    localStorage.setItem('nexus_token', data.token); // Store token via localStorage
    await loadMe(); // Force fresh fetch of connections
    initApp();
  } catch (err) {
    showError('auth-error', err.message);
  } finally {
    btn.disabled = false; btn.style.opacity = '1';
  }
}

async function logout() {
  if (socket) socket.disconnect();
  try { await apiFetch('/logout', 'POST'); } catch (e) {} // notify backend
  
  localStorage.removeItem('nexus_token'); // Clear stored token
  
  state = { me: null, connections: [], activeChatId: null, messages: {}, unread: {}, scannerStream: null, scannerInterval: null, scannedUser: null, currentTab: 'login' };
  
  document.getElementById('messages-container').innerHTML = ''; // reset chat
  document.getElementById('connections-list').innerHTML = '';
  document.getElementById('chat-panel').classList.add('hidden');
  document.getElementById('chat-empty').style.display = 'flex';
  
  showScreen('auth-screen');
  toast('Logged out', 'success');
}

/* ── App Init ─────────────────────────────────────────────────────── */
async function initApp() {
  showScreen('app-screen');
  document.getElementById('my-username').textContent = state.me.username;
  document.getElementById('my-avatar').textContent = state.me.username[0].toUpperCase();

  renderConnections();
  connectSocket();
}

async function loadMe() {
  try {
    const res = await apiFetch('/me');
    if (res.ok) {
        const data = await res.json();
        state.me = { ...state.me, ...data };
        state.connections = data.connections || [];
    }
  } catch (e) { console.error(e); }
}

/* ── Socket ───────────────────────────────────────────────────────── */
function connectSocket() {
  if (socket) socket.disconnect();
  
  // Pass JWT during handshake connection via socket
  socket = io(window.CONFIG.SOCKET, { 
    auth: { token: localStorage.getItem('nexus_token') } 
  });

  socket.on('connect', () => console.log('Socket connected'));

  socket.on('new_message', (msg) => {
    pushMessage(msg);
    if (state.activeChatId !== msg.sender) {
      state.unread[msg.sender] = (state.unread[msg.sender] || 0) + 1;
      renderConnections();
    } else {
      socket.emit('mark_read', { senderId: msg.sender });
      renderMessages(msg.sender); // Keep screen up to date
      scrollToBottom();
    }
    updateConnLastMsg(msg.sender, msg.text);
  });

  socket.on('message_sent', (msg) => {
    pushMessage(msg);
    renderMessages(state.activeChatId);
    scrollToBottom();
    updateConnLastMsg(msg.receiver, msg.text);
  });

  socket.on('messages_read', ({ by }) => {
    if (state.messages[by]) {
      state.messages[by].forEach(m => { if (m.sender === state.me.id || m.sender === state.me._id) m.read = true; });
      if (state.activeChatId === by) renderMessages(by);
    }
  });

  socket.on('user_status', ({ userId, isOnline, lastSeen }) => {
    const conn = state.connections.find(c => c._id === userId || c.id === userId);
    if (conn) {
      conn.isOnline = isOnline;
      conn.lastSeen = lastSeen;
      renderConnections();
      if (state.activeChatId === userId) updateChatHeader();
    }
  });

  socket.on('new_connection', (user) => {
    if(!state.connections.find(c => c.id === user.id || c._id === user.id)){
       state.connections.push(user);
       renderConnections();
    }
    toast(`${user.username} connected with you!`, 'success');
  });

  socket.on('error', (msg) => toast(msg, 'error'));
}

/* ── Connections Render ───────────────────────────────────────────── */
function renderConnections() {
  const list = document.getElementById('connections-list');
  document.getElementById('conn-count').textContent = `${state.connections.length} / 5`;
  
  // Safe DOM Clearing
  while (list.firstChild) list.removeChild(list.firstChild);

  if (!state.connections.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '◎';
    
    const p1 = document.createElement('p');
    p1.textContent = 'No connections yet.';
    
    const p2 = document.createElement('p');
    p2.textContent = 'Scan a QR code to connect.';
    
    emptyState.appendChild(icon);
    emptyState.appendChild(p1);
    emptyState.appendChild(p2);
    list.appendChild(emptyState);
    return;
  }

  state.connections.forEach(c => {
    const uid = c._id || c.id;
    const isActive = state.activeChatId === uid;
    const unread = state.unread[uid] || 0;
    const statusClass = c.isOnline ? 'online' : 'offline';
    const lastMsg = state.messages[uid]?.slice(-1)[0]?.text || '';

    const connItem = document.createElement('div');
    connItem.className = `conn-item ${isActive ? 'active' : ''}`;
    connItem.onclick = () => openChat(uid);

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'conn-avatar';
    avatarDiv.textContent = c.username[0].toUpperCase();
    
    const statusDot = document.createElement('div');
    statusDot.className = `status-dot ${statusClass}`;
    avatarDiv.appendChild(statusDot);

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'conn-details';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'conn-name';
    nameDiv.textContent = c.username;
    
    const lastMsgDiv = document.createElement('div');
    lastMsgDiv.className = 'conn-last';
    lastMsgDiv.textContent = lastMsg || (c.isOnline ? 'online' : 'offline');

    detailsDiv.appendChild(nameDiv);
    detailsDiv.appendChild(lastMsgDiv);

    connItem.appendChild(avatarDiv);
    connItem.appendChild(detailsDiv);

    if (unread > 0) {
      const unreadBadge = document.createElement('div');
      unreadBadge.className = 'unread-badge';
      unreadBadge.textContent = unread;
      connItem.appendChild(unreadBadge);
    }

    list.appendChild(connItem);
  });
}

/* ── Chat ─────────────────────────────────────────────────────────── */
async function openChat(userId) {
  state.activeChatId = userId;
  state.unread[userId] = 0;

  document.getElementById('chat-empty').style.display = 'none';
  const panel = document.getElementById('chat-panel');
  panel.classList.remove('hidden');

  updateChatHeader();
  renderConnections();

  // Load messages if not cached
  if (!state.messages[userId]) {
    document.getElementById('msg-loading').style.display = 'block';
    try {
      const res = await apiFetch(`/messages/${userId}`);
      const msgs = await res.json();
      state.messages[userId] = msgs;
    } catch (e) { console.error(e); }
  }

  renderMessages(userId);
  scrollToBottom();

  if (socket) socket.emit('mark_read', { senderId: userId });
  mobileHideSidebar();
  document.getElementById('msg-input').focus();
}

function updateChatHeader() {
  const uid = state.activeChatId;
  const conn = state.connections.find(c => (c._id || c.id) === uid);
  if (!conn) return;
  document.getElementById('chat-avatar').textContent = conn.username[0].toUpperCase();
  document.getElementById('chat-name').textContent = conn.username;
  const statusEl = document.getElementById('chat-status');
  statusEl.textContent = conn.isOnline ? '● online' : `last seen ${formatTime(conn.lastSeen)}`;
  statusEl.className = 'chat-status ' + (conn.isOnline ? 'online' : '');
}

function renderMessages(userId) {
  document.getElementById('msg-loading').style.display = 'none';
  const container = document.getElementById('messages-container');
  const msgs = state.messages[userId] || [];

  // Safe DOM Clearing
  while (container.firstChild) container.removeChild(container.firstChild);

  if (!msgs.length) {
    const loadMsg = document.createElement('div');
    loadMsg.className = 'messages-loading';
    loadMsg.textContent = 'No messages yet. Say hello!';
    container.appendChild(loadMsg);
    return;
  }

  let lastDate = null;

  msgs.forEach(msg => {
    const d = new Date(msg.createdAt);
    const dateStr = d.toLocaleDateString();
    
    if (dateStr !== lastDate) {
      const sep = document.createElement('div');
      sep.className = 'day-sep';
      sep.textContent = dateStr === new Date().toLocaleDateString() ? 'Today' : dateStr;
      container.appendChild(sep);
      lastDate = dateStr;
    }

    const isSent = (msg.sender === state.me.id || msg.sender === state.me._id || (msg.sender && msg.sender._id === state.me._id));
    
    const row = document.createElement('div');
    row.className = `msg-row ${isSent ? 'sent' : 'received'}`;

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    
    // Create text node to prevent any XSS HTML string execution
    bubble.appendChild(document.createTextNode(msg.text));

    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    
    const timeSpan = document.createElement('span');
    timeSpan.textContent = formatTime(msg.createdAt);
    meta.appendChild(timeSpan);

    if (isSent) {
      const readTick = document.createElement('span');
      if (msg.read) {
         readTick.className = 'read-tick';
         readTick.textContent = '✓✓';
      } else {
         readTick.style.color = 'var(--text-muted)';
         readTick.textContent = '✓';
      }
      meta.appendChild(readTick);
    }

    bubble.appendChild(meta);
    row.appendChild(bubble);
    container.appendChild(row);
  });
}

function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text || !state.activeChatId || !socket) return;

  socket.emit('send_message', { receiverId: state.activeChatId, text });
  input.value = '';
}

function pushMessage(msg) {
  const uid = (msg.sender === state.me.id || msg.sender === state.me._id) ? msg.receiver : msg.sender;
  if (!state.messages[uid]) state.messages[uid] = [];
  if (!state.messages[uid].find(m => m._id === msg._id)) {
    state.messages[uid].push(msg);
  }
}

function scrollToBottom() {
  setTimeout(() => {
    const c = document.getElementById('messages-container');
    c.scrollTop = c.scrollHeight;
  }, 50);
}

async function removeConnection() {
  if (!state.activeChatId) return;
  const conn = state.connections.find(c => (c._id || c.id) === state.activeChatId);
  if (!confirm(`Remove ${conn?.username} from your connections?`)) return;

  try {
    await apiFetch(`/connect/${state.activeChatId}`, 'DELETE');
    state.connections = state.connections.filter(c => (c._id || c.id) !== state.activeChatId);
    delete state.messages[state.activeChatId];
    state.activeChatId = null;
    document.getElementById('chat-panel').classList.add('hidden');
    document.getElementById('chat-empty').style.display = 'flex';
    renderConnections();
    toast('Connection removed', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

function updateConnLastMsg() {
  renderConnections();
}

/* ── QR Code Display ─────────────────────────────────────────────── */
function showMyQR() {
  const container = document.getElementById('my-qr-container');
  // QR config injection is safe (internal trusted string), but clear logic updated to DOM 
  while(container.firstChild) container.removeChild(container.firstChild);

  new QRCode(container, {
    text: state.me.qrCode,
    width: 200, height: 200,
    colorDark: '#050810', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
  document.getElementById('my-qr-uid').textContent = state.me.qrCode;
  document.getElementById('qr-modal').classList.remove('hidden');
}

/* ── QR Scanner ─────────────────────────────────────────────────── */
async function showScanner() {
  state.scannedUser = null;
  document.getElementById('scanner-result').classList.add('hidden');
  hideError('scanner-error');
  document.getElementById('manual-qr').value = '';
  document.getElementById('scanner-modal').classList.remove('hidden');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    state.scannerStream = stream;
    const video = document.getElementById('scanner-video');
    video.srcObject = stream;
    video.play();
    startScanning();
  } catch (e) {
    showError('scanner-error', 'Camera not available. Use the manual input below.');
  }
}

function startScanning() {
  const video  = document.getElementById('scanner-video');
  const canvas = document.getElementById('scanner-canvas');
  const ctx    = canvas.getContext('2d');

  state.scannerInterval = setInterval(() => {
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      clearInterval(state.scannerInterval);
      processQRCode(code.data);
    }
  }, 200);
}

async function processQRCode(qrValue) {
  try {
    const res = await apiFetch(`/connect/${qrValue}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    state.scannedUser = data;
    showScanResult(data);
  } catch (e) {
    showError('scanner-error', e.message);
    startScanning();
  }
}

async function manualLookup() {
  const qr = document.getElementById('manual-qr').value.trim();
  if (!qr) return;
  hideError('scanner-error');
  
  try {
     const res = await apiFetch(`/connect/${qr}`);
     const data = await res.json();
     if (!res.ok) throw new Error(data.error);
     state.scannedUser = data;
     showScanResult(data);
  } catch (e) {
     showError('scanner-error', e.message);
  }
}

function showScanResult(user) {
  document.getElementById('result-avatar').textContent = user.username[0].toUpperCase();
  document.getElementById('result-name').textContent = user.username;
  document.getElementById('scanner-result').classList.remove('hidden');
}

async function confirmConnect() {
  if (!state.scannedUser) return;
  try {
    const res = await apiFetch('/connect', 'POST', { targetQR: state.scannedUser.qrCode });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    state.connections.push({ ...state.scannedUser, _id: state.scannedUser.id, isOnline: false });
    renderConnections();
    closeScanner();
    toast(`Connected with ${state.scannedUser.username}!`, 'success');
  } catch (e) {
    showError('scanner-error', e.message);
  }
}

function closeScanner() {
  clearInterval(state.scannerInterval);
  if (state.scannerStream) {
    state.scannerStream.getTracks().forEach(t => t.stop());
    state.scannerStream = null;
  }
  closeModal('scanner-modal');
}

/* ── Mobile Sidebar Toggle ───────────────────────────────────────── */
function isMobileView() {
  return window.innerWidth <= 768;
}

function mobileHideSidebar() {
  if (!isMobileView()) return;
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.add('sidebar-hidden');
}

function mobileShowSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('sidebar-hidden');
}

function mobileBackToSidebar() {
  mobileShowSidebar();
  // Optionally deselect active chat on mobile for cleaner UX
  // state.activeChatId = null;
  // document.getElementById('chat-panel').classList.add('hidden');
  // document.getElementById('chat-empty').style.display = 'flex';
  // renderConnections();
}

// Ensure sidebar is visible when resizing from mobile to desktop
window.addEventListener('resize', () => {
  if (!isMobileView()) {
    mobileShowSidebar();
  }
});

/* ── Helpers ─────────────────────────────────────────────────────── */
async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  const token = localStorage.getItem('nexus_token');
  if (token) {
    opts.headers['Authorization'] = `Bearer ${token}`; // Send token manually to bypass cross origin defaults
  }
  if (body) opts.body = JSON.stringify(body);
  return fetch(API + path, opts);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError(id) { document.getElementById(id).classList.add('hidden'); }

function formatTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let toastTimer;
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}
