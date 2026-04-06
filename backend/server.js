// 1. THIS MUST BE LINE 1: Load environment variables immediately
require('dotenv').config(); 

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// 2. Import and initialize your new database configuration
const connectDB = require('./config/db');
connectDB();

const app = express();
const server = http.createServer(app);

// CORS: Allow both localhost and 127.0.0.1 (browsers treat them as different origins)
// With Vercel -> Render cross domain, allowing generic localhosts + frontend production host is necessary
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  FRONTEND_URL.replace('localhost', '127.0.0.1'),
  FRONTEND_URL.replace('127.0.0.1', 'localhost'),
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
// De-duplicate
const uniqueOrigins = [...new Set(ALLOWED_ORIGINS)];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (uniqueOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  // IMPORTANT: allow Authorization header to pass through CORS successfully
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

const io = new Server(server, { cors: corsOptions });

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
// app.use(cookieParser()); // Kept for legacy usage but not needed for auth

// State Tracker
const onlineUsers = new Map();

app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Imports Extracted Logic Controllers
const { authRouter } = require('./routes/auth');
const connectionsRouter = require('./routes/connections');
const { messagesRouter } = require('./routes/messages');

// Bind APIs
app.use('/api', authRouter); 
app.use('/api/connect', connectionsRouter);
app.use('/api/messages', messagesRouter);

// Boot Websocket Config
require('./sockets/chat')(io, onlineUsers);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Nexus server running on port ${PORT}`));

app.get('/ping', (req, res) => {
  res.status(200).send('Server is awake');
});
