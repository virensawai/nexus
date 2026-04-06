const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { authMiddleware } = require('./auth');

function makeConversationId(a, b) {
  return [a.toString(), b.toString()].sort().join('_');
}

router.get('/:otherId', authMiddleware, async (req, res) => {
  try {
    const convId = makeConversationId(req.user.id, req.params.otherId);
    const rawMsgs = await Message.find({ conversationId: convId }).sort({ createdAt: 1 }).limit(100);

    // Serialize ObjectIds to strings so frontend idsMatch() works reliably
    const messages = rawMsgs.map(m => ({
      _id: m._id.toString(),
      conversationId: m.conversationId,
      sender: m.sender.toString(),
      receiver: m.receiver.toString(),
      text: m.text,
      read: m.read,
      readAt: m.readAt,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    }));

    // Mark incoming as read
    await Message.updateMany(
      { conversationId: convId, receiver: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json(messages);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = { messagesRouter: router, makeConversationId };
