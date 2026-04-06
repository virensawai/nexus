const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_secret_key_change_in_prod';

// Rate limiters
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many attempts' } });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: 'Too many accounts from this IP' } });

// Deprecated: Migrating away from cookies due to Cross Domain Vercel & Render issues
// const cookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === 'production',
//   sameSite: 'lax',
//   maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
// };

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: 'Username already taken' });

    const hashed = await bcrypt.hash(password, 10);
    const qrCode = uuidv4();
    const user = await User.create({ username, password: hashed, qrCode });
    // Send JWT token natively
    const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user._id, username, qrCode } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    let user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ error: 'Invalid credentials' });

    if (!user.qrCode) {
      user.qrCode = uuidv4();
      await user.save();
    }

    const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username, qrCode: user.qrCode } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/logout', (req, res) => {
  // Cookies are obsolete here but kept empty if needed in future 
  res.json({ success: true });
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    let user = await User.findById(req.user.id).select('-password').populate('connections', 'username qrCode isOnline lastSeen');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (!user.qrCode) {
      user.qrCode = uuidv4();
      await user.save();
    }
    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = { authRouter: router, authMiddleware, JWT_SECRET };
