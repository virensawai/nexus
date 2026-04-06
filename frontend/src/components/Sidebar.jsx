import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import QRModals from './QRModals';

const Sidebar = () => {
  const { me, logout } = useAuth();
  const { activeChatId, setActiveChatId, unread, setUnread, messages, socket } = useSocket();
  const connections = me?.connections || [];
  
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  const getConnId = (c) => String(c._id || c.id);

  const handleSelectChat = (uid) => {
    setActiveChatId(uid);
    // Instantly clear unread badge for this chat
    setUnread(prev => {
      if (!prev[uid]) return prev;
      const copy = { ...prev };
      delete copy[uid];
      return copy;
    });
    // Tell server to mark messages as read
    if (socket) {
      socket.emit('mark_read', { senderId: uid });
    }
  };

  return (
    <>
      <aside className={`sidebar glass ${activeChatId ? 'sidebar-hidden' : ''}`}>
        <div className="sidebar-header">
          <div className="user-avatar">{me.username[0].toUpperCase()}</div>
          <div className="user-info">
            <span className="user-name">{me.username}</span>
            <span className="user-status online">● online</span>
          </div>
          <button className="icon-btn" onClick={logout} title="Logout">⏻</button>
        </div>

        <div className="connections-label">
          <span>Connections</span>
          <span className="conn-count">{connections.length} / 5</span>
        </div>

        <div className="connections-list">
          {!connections.length ? (
            <div className="empty-state">
              <div className="empty-icon">◎</div>
              <p>No connections yet.</p>
              <p>Scan a QR code to connect.</p>
            </div>
          ) : (
            connections.map(c => {
              const uid = getConnId(c);
              const isActive = activeChatId === uid;
              const unreadCount = unread[uid] || 0;
              const statusClass = c.isOnline ? 'online' : 'offline';
              const uMsgs = messages[uid] || [];
              const lastMsg = uMsgs.length > 0 ? uMsgs[uMsgs.length - 1].text : '';

              return (
                <div key={uid} className={`conn-item ${isActive ? 'active' : ''}`} onClick={() => handleSelectChat(uid)}>
                  <div className="conn-avatar">
                    {c.username[0].toUpperCase()}
                    <div className={`status-dot ${statusClass}`}></div>
                  </div>
                  <div className="conn-details">
                    <div className="conn-name">{c.username}</div>
                    <div className="conn-last">{lastMsg || (c.isOnline ? 'online' : 'offline')}</div>
                  </div>
                  {unreadCount > 0 && <div className="unread-badge">{unreadCount}</div>}
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-footer">
          <button className="btn-secondary" onClick={() => setShowMyQR(true)}>My QR Code</button>
          <button className="btn-secondary" onClick={() => setShowScanner(true)}>Scan & Connect</button>
        </div>
      </aside>

      {showMyQR && <QRModals type="my_qr" onClose={() => setShowMyQR(false)} />}
      {showScanner && <QRModals type="scanner" onClose={() => setShowScanner(false)} />}
    </>
  );
};

export default Sidebar;

