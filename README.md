# ⬡ Nexus Chat

> Privacy-first chat app. 5 connections. QR-only. No strangers.

## Stack
- **Frontend**: HTML + CSS (Glassmorphism) + Vanilla JS
- **Backend**: Node.js + Express + Socket.io
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT + bcrypt
- **QR**: qrcodejs (generate) + jsQR (scan)

---

## Project Structure

```
chat-app/
├── backend/
│   ├── server.js        ← Express + Socket.io + all routes
│   └── package.json
└── frontend/
    ├── index.html       ← Single-page app
    ├── style.css        ← Glassmorphism dark theme
    └── app.js           ← All client logic
```

---

## Setup & Run

### 1. Prerequisites
- Node.js v18+
- MongoDB running locally (`mongod`) or a MongoDB Atlas URI

### 2. Backend
```bash
cd backend
npm install
node server.js
# Server starts on http://localhost:4000
```

With custom MongoDB URI:
```bash
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/nexus node server.js
```

### 3. Frontend
Just open `frontend/index.html` in your browser.

> ⚠️ Camera (QR scan) requires HTTPS or localhost. On localhost it works fine.

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

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register` | ❌ | Create account |
| POST | `/api/login` | ❌ | Login, get token |
| GET | `/api/me` | ✅ | Get profile + connections |
| GET | `/api/user/qr/:qrCode` | ✅ | Lookup user by QR UUID |
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

---

## Production Checklist
- [ ] Set `JWT_SECRET` env variable to a long random string
- [ ] Set `MONGO_URI` to your production MongoDB
- [ ] Serve frontend via HTTPS (required for camera)
- [ ] Add rate limiting (e.g. `express-rate-limit`)
- [ ] Consider message encryption at rest
