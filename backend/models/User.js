const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username:   { type: String, required: true, unique: true, trim: true },
  password:   { type: String, required: true },
  qrCode:     { type: String, unique: true },
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // max 5
  isOnline:   { type: Boolean, default: false },
  lastSeen:   { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
