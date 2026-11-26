# Nexora Mail
### Production Full-Stack Gmail Management Platform

**Nexora Mail** is a production-structured email management web application built with **React**, **Node.js/Express**, **MongoDB Atlas**, and the official **Google Gmail API**. It delivers a clean, responsive SaaS workspace with server-side OAuth 2.0, AES-256-GCM token encryption, and zero disk retention for attachments.

---

## Key Features

### Real Gmail API Synchronization
- **Folder & Label Sync**: Inbox, Starred, Important, Sent, Drafts, Archive, Spam, Trash, plus user-created custom Gmail labels.
- **Least-Privilege Scopes**: Uses `openid`, `email`, `profile`, and `https://www.googleapis.com/auth/gmail.modify`.
- **Automatic Token Refresh**: Offline refresh tokens are encrypted with AES-256-GCM and refreshed automatically by the backend.

### Complete Email Management
- **Bulk Triage**: Select individual messages or all visible messages to Mark Read, Mark Unread, Star, Archive, Trash, or Restore via Gmail's `batchModify` API.
- **Rich-Text Compose**: Floating / expandable composer with Bold, Italic, Underline, Bulleted & Numbered lists, Links, Cc/Bcc, and multi-file attachments (up to 15MB via memory streaming).
- **Drafts Lifecycle**: Create, open, edit, save, send, and discard real Gmail drafts.
- **Reply, Reply All & Forward**: Proper RFC 2822 `In-Reply-To`, `References`, and `threadId` preservation.
- **Search & Pagination**: Full Gmail search query syntax (`from:`, `is:unread`, `has:attachment`, etc.) with `nextPageToken` pagination.
- **XSS-Safe HTML Rendering**: Incoming email HTML is sanitized through DOMPurify before display.

---

## Technology Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS 3, Lucide React, React Router 6, Axios, DOMPurify
- **Backend**: Node.js (ES Modules), Express 4, `googleapis`, Mongoose 8, `express-session`, `connect-mongo`, `nodemailer` (MailComposer), `multer` (MemoryStorage), `helmet`, `express-rate-limit`
- **Database & Hosting**: MongoDB Atlas (Free M0), Render Free Web Service, GitHub

---

## Monorepo Structure

```
NEXORA-MAIL/
├── backend/
│   ├── config/          # MongoDB connection & Google OAuth2 client
│   ├── controllers/     # Auth, Email, and Settings route handlers
│   ├── middleware/      # Session auth guard, rate limiters, error handler
│   ├── models/          # Mongoose schemas (User, UserSettings)
│   ├── routes/          # Express API routers
│   ├── services/        # Gmail API wrapper, MIME builder, token refresh
│   ├── utils/           # AES-256-GCM encryption & logger
│   └── server.js        # Express server & SPA static fallback
├── frontend/
│   └── src/
│       ├── components/  # Sidebar, TopNav, EmailList, EmailItem, EmailDetail, ComposeModal
│       ├── context/     # AuthContext, EmailContext, ThemeContext, ToastContext
│       ├── layouts/     # Responsive DashboardLayout with mobile drawer
│       ├── pages/       # LandingPage, DashboardPage, SettingsPage, AuthErrorPage
│       ├── services/    # Axios API clients
│       └── utils/       # Constants, date formatter, DOMPurify config
├── scripts/
│   ├── dev.js           # Dual-service local runner
│   └── verify-build.js  # Project structure verification
├── .env.example
├── render.yaml
└── package.json
```

---

## Local Development Setup

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your credentials inside `.env`:
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your_random_32_char_session_secret
TOKEN_ENCRYPTION_KEY=64_char_hex_key_for_aes_256_gcm
MONGODB_URI=mongodb://localhost:27017/nexora_mail
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
```

### 3. Run Development Servers
```bash
npm run dev
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

---

## Google Cloud OAuth 2.0 Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Gmail API** under **APIs & Services**.
3. Configure **OAuth consent screen** (`External`) with scopes:
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/gmail.modify`
4. Create **Web application** credentials under **Credentials** with Authorized Redirect URIs:
   - Local: `http://localhost:5000/auth/google/callback`
   - Production: `https://<your-render-service>.onrender.com/auth/google/callback`
5. Add test users in **Testing** mode, or click **Publish App** (note: `gmail.modify` is a restricted scope requiring Google OAuth verification & CASA security assessment before removing the unverified app warning and 100-user cap).

---

## REST API Endpoints

### Auth (`/auth` & `/api/auth`)
- `GET /api/auth/config` — Public OAuth configuration check
- `GET /auth/google` — Initiates Google OAuth consent flow with CSRF state
- `GET /auth/google/callback` — Handles Google OAuth callback & creates session
- `GET /api/auth/me` — Returns authenticated user & settings
- `POST /api/auth/logout` — Destroys session & clears HTTP-only cookie
- `POST /api/auth/disconnect` — Clears tokens & disconnects Google account

### Emails (`/api/emails`)
- `GET /api/emails/:folder` (`inbox`, `starred`, `important`, `sent`, `drafts`, `archive`, `spam`, `trash`)
- `GET /api/emails/label/:labelId` — Lists emails for a custom Gmail label
- `GET /api/emails/counts` — Returns genuine folder counts & custom labels
- `GET /api/emails/profile` — Returns Gmail account totals
- `GET /api/emails/search?q=` — Gmail search with pagination
- `GET /api/emails/:id` — Full email body & attachment metadata
- `GET /api/emails/draft/:id` — Full draft content for editing
- `POST /api/emails/send` — Sends MIME message with optional attachments
- `POST /api/emails/draft` / `PUT /api/emails/draft/:id` / `DELETE /api/emails/draft/:id` / `POST /api/emails/draft/:id/send`
- `POST /api/emails/bulk` — Batch read/unread/star/archive/trash/restore
- `PATCH /api/emails/:id/read` / `star` / `archive` / `trash` / `restore`
- `GET /api/emails/:messageId/attachments/:attachmentId` — Streams attachment download

### Settings & Health
- `GET /api/settings` & `PUT /api/settings`
- `GET /api/health`
