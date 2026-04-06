const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('./auth');

// Lookup user by QR code UUID
router.get('/:qrCode', authMiddleware, async (req, res) => {
  try {
    const target = await User.findOne({ qrCode: req.params.qrCode }).select('-password');
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target._id.toString() === req.user.id) return res.status(400).json({ error: "That's your own QR code" });
    res.json({ id: target._id, username: target.username, qrCode: target.qrCode });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Connect two users via QR code
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { targetQR } = req.body;
    const me = await User.findById(req.user.id);
    const them = await User.findOne({ qrCode: targetQR });

    if (!them) return res.status(404).json({ error: 'User not found' });
    if (them._id.toString() === req.user.id) return res.status(400).json({ error: "Can't connect to yourself" });
    if (me.connections.includes(them._id)) return res.status(400).json({ error: 'Already connected' });
    
    // Check local bounds
    if (me.connections.length >= 5) return res.status(400).json({ error: 'You already have 5 connections. Remove one to add more.' });
    if (them.connections.length >= 5) return res.status(400).json({ error: 'That user already has 5 connections.' });

    // Safely mutated using native save for reliability over findOneAndUpdate
    if (!me.connections.includes(them._id)) {
        me.connections.push(them._id);
        await me.save();
    }
    
    if (!them.connections.includes(me._id)) {
        them.connections.push(me._id);
        await them.save();
    }

    // Notify target user if online (using socket)
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const targetSockets = onlineUsers.get(them._id.toString());
    
    if (targetSockets && targetSockets.size > 0 && io) {
      targetSockets.forEach(socketId => {
        io.to(socketId).emit('new_connection', {
          id: me._id, username: me.username, qrCode: me.qrCode, isOnline: true
        });
      });
    }

    const themOnline = onlineUsers.has(them._id.toString()) && onlineUsers.get(them._id.toString()).size > 0;
    res.json({ success: true, user: { id: them._id, username: them.username, qrCode: them.qrCode, isOnline: themOnline } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Remove a connection
router.delete('/:targetId', authMiddleware, async (req, res) => {
  try {
    const meId = req.user.id;
    const targetId = req.params.targetId;

    await User.findByIdAndUpdate(meId, { $pull: { connections: targetId } });
    await User.findByIdAndUpdate(targetId, { $pull: { connections: meId } });

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
