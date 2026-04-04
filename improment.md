# Nexus Chat - Technical Debt & Improvement Roadmap

## 1. MongoDB Free Tier Survival (M0 Cluster)
*The M0 tier has a strict 512MB storage limit, a 500 connection limit, and heavily throttled IOPS. If you do not implement these, your database will lock up.*

* [ ] **Implement TTL (Time-To-Live) Indexes on Messages:** Auto-delete old messages so you never hit the 512MB cap.
  * **Fix:** Add `MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });` to auto-delete messages after 30 days.
* [ ] **Optimize Mongoose Connection Pooling:** Node instances can spawn too many connections and exhaust the 500 limit.
  * **Fix:** Add connection pool limits in your connect string: `mongoose.connect(MONGO_URI, { maxPoolSize: 10 });`
* [ ] **Add Compound Indexes:** Your current message fetch relies on a single index, which burns through IOPS on large queries.
  * **Fix:** Index `{ conversationId: 1, createdAt: 1 }` to prevent full collection scans when fetching chat history.
* [ ] **Fix Connection Race Condition (Atomic Updates):** Loading the user document, pushing to the array in memory, and saving (`.push()` -> `.save()`) will fail if two users connect at the exact same millisecond. 
  * **Fix:** Use MongoDB atomic operators like `$addToSet` combined with query conditions to enforce the 5-user limit at the database level, not the application level.

## 2. Critical Security Hardening
*Your current setup is highly vulnerable to Cross-Site Scripting (XSS), token theft, and brute-force attacks.*

* [ ] **Nuke LocalStorage JWT:** You are begging for XSS token theft by storing `nx_token` in `localStorage`.
  * **Fix:** Move authentication to use `HttpOnly`, `Secure`, and `SameSite=Strict` cookies. Your Vanilla JS frontend should *never* be able to read the token directly.
* [ ] **Lock Down CORS:** `origin: '*'` on your socket server is a massive vulnerability.
  * **Fix:** Hardcode your exact frontend production URL in the CORS origin array (e.g., `origin: 'https://nexus-chat.com'`).
* [ ] **Implement Rate Limiting:** You have zero protection against brute-force login attempts or DDoS account creation.
  * **Fix:** Install `express-rate-limit`. Restrict `/login` and `/register` to 5-10 requests per minute per IP.
* [ ] **Sanitize Error Handling:**
  * **Fix:** Stop sending `e.message` in 500 responses. Log the real error to your backend console and send a generic `{"error": "Internal Server Error"}` to the client to avoid leaking database schema details.

## 3. Vanilla JS Frontend Architecture & Safety
*Because you are using Vanilla JS instead of a framework, you must manually handle DOM safety and configuration.*

* [ ] **Remove Dangerous `innerHTML` Injection:** You are building HTML strings and injecting them via `container.innerHTML = html;`. Your `escHtml` function is not a bulletproof XSS sanitizer.
  * **Fix:** Refactor `renderMessages` to use `document.createElement()`, `element.classList.add()`, and `element.textContent`. It is more verbose, but it is 100% immune to XSS injection. Alternatively, implement a robust sanitizer like `DOMPurify` before injecting HTML.
* [ ] **Environment Variable Management:** * **Fix:** Remove the hardcoded `http://localhost:4000/api` from `app.js`. Since you aren't using a bundler (like Webpack/Vite), create a simple `config.js` file that sets the API base URL depending on whether the app is running locally or in production, and load it before `app.js`.
* [ ] **Secure External CDNs:**
  * **Fix:** Add Subresource Integrity (`integrity="sha384-..."`) and `crossorigin="anonymous"` attributes to your `<script>` tags in `index.html` for Socket.io, jsQR, and QRCode. If those CDNs are hijacked, your app remains safe.

## 4. Socket.io & Real-Time Resiliency
*The current socket implementation assumes 1 User = 1 Tab. It will break instantly in real-world usage.*

* [ ] **Support Multi-Device/Multi-Tab Connections:** * **Fix:** Change `onlineUsers.set(userId, socket.id)` to map to a `Set` of socket IDs (`onlineUsers.set(userId, new Set([socket.id]))`).
  * **Fix:** When broadcasting messages, loop through the `Set` and emit to *all* of a user's active sockets.
* [ ] **Implement Socket Payload Limits:**
  * **Fix:** Validate the length of the `text` string *before* inserting it into MongoDB. Drop the socket connection if someone tries to send a 10MB string to crash your server.
* [ ] **Handle Disconnects Gracefully:** * **Fix:** Ensure that when a user closes one tab, you only remove *that specific socket ID* from the `Set`. Only mark them `isOnline: false` in MongoDB if the `Set` becomes entirely empty.
* [ ] **Modularize Backend Code:**
  * **Fix:** Your `server.js` is a dumping ground. Break it out into `/routes/auth.js`, `/models/User.js`, and `/sockets/chat.js` for maintainability.