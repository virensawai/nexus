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
    const messages = await Message.find({ conversationId: convId }).sort({ createdAt: 1 }).limit(100);

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
