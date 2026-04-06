import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { toast } from './Toast';

const ChatArea = () => {
  const { me, apiFetch, setMe } = useAuth();
  const { activeChatId, setActiveChatId, messages, sendMessage, setMessages, setUnread, socket } = useSocket();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const touchStartRef = useRef(null);

  const getConnId = (c) => String(c._id || c.id);
  const activeConn = me?.connections?.find(c => getConnId(c) === activeChatId);

  useEffect(() => {
    if (!activeChatId) return;
    
    const loadServerMsgs = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/messages/${activeChatId}`);
        let serverMsgs = [];
        try { serverMsgs = await res.json(); } catch { /* ignore parse errors */ }
        if (!Array.isArray(serverMsgs)) serverMsgs = [];

        setMessages(prev => {
          const existingLocal = prev[activeChatId] || [];
          const serverIds = new Set(serverMsgs.map(m => String(m._id)));
          const localOnly = existingLocal.filter(m => m._optimistic && !serverIds.has(String(m._id)));
          return { ...prev, [activeChatId]: [...serverMsgs, ...localOnly] };
        });
      } catch (e) {
        console.error('Failed to load msgs:', e);
      } finally {
        setLoading(false);
      }
    };
    
    loadServerMsgs();
    
    // Clear unread badge when opening a chat
    setUnread(prev => {
      if (!prev[activeChatId]) return prev;
      const copy = { ...prev };
      delete copy[activeChatId];
      return copy;
    });
    // Mark as read on server
    if (socket) {
      socket.emit('mark_read', { senderId: activeChatId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeChatId]);

  // Swipe-right gesture to go back to connections on mobile
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    // Only track swipes starting from the left 40px edge of screen
    if (touch.clientX < 40) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    } else {
      touchStartRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    // Swipe right at least 80px, and keep it mostly horizontal
    if (dx > 80 && dy < 100) {
      setActiveChatId(null);
    }
    touchStartRef.current = null;
  }, [setActiveChatId]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (sendMessage(inputText.trim(), activeChatId)) {
      setInputText('');
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Remove ${activeConn?.username} from your connections?`)) return;
    try {
      await apiFetch(`/connect/${activeChatId}`, 'DELETE');
      setMe(prev => ({ ...prev, connections: prev.connections.filter(c => getConnId(c) !== activeChatId) }));
      setActiveChatId(null);
      toast('Connection removed');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const formatTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!activeChatId) {
    return (
      <main className="chat-area">
        <div className="chat-empty">
          <div className="nexus-logo-big">⬡</div>
          <h2>Connect with someone</h2>
          <p>Only 5 people. Total privacy.</p>
        </div>
      </main>
    );
  }

  const uMsgs = messages[activeChatId] || [];
  let lastDate = null;

  return (
    <main className="chat-area" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div id="chat-panel" className="chat-panel">
        <div className="chat-header glass">
          <button className="icon-btn mobile-back-btn" onClick={() => setActiveChatId(null)} aria-label="Back to connections">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="chat-avatar">{activeConn?.username?.[0]?.toUpperCase()}</div>
          <div className="chat-info">
            <span className="chat-name">{activeConn?.username}</span>
            <span className={`chat-status ${activeConn?.isOnline ? 'online' : ''}`}>
              {activeConn?.isOnline ? '● online' : `last seen ${formatTime(activeConn?.lastSeen)}`}
            </span>
          </div>
          <button className="icon-btn danger" onClick={handleRemove} title="Remove">✕</button>
        </div>

        <div className="messages-container" ref={scrollRef}>
          {loading && <div className="messages-loading">Loading messages…</div>}
          {!loading && uMsgs.length === 0 && (
            <div className="messages-loading">No messages yet. Say hello!</div>
          )}
          
          {uMsgs.map((msg, i) => {
            const d = new Date(msg.createdAt);
            const dateStr = d.toLocaleDateString();
            let showSep = false;
            if (dateStr !== lastDate) {
              showSep = true;
              lastDate = dateStr;
            }

            const isMine = String(msg.sender) === String(me._id || me.id) || 
                           (msg.sender?._id && String(msg.sender._id) === String(me._id || me.id));

            return (
              <React.Fragment key={msg._id || i}>
                {showSep && (
                  <div className="day-sep">
                    {dateStr === new Date().toLocaleDateString() ? 'Today' : dateStr}
                  </div>
                )}
                <div className={`msg-row ${isMine ? 'sent' : 'received'}`}>
                  <div className="msg-bubble">
                    {msg.text}
                    <div className="msg-meta">
                      <span>{formatTime(msg.createdAt)}</span>
                      {isMine && (
                         <span className={msg.read ? 'read-tick' : ''} style={!msg.read ? { color: 'var(--text-muted)' } : {}}>
                           {msg.read ? '✓✓' : '✓'}
                         </span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="chat-input-area glass">
          <input 
            type="text" 
            placeholder="Type a message…" 
            maxLength="1000"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button className="send-btn" onClick={handleSend}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
};

export default ChatArea;

