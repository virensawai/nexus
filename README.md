# ⬡ Nexus Chat

> Privacy-first chat app. 5 connections. QR-only. No strangers.

## Live Demo
- **Frontend**: [Vercel](https://nexus-chat.vercel.app) *(update with your Vercel URL)*
- **Backend**: [Render](https://nexus-o9t2.onrender.com)

## Stack
- **Frontend**: React 19 + Vite (Glassmorphism dark theme)
- **Backend**: Node.js + Express + Socket.io
- **Database**: MongoDB Atlas (Mongoose)
- **Auth**: JWT (Bearer token) + bcrypt
- **QR**: qrcode.react (generate) + jsQR (scan)

---

## Project Structure

```
nexus/
├── backend/
│   ├── server.js          ← Express + Socket.io entry
│   ├── config/db.js       ← MongoDB connection
│   ├── models/            ← User & Message schemas
│   ├── routes/            ← Auth, Connections, Messages
│   ├── sockets/chat.js    ← Real-time WebSocket handler
│   └── package.json
└── frontend/
    ├── index.html         ← Vite entry point
    ├── src/
    │   ├── App.jsx        ← Root component
    │   ├── config.js      ← API/Socket URL config
    │   ├── context/       ← AuthContext, SocketContext
    │   ├── components/    ← AuthScreen, Sidebar, ChatArea, QRModals, Toast
    │   └── index.css      ← Full design system
    ├── vite.config.js
    └── package.json
```

---

## Setup & Run

### Prerequisites
- Node.js v18+
- MongoDB Atlas URI (or local MongoDB)

### Backend
```bash
cd backend
npm install
# Create .env with: MONGO_URI, JWT_SECRET, PORT, FRONTEND_URL
node server.js
# Server starts on http://localhost:4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Dev server starts on http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/nexus` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `your-random-secret-here` |
| `PORT` | Server port | `4000` |
| `FRONTEND_URL` | Frontend origin for CORS | `https://your-app.vercel.app` |

### Frontend (`frontend/src/config.js`)
The Render backend URL is configured in `config.js`. Update `RENDER_BACKEND_URL` with your Render deployment URL.

---

## How It Works

### Connecting Users (QR Only)
1. Register → You get a unique UUID stored as your QR code
2. Click **"My QR Code"** → A QR code is displayed
3. Your friend clicks **"Scan & Connect"** → Camera opens
4. They scan your QR code → Preview shows your username
5. They tap **Connect** → Both users are linked ✅

**5-person limit**: If either user already has 5 connections, the connect request is rejected.

### Features
- ✅ Real-time messaging via Socket.io
- ✅ Online / offline status with last seen
- ✅ Message read receipts (✓ sent, ✓✓ read)
- ✅ QR code generation + camera scanning
- ✅ Manual QR code UUID input (fallback)
- ✅ Remove connections (frees up a slot)
- ✅ JWT authentication (7-day tokens)
- ✅ Message history persisted in MongoDB
- ✅ 30-day TTL auto-cleanup for messages
- ✅ Multi-tab support
- ✅ Fully responsive (desktop, tablet, mobile)

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register` | ❌ | Create account |
| POST | `/api/login` | ❌ | Login, get token |
| GET | `/api/me` | ✅ | Get profile + connections |
| GET | `/api/connect/:qrCode` | ✅ | Lookup user by QR UUID |
| POST | `/api/connect` | ✅ | Connect via QR code |
| DELETE | `/api/connect/:id` | ✅ | Remove connection |
| GET | `/api/messages/:userId` | ✅ | Get message history |

## Socket Events

| Event | Direction | Payload |
|-------|-----------|---------| 
| `send_message` | Client → Server | `{ receiverId, text }` |
| `message_sent` | Server → Client | message object |
| `new_message` | Server → Client | message object |
| `mark_read` | Client → Server | `{ senderId }` |
| `messages_read` | Server → Client | `{ by, convId }` |
| `user_status` | Server → Client | `{ userId, isOnline }` |
| `new_connection` | Server → Client | user object |
| `request_online_status` | Client → Server | `{ connectionIds }` |
| `online_status_response` | Server → Client | `{ [id]: boolean }` |

---

## Deployment

### Frontend → Vercel
1. Push to GitHub
2. Connect repo to Vercel
3. Set root directory to `frontend`
4. Build command: `npm run build`
5. Output directory: `dist`

### Backend → Render
1. Push to GitHub
2. Create a new Web Service on Render
3. Set root directory to `backend`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`

---

## License
MIT
