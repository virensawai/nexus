const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:     { type: String, required: true },
  read:     { type: Boolean, default: false },
  readAt:   { type: Date }
}, { timestamps: true });

// Compound index for optimizing chat history fetches based on conversationId
MessageSchema.index({ conversationId: 1, createdAt: 1 });

// TTL index to automatically drop messages older than 30 days (2592000 sec)
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Message', MessageSchema);
