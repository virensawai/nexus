const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const { makeConversationId } = require('../routes/messages');
const { JWT_SECRET } = require('../routes/auth');
const cookie = require('cookie'); 
// TODO (State Migration): Render free instances spin down after inactivity. 
// When they wake up, the in-memory Map() is wiped. 
// Recommend using MongoDB or Redis (Render provides Free Redis):
// 1. Install `socket.io-redis` adapter across multiple instances
// 2. Instead of `Map()`, use Redis Set: `redis.sadd('online:' + userId, socket.id)`
// 3. For 'online' tracking: sync Map changes dynamically directly into User.isOnline

module.exports = (io, onlineUsers) => {
  io.use((socket, next) => {
    try {
      // Parse native exact token passed from client on socket connection instead of cookie headers
      const token = socket.handshake.auth.token;

      if (!token) return next(new Error('Unauthorized'));

      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch { 
      next(new Error('Unauthorized')); 
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    
    // Support Multi-Tab: Store sockets recursively into a Set
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast Online ONLY if this was their absolute first tab opened
    if (onlineUsers.get(userId).size === 1) {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      socket.broadcast.emit('user_status', { userId, isOnline: true });
    }

    // Handle Messenging Dispatching
    socket.on('send_message', async ({ receiverId, text }) => {
      try {
        if (!text || typeof text !== 'string') return;
        
        // Defend against arbitrary massive payloads logic crashing backend strings
        const cleanText = text.trim();
        if (cleanText.length > 2000) {
          return socket.emit('error', 'Payload size rejected.');
        }

        console.log(`[chat] send_message from userId=${userId} to receiverId=${receiverId}`);

        const me = await User.findById(userId).select('connections');
        if (!me.connections.some(c => c.toString() === receiverId))
          return socket.emit('error', 'Not connected to this user');

        const convId = makeConversationId(userId, receiverId);
        const msg = await Message.create({
          conversationId: convId,
          sender: userId,
          receiver: receiverId,
          text: cleanText
        });

        const payload = {
          _id: msg._id.toString(),
          conversationId: convId,
          sender: String(userId),
          receiver: String(receiverId),
          text: msg.text,
          read: false,
          createdAt: msg.createdAt
        };

        console.log(`[chat] payload sender=${payload.sender} receiver=${payload.receiver} _id=${payload._id}`);

        // Emit to sender across all open tabs
        const ownSockets = onlineUsers.get(userId);
        if (ownSockets) {
          console.log(`[chat] Emitting message_sent to ${ownSockets.size} sender socket(s)`);
          ownSockets.forEach(sockId => io.to(sockId).emit('message_sent', payload));
        } else {
          console.warn(`[chat] No sender sockets found for userId=${userId}`);
        }

        // Emit dynamically to ALL tabs opened by target receiver
        const receiverSockets = onlineUsers.get(receiverId);
        if (receiverSockets && receiverSockets.size > 0) {
          console.log(`[chat] Emitting new_message to ${receiverSockets.size} receiver socket(s)`);
          receiverSockets.forEach(sockId => io.to(sockId).emit('new_message', payload));
        } else {
          console.log(`[chat] Receiver ${receiverId} is offline, no sockets found`);
        }

      } catch (e) { 
        console.error(e);
        socket.emit('error', 'Server Processing Error'); 
      }
    });

    socket.on('mark_read', async ({ senderId }) => {
      const convId = makeConversationId(userId, senderId);
      await Message.updateMany(
        { conversationId: convId, receiver: userId, read: false },
        { read: true, readAt: new Date() }
      );
      
      const senderSockets = onlineUsers.get(senderId);
      if (senderSockets && senderSockets.size > 0) {
        senderSockets.forEach(sockId => io.to(sockId).emit('messages_read', { by: userId, convId }));
      }
    });

    socket.on('disconnect', async () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // Remove only if User has zero tabs open left matching Map
        if (userSockets.size === 0) {
           onlineUsers.delete(userId);
           const lastSeen = new Date();
           await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
           socket.broadcast.emit('user_status', { userId, isOnline: false, lastSeen });
        }
      }
    });
  });
};
