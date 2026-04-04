# AGENTS.md — Nexus Chat
# Antigravity Agent Instructions

> This file tells Antigravity agents everything they need to know to set up,
> run, and deploy the Nexus Chat app from scratch. Read this fully before
> starting any task.

---

## Project Overview

Nexus Chat is a privacy-first real-time chat app with a strict 5-connection limit.
Users connect only via QR code scanning — no usernames searched, no phone numbers.

**Stack:**
- Frontend: HTML + CSS + Vanilla JS (no framework, no build step)
- Backend: Node.js + Express + Socket.io
- Database: MongoDB via Mongoose
- Auth: JWT + bcrypt
- QR: qrcodejs (generate) + jsQR (scan via camera)

**File structure:**
```
nexus-chat/
├── AGENTS.md               ← you are here
├── README.md
├── backend/
│   ├── server.js           ← entire backend in one file
│   └── package.json
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## Agent Rules (Follow These Always)

- **Never** hardcode secrets. Always use environment variables.
- **Never** modify `frontend/style.css` colors or glassmorphism variables unless explicitly asked.
- **Never** install unnecessary packages. The backend is intentionally lean.
- **Always** run `npm install` before `node server.js` in the backend folder.
- **Always** verify MongoDB is reachable before starting the server.
- **Always** test both register + login flow after any auth change.
- When editing `server.js`, preserve the Socket.io event names exactly —
  the frontend `app.js` depends on them: `send_message`, `message_sent`,
  `new_message`, `mark_read`, `messages_read`, `user_status`, `new_connection`.

---

## Task: Local Development Setup

Run these steps in order. Use the terminal.

```bash
# 1. Check Node.js version (must be 18+)
node --version

# 2. Check MongoDB is running locally
mongod --version
# If not installed: https://www.mongodb.com/try/download/community

# 3. Start MongoDB (if not already running as a service)
mongod --dbpath ~/data/db &

# 4. Install backend dependencies
cd backend
npm install

# 5. Start backend server
node server.js
# Expected output: "MongoDB connected" and "Nexus server running on port 4000"

# 6. Open frontend in browser (new terminal tab)
cd ../frontend
# On Mac:
open index.html
# On Linux:
xdg-open index.html
# On Windows:
start index.html
```

**Verify it works:**
- Register two accounts in two browser tabs/windows
- Click "My QR Code" on account 1 — a QR appears
- Click "Snap & Connect" on account 2 — camera opens, scan the QR
- Connection appears in the sidebar on both sides
- Send a message — it should appear in real time
- ✓✓ ticks appear when the other user reads the message

---

## Task: Production Deployment

### Step 1 — MongoDB Atlas (Database)

```
1. Go to https://cloud.mongodb.com and create a free account
2. Create a new Project → Build a Cluster → choose FREE (M0 Sandbox)
3. Choose a region close to your users
4. Set username + password (save these securely)
5. Under "Network Access" → Add IP Address → Allow from Anywhere (0.0.0.0/0)
6. Under "Database" → Connect → Drivers → Node.js
7. Copy the connection string — it looks like:
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/nexus?retryWrites=true&w=majority
8. Save this as MONGO_URI for the next step
```

### Step 2 — Backend on Railway

```
1. Go to https://railway.app and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repo, set the root directory to "backend"
4. Railway auto-detects Node.js and runs "npm start"
5. Go to "Variables" tab and add:

   JWT_SECRET     = <generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
   MONGO_URI      = mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/nexus
   NODE_ENV       = production
   PORT           = 4000

6. Go to "Settings" → "Networking" → Generate Domain
7. Copy the Railway domain — e.g. nexus-chat-production.up.railway.app
```

### Step 3 — Update Frontend URLs

Open `frontend/app.js` and change the top two lines:

```js
// Change this:
const API = 'http://localhost:4000/api';

// To this (use your Railway domain):
const API = 'https://nexus-chat-production.up.railway.app/api';
```

Also find the `connectSocket()` function and change:

```js
// Change this:
socket = io('http://localhost:4000', { auth: { token: state.token } });

// To this:
socket = io('https://nexus-chat-production.up.railway.app', { auth: { token: state.token } });
```

### Step 4 — Frontend on Vercel

```
1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New Project" → Import your repo
3. Set Framework Preset to "Other"
4. Set Root Directory to "frontend"
5. No build command needed (it's plain HTML)
6. Output directory: leave blank or set to "."
7. Click Deploy
8. Copy your Vercel domain — e.g. nexus-chat.vercel.app
```

### Step 5 — Lock CORS to Your Domain

Go back to `backend/server.js` and update the CORS config:

```js
// Change this:
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
app.use(cors());

// To this:
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'https://nexus-chat.vercel.app';
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'], credentials: true }
});
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
```

Then add `FRONTEND_URL = https://nexus-chat.vercel.app` to Railway environment variables.

### Step 6 — Add Security Packages

```bash
cd backend
npm install helmet express-rate-limit
```

Then add to the top of `server.js` after the existing imports:

```js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());
app.use('/api/login',    rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many attempts' } }));
app.use('/api/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 5,  message: { error: 'Too many accounts from this IP' } }));
```

Commit and push — Railway auto-redeploys.

---

## Task: Verify Full Production Deployment

After all steps above, run this checklist in the Antigravity browser panel:

```
Open: https://nexus-chat.vercel.app

□ Page loads with glassmorphism UI (no console errors)
□ Register a new account → success
□ "My QR Code" button shows a QR code modal
□ "Snap & Connect" button opens camera (HTTPS required — should work on Vercel)
□ Open the app in a second browser/tab, register another account
□ Scan QR from tab 1 using tab 2 → connection appears in sidebar on both
□ Send a message from tab 1 → appears instantly in tab 2
□ ✓✓ read receipts update when the other tab is active in that chat
□ Close tab 1 → tab 2 shows "offline" status for that user
□ Reopen tab 1 → status returns to "online"
```

If any step fails, check:
1. Railway logs → confirm "MongoDB connected" is printed
2. Browser console → look for CORS or mixed-content errors
3. Verify environment variables are set correctly in Railway dashboard

---

## Common Agent Tasks

### "Add a feature: message deletion"
- Add `DELETE /api/messages/:messageId` route in `server.js`
- Add a Socket event `delete_message` that broadcasts to both users in the conversation
- In `app.js`, add a right-click/long-press handler on `.msg-bubble` elements
- Remove the message from `state.messages[userId]` array and re-render

### "Change the app name from Nexus to something else"
- In `index.html`: update `<title>`, `.brand-name` text, and `.brand-icon`
- In `README.md`: update all mentions
- Do NOT change any variable names or API paths — these are internal only

### "Add push notifications"
- Use the Web Push API with a service worker
- Create `frontend/sw.js` as the service worker
- Store push subscriptions in a new MongoDB collection
- Send push via the `web-push` npm package from `server.js` when a message arrives
  and the receiver's socket is not connected (they're offline)

### "Add message encryption"
- Use `tweetnacl` or `libsodium-wrappers` for end-to-end encryption
- Key exchange should happen at connection time via the Socket
- Store only encrypted ciphertext in MongoDB — the server should never see plaintext
- Warn: this is a significant architectural change — create a plan artifact first

---

## Environment Variables Reference

| Variable | Where | Description |
|----------|-------|-------------|
| `JWT_SECRET` | Railway | Long random string for signing tokens |
| `MONGO_URI` | Railway | MongoDB Atlas connection string |
| `NODE_ENV` | Railway | Set to `production` |
| `PORT` | Railway | Set to `4000` (Railway may override) |
| `FRONTEND_URL` | Railway | Your Vercel domain for CORS |

---

## Do Not Touch

- The `qrCode` field on User documents — it is the primary connection identifier
- The `conversationId` generation logic in `makeConversationId()` — changing this
  breaks all existing message history
- The 5-connection limit check in `/api/connect` — this is a core product rule
- Socket event names — frontend and backend must stay in sync
