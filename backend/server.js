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
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://127.0.0.1:5500').replace(/\/+$/, ''); // strip trailing slash
console.log('FRONTEND_URL configured as:', FRONTEND_URL);

const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  FRONTEND_URL.replace('localhost', '127.0.0.1'),
  FRONTEND_URL.replace('127.0.0.1', 'localhost'),
  'https://nexus-me.vercel.app',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
// De-duplicate
const uniqueOrigins = [...new Set(ALLOWED_ORIGINS)];
console.log('Allowed CORS origins:', uniqueOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (uniqueOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      // Return false instead of Error to avoid 500 on preflight
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

const io = new Server(server, { cors: corsOptions });

// Middleware — CORS must come BEFORE helmet so preflight OPTIONS requests succeed
app.use(cors(corsOptions));
// Explicitly handle all OPTIONS preflight requests
app.options('*', cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false
}));
app.use(express.json());

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
