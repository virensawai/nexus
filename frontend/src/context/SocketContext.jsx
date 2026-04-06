import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { CONFIG } from '../config';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

function loadCache(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}

export const SocketProvider = ({ children }) => {
  const { me, token, setMe } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState(() => loadCache('nexus_msg_cache'));
  const [unread, setUnread] = useState(() => loadCache('nexus_unread_cache'));
  const [activeChatId, setActiveChatId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Use refs for values that change but shouldn't trigger reconnects or effect staleness
  const messagesRef = useRef(messages);
  const unreadRef = useRef(unread);
  const activeChatIdRef = useRef(activeChatId);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      const trimmed = {};
      for (const uid in messages) {
        trimmed[uid] = messages[uid].filter(m => !m._optimistic).slice(-100);
      }
      localStorage.setItem('nexus_msg_cache', JSON.stringify(trimmed));
    } catch(e) {}
  }, [messages]);

  useEffect(() => {
    unreadRef.current = unread;
    try { localStorage.setItem('nexus_unread_cache', JSON.stringify(unread)); } catch {}
  }, [unread]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const getMyId = () => me ? String(me._id || me.id) : null;

  useEffect(() => {
    if (!token || !me) {
      if (socket) socket.disconnect();
      return;
    }

    const newSocket = io(CONFIG.SOCKET, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    newSocket.on('connect', () => setSocketConnected(true));
    newSocket.on('disconnect', (reason) => {
      setSocketConnected(false);
      if (reason === 'io server disconnect') newSocket.connect();
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [token, me?.id]);

  useEffect(() => {
    if (!socket || !me) return;

    const handleNewMessage = (msg) => {
      const myId = String(me._id || me.id);
      const isMine = String(msg.sender) === myId;
      const uid = isMine ? String(msg.receiver) : String(msg.sender);

      setMessages(prev => {
        const uMsgs = prev[uid] || [];
        const isDupe = uMsgs.some(m => !m._optimistic && String(m._id) === String(msg._id));
        if (isDupe) return prev;

        const nextMsgs = [...uMsgs];
        if (isMine) {
          const optIdx = nextMsgs.findIndex(m => m._optimistic && m.text === msg.text && String(m.receiver) === String(msg.receiver));
          if (optIdx !== -1) nextMsgs.splice(optIdx, 1);
        }
        nextMsgs.push(msg);
        return { ...prev, [uid]: nextMsgs };
      });

      if (!isMine && activeChatIdRef.current !== uid) {
        setUnread(prev => ({ ...prev, [uid]: (prev[uid] || 0) + 1 }));
      } else if (!isMine && activeChatIdRef.current === uid) {
        socket.emit('mark_read', { senderId: uid });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleNewMessage);

    socket.on('messages_read', ({ by }) => {
      const byStr = String(by);
      setMessages(prev => {
        if (!prev[byStr]) return prev;
        const myId = String(me._id || me.id);
        const copy = prev[byStr].map(m => String(m.sender) === myId ? { ...m, read: true } : m);
        return { ...prev, [byStr]: copy };
      });
    });

    socket.on('user_status', ({ userId, isOnline, lastSeen }) => {
      setMe(prev => {
        if (!prev || !prev.connections) return prev;
        const copy = [...prev.connections];
        const idx = copy.findIndex(c => String(c._id || c.id) === String(userId));
        if (idx !== -1) {
          copy[idx] = { ...copy[idx], isOnline, lastSeen };
          return { ...prev, connections: copy };
        }
        return prev;
      });
    });

    // When another user scans our QR and connects, update our connections list live
    socket.on('new_connection', (newUser) => {
      setMe(prev => {
        if (!prev) return prev;
        const existing = (prev.connections || []);
        // Prevent duplicate entries
        const alreadyExists = existing.some(
          c => String(c._id || c.id) === String(newUser.id)
        );
        if (alreadyExists) return prev;
        return {
          ...prev,
          connections: [...existing, { _id: newUser.id, username: newUser.username, qrCode: newUser.qrCode, isOnline: true }]
        };
      });
    });

    return () => {
      socket.off('new_message');
      socket.off('message_sent');
      socket.off('messages_read');
      socket.off('user_status');
      socket.off('new_connection');
    };
  }, [socket, me]);

  const sendMessage = (text, uid) => {
    if (!text || !uid || !socketConnected) return false;
    const myId = getMyId();
    
    const optimisticMsg = {
      _id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      sender: myId,
      receiver: uid,
      text: text,
      read: false,
      createdAt: new Date().toISOString(),
      _optimistic: true
    };

    setMessages(prev => ({
      ...prev,
      [uid]: [...(prev[uid] || []), optimisticMsg]
    }));

    socket.emit('send_message', { receiverId: uid, text });
    return true;
  };

  return (
    <SocketContext.Provider value={{ 
      socket, socketConnected, messages, setMessages, 
      unread, setUnread, activeChatId, setActiveChatId, sendMessage 
    }}>
      {children}
    </SocketContext.Provider>
  );
};
