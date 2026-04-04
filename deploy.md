You are a senior full-stack engineer with 10+ years of experience in building scalable, secure, and production-grade web applications.

I have an existing full-stack project:
- Frontend: ( HTML/CSS/JS )
- Backend: Node.js + Express
- Database: MongoDB Atlas
- Deployment plan:
  - Frontend → Vercel
  - Backend → Render

Your task is to deeply analyze and upgrade my ENTIRE codebase to make it production-ready.

DO NOT give generic advice. MODIFY and IMPROVE the code.

----------------------------
1. FRONTEND IMPROVEMENTS
----------------------------
- Optimize performance (lazy loading, code splitting, minimize JS/CSS)
- Improve UI/UX:
  - Make design modern, clean, and responsive
  - Improve spacing, typography, color hierarchy
  - Add loading states, error states, empty states
  - Ensure mobile-first design
- Remove unnecessary re-renders and optimize DOM usage
- Add proper folder structure and component reusability
- Ensure API calls use environment variables (NO hardcoded URLs)
- Add proper error handling for API responses
- Improve accessibility (ARIA labels, contrast, semantic HTML)

----------------------------
2. BACKEND IMPROVEMENTS
----------------------------
- Refactor code into clean architecture:
  - routes/
  - controllers/
  - services/
  - models/
  - middleware/
- Add proper error handling middleware (centralized)
- Validate all incoming requests (use Joi/Zod or similar)
- Sanitize inputs to prevent injection attacks
- Implement rate limiting (prevent abuse)
- Add CORS configuration properly
- Use helmet for security headers
- Add logging system (Morgan/Winston)
- Optimize database queries (avoid unnecessary calls)

----------------------------
3. SECURITY HARDENING (VERY IMPORTANT)
----------------------------
- Move ALL sensitive data to environment variables (.env)
- Secure MongoDB connection string:
  - Use environment variables
  - Ensure no credentials are exposed in code
- Prevent:
  - NoSQL Injection
  - XSS
  - CSRF (if applicable)
- Hash passwords using bcrypt (if authentication exists)
- Implement JWT authentication securely:
  - Access + Refresh tokens (if needed)
  - Proper token expiration

----------------------------
4. DATABASE (MONGODB ATLAS)
----------------------------
- Optimize schema design
- Add indexes where necessary
- Ensure validation at schema level
- Remove redundant or inefficient queries

----------------------------
5. DEPLOYMENT OPTIMIZATION
----------------------------
Prepare project specifically for:

➡ VERCEL (Frontend)
- Use environment variables properly
- Optimize build output
- Remove unnecessary assets
- Ensure fast loading

➡ RENDER (Backend)
- Add proper start script
- Handle PORT correctly (process.env.PORT)
- Ensure no local-only configs
- Add health check route (/api/health)

----------------------------
6. CODE QUALITY
----------------------------
- Remove unused code and console.logs
- Follow consistent naming conventions
- Improve readability and maintainability
- Add comments ONLY where necessary (no clutter)

----------------------------
7. BONUS (IMPORTANT)
----------------------------
- Suggest improvements that make the project:
  - Scalable
  - Monetizable
  - More impressive for college/project demo

----------------------------

OUTPUT FORMAT:
- Show improved folder structure
- Provide updated code snippets (not just explanation)
- Clearly explain WHY each major improvement is made
- Be strict, practical, and production-focused

Do NOT skip any section.