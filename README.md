# NEXORA MAIL
### Enterprise Gmail Management & Executive Command Center

> **NEXORA MAIL** is a full-stack, enterprise-grade email management web application built with **React**, **Node.js/Express**, **MongoDB Atlas**, and the official **Google Gmail API**. It features a custom SaaS dashboard, AES-256-GCM token encryption, zero disk retention for attachments, and is 100% deployable on free-tier cloud infrastructure (Render & MongoDB Atlas).

---

## 📑 Table of Contents
1. [Overview & Design Identity](#-overview--design-identity)
2. [Feature Highlights](#-feature-highlights)
3. [Technology Stack](#-technology-stack)
4. [System Architecture](#-system-architecture)
5. [Monorepo Directory Structure](#-monorepo-directory-structure)
6. [Local Development Setup](#-local-development-setup)
7. [Google Cloud OAuth 2.0 Configuration Guide](#-google-cloud-oauth-20-configuration-guide)
8. [MongoDB Atlas Free-Tier Setup](#-mongodb-atlas-free-tier-setup)
9. [Environment Variables Reference](#-environment-variables-reference)
10. [REST API Documentation](#-rest-api-documentation)
11. [Free Deployment Guide (Render + GitHub)](#-free-deployment-guide-render--github)
12. [Security & Compliance Architecture](#-security--compliance-architecture)
13. [Troubleshooting & Common Questions](#-troubleshooting--common-questions)

---

## 🎨 Overview & Design Identity

NEXORA MAIL rejects generic admin templates in favor of a bespoke corporate aesthetic:
- **Primary Navy (`#17243B`)**: Deep executive foundation for sidebars and headers.
- **Electric Blue (`#536DFE`)**: High-contrast interactive accents and primary action buttons.
- **Accent Teal (`#21A58B`)**: Verification badges, read states, and security indicators.
- **Soft Ivory (`#F7F8FC`)**: Gentle, low-fatigue background canvas for long email reading sessions.
- **Card White (`#FFFFFF`)**: Crisp, elevated card surfaces with subtle border delineations (`#E8EBF2`).
- **Typography**: Clean, geometric rendering via *Inter* and *Plus Jakarta Sans*.

---

## 🚀 Feature Highlights

### Real Gmail API Integration
- **Live Mailbox Synchronization**: Reads real messages, headers, snippets, and unread counts using Google's official Gmail API v1.
- **Scoped Least-Privilege**: Requests `openid`, `email`, `profile`, and `https://www.googleapis.com/auth/gmail.modify` (excludes permanent hard deletion scopes).
- **Offline Refresh Token Engine**: Server automatically maintains active access tokens without requiring user re-authentication.

### Full Email Lifecycle Actions
- **Triage & Organization**: Star, unstar, mark read/unread, archive from inbox, move to trash, restore from trash.
- **Compose & Send**: Rich email composition with To, CC, BCC, HTML formatting (bold, italic, lists), and multi-file attachments.
- **Drafts Lifecycle**: Create, edit, send, or discard real Gmail drafts.
- **Thread Reply & Forward**: Contextual reply and forward preserving `In-Reply-To`, `References`, and thread histories.
- **Global Search**: Supports native Gmail search syntax (`from:`, `to:`, `subject:`, `is:unread`, `has:attachment`).
- **In-Memory Attachments**: Upload and download attachments via memory streams; files are never stored on the server's local disk.

### Interactive Demo Mode (Simulated Mailbox)
- Evaluators can preview the entire application workflow immediately without waiting for Google Cloud review or database credentials.
- An informative amber banner explicitly indicates simulated mode, ensuring complete transparency.

---

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Routing**: React Router 6 (SPA)
- **HTTP Client**: Axios with interceptors
- **Security**: DOMPurify for HTML email sanitization

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Google SDK**: `googleapis` (Official Google APIs Client Library)
- **Database ODM**: Mongoose 8
- **Session Store**: `express-session` with `connect-mongo`
- **MIME & Mail Encoding**: `nodemailer` (MailComposer RFC 2822 to base64url)
- **File Handling**: `multer` (In-Memory Buffer Storage)
- **Security**: `helmet`, `express-rate-limit`, `cors`, AES-256-GCM `crypto`

### Cloud & Database
- **Hosting**: Render Free Web Service
- **Source Control**: GitHub Free Repository
- **Database**: MongoDB Atlas Free Shared M0 Cluster

---

## 🏗 System Architecture

```
[ User Browser ]
       │  (HTTPS)
       ▼
[ Render Web Service (Node.js + Express) ]
       ├── Serves Built React SPA Assets (/dist)
       ├── Session Store (connect-mongo / HTTP-only Cookie)
       ├── In-Memory Attachment Processing (Multer)
       ├── AES-256-GCM Token Encryption Engine
       │
       ├───► [ MongoDB Atlas Free Cluster ] (Users, Settings, Sessions)
       │
       └───► [ Google Cloud Platform ]
                 ├── OAuth 2.0 Token Exchange
                 └── Gmail API v1 (/messages, /drafts, /attachments)
```

In production, the Express backend serves the pre-compiled React frontend directly from the same origin, eliminating cross-site cookie restrictions and third-party domain dependencies.

---

## 📂 Monorepo Directory Structure

```
NEXORA-MAIL/
├── backend/
│   ├── config/
│   │   ├── db.js             # Mongoose MongoDB connection & fallback handler
│   │   └── google.js         # OAuth2 client and scopes setup
│   ├── controllers/
│   │   ├── authController.js     # Google OAuth initiate, callback, demo activator
│   │   ├── emailController.js    # Gmail actions, drafts, compose, search
│   │   └── settingsController.js # Theme, signature, and profile settings
│   ├── middleware/
│   │   ├── authMiddleware.js # Session & demo mode authentication guard
│   │   ├── errorHandler.js   # Centralized error formatter
│   │   └── rateLimiter.js    # Endpoint protection against abuse
│   ├── models/
│   │   ├── User.js           # User schema with encrypted refresh tokens
│   │   └── UserSettings.js   # User UI preferences and signature
│   ├── routes/
│   │   ├── authRoutes.js     # /auth and /api/auth routes
│   │   ├── emailRoutes.js    # /api/emails routes
│   │   └── settingsRoutes.js # /api/settings routes
│   ├── services/
│   │   ├── demoService.js    # Robust in-memory simulated email store
│   │   ├── gmailService.js   # Gmail API v1 wrapper
│   │   ├── mimeService.js    # RFC 2822 MIME builder and base64url encoder
│   │   └── tokenService.js   # Auto-refreshing OAuth2 credential factory
│   ├── utils/
│   │   ├── encryption.js     # AES-256-GCM encryption/decryption routines
│   │   └── logger.js         # Colorized timestamped logging utility
│   ├── package.json
│   └── server.js             # Express app entrypoint
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # DemoBanner, Badges
│   │   │   ├── dashboard/    # Sidebar, TopNav, EmailList, EmailItem, EmailDetail
│   │   │   └── email/        # ComposeModal, SanitizedEmailBody
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   # Authentication state & Google login trigger
│   │   │   ├── EmailContext.jsx  # Folder, active email, and compose state
│   │   │   ├── ThemeContext.jsx  # Light/Dark mode state
│   │   │   └── ToastContext.jsx  # Floating notification toasts
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx   # SaaS presentation and login portal
│   │   │   ├── DashboardPage.jsx # Split-pane responsive email interface
│   │   │   ├── SettingsPage.jsx  # Account, theme, signature & security checks
│   │   │   ├── AuthErrorPage.jsx # Beginner-friendly OAuth error diagnostic
│   │   │   └── NotFoundPage.jsx
│   │   ├── services/
│   │   │   ├── api.js            # Axios client with credentials
│   │   │   ├── authService.js
│   │   │   ├── emailService.js
│   │   │   └── settingsService.js
│   │   ├── utils/
│   │   │   ├── constants.js
│   │   │   ├── dateFormatter.js
│   │   │   └── sanitize.js       # DOMPurify HTML sanitizer
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── scripts/
│   ├── dev.js                # Dual-service local development runner
│   └── verify-build.js       # Pre-flight architecture verification
├── .github/
│   └── workflows/ci.yml      # Automated GitHub Actions build test
├── .env.example
├── .gitignore
├── render.yaml               # Render Infrastructure-as-Code Blueprint
└── package.json              # Monorepo root scripts
```

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js**: Version 18.x, 20.x, or 24.x
- **npm**: Version 9.x or higher
- **Git**

### Step 1: Clone Repository
```bash
git clone <your-github-repo-url>
cd NEXORA-MAIL
```

### Step 2: Install All Dependencies
Install all monorepo dependencies across the root, backend, and frontend with a single command:
```bash
npm run install:all
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` in the root (and in `backend/.env`):
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Open `.env` in your editor and customize:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=a_very_secure_random_string_with_32_characters_minimum
TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
MONGODB_URI=mongodb://localhost:27017/nexora_mail
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
DEMO_MODE_FALLBACK=true
```

> **Note**: Even if you haven't set up Google Cloud or MongoDB yet, the application will boot seamlessly in **Interactive Demo Mode** thanks to `DEMO_MODE_FALLBACK=true`!

### Step 4: Run the Development Server
```bash
npm run dev
```
This spawns:
- **Backend API**: `http://localhost:5000`
- **Frontend Vite Dev Server**: `http://localhost:5173`

Navigate to **`http://localhost:5173`** in your browser. Click **"Explore Interactive Demo"** or **"Connect Your Gmail Account"**.

---

## 🔑 Google Cloud OAuth 2.0 Configuration Guide

Follow these steps to connect your real Gmail mailbox:

### Step 1: Create a Google Cloud Project
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top left and select **"New Project"**.
3. Name your project **`Nexora-Mail`** and click **"Create"**.

### Step 2: Enable the Gmail API
1. In the Google Cloud search bar, search for **"Gmail API"**.
2. Select **Gmail API** and click the blue **"Enable"** button.

### Step 3: Configure OAuth Consent Screen
1. In the left navigation, go to **APIs & Services &rarr; OAuth consent screen**.
2. Select User Type: **External** and click **Create**.
3. Fill in the App Information:
   - **App name**: `NEXORA MAIL`
   - **User support email**: Your Gmail address
   - **Developer contact email**: Your Gmail address
4. Click **Save and Continue**.

### Step 4: Add OAuth Scopes
1. On the **Scopes** step, click **"Add or Remove Scopes"**.
2. Filter or search for:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/gmail.modify`
3. Check all three and click **Update**, then click **Save and Continue**.

> 💡 **Scope Clarity**: We intentionally use `gmail.modify` instead of `mail.google.com`. `gmail.modify` grants reading, composing, archiving, trashing, and starring, but excludes permanent deletion.

### Step 5: Add Test Users (Critical for Development)
1. While your app is in "Testing" mode, Google requires authorized test users.
2. On the **Test users** step, click **"+ Add Users"**.
3. Enter your personal Gmail address (and any other accounts you wish to test with).
4. Click **Save and Continue**.

### Step 6: Create OAuth 2.0 Credentials
1. Go to **APIs & Services &rarr; Credentials**.
2. Click **"+ Create Credentials"** and choose **"OAuth client ID"**.
3. Application type: Select **"Web application"**.
4. Name: `NEXORA MAIL Web Client`.
5. Under **Authorized redirect URIs**, click **"+ Add URI"**:
   - For Local Development: `http://localhost:5000/auth/google/callback`
   - For Render Production: `https://<your-render-service-name>.onrender.com/auth/google/callback`
6. Click **Create**.
7. Copy the **Client ID** and **Client Secret** into your `.env` file!

---

## 🍃 MongoDB Atlas Free-Tier Setup

1. Sign up for a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **"Build a Database"** and choose the **M0 Free (Shared)** tier.
3. Select your preferred cloud provider and region (e.g. AWS / us-east-1).
4. Under **Security Quickstart**:
   - Create a Database User with a username and strong password.
   - Under **IP Access List**, choose **"Allow Access from Anywhere" (`0.0.0.0/0`)** so both your local machine and Render servers can reach the database.
5. In your cluster view, click **"Connect" &rarr; "Drivers" &rarr; "Node.js"**.
6. Copy the connection string and paste it into your `.env` file as `MONGODB_URI`:
   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/nexora_mail?retryWrites=true&w=majority
   ```

---

## ⚙️ Environment Variables Reference

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment mode | `development` or `production` |
| `PORT` | HTTP port the Express server listens on | `5000` (Local) / `10000` (Render) |
| `FRONTEND_URL` | Frontend origin for CORS and OAuth redirects | `http://localhost:5173` (Local) |
| `SESSION_SECRET` | Secret key used to sign session cookies | 32+ character random string |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hexadecimal key for AES-256-GCM token encryption | 64-character hex string |
| `MONGODB_URI` | MongoDB Atlas database connection URI | `mongodb+srv://...` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud Console | Secure alphanumeric secret |
| `GOOGLE_REDIRECT_URI` | Full callback URL matching Google Console | `http://localhost:5000/auth/google/callback` |
| `DEMO_MODE_FALLBACK` | Allow fallback to interactive demo if credentials are missing | `true` |

---

## 📡 REST API Documentation

### Authentication (`/auth` & `/api/auth`)
- `GET /auth/google`: Initiates Google OAuth consent flow, generates CSRF state token.
- `GET /auth/google/callback`: Receives authorization code from Google, exchanges for tokens, logs in user.
- `POST /auth/demo`: Activates interactive demo mode with simulated mailbox data.
- `GET /api/auth/me`: Retrieves current authenticated user profile and settings.
- `POST /api/auth/logout`: Destroys session and clears HTTP-only cookie.
- `POST /api/auth/disconnect`: Revokes tokens and disconnects Google account.

### Emails (`/api/emails`)
- `GET /api/emails/inbox`: Lists incoming emails with metadata headers and snippets.
- `GET /api/emails/sent`: Lists sent emails.
- `GET /api/emails/starred`: Lists starred messages.
- `GET /api/emails/important`: Lists important messages.
- `GET /api/emails/drafts`: Lists email drafts.
- `GET /api/emails/spam`: Lists spam messages.
- `GET /api/emails/trash`: Lists messages in trash.
- `GET /api/emails/counts`: Returns unread/total counts for all folders.
- `GET /api/emails/search?q=<query>`: Searches emails via query string.
- `GET /api/emails/:id`: Fetches full email message with parsed body and attachment stubs.
- `POST /api/emails/send`: Sends an email (supports `multipart/form-data` with attachments).
- `POST /api/emails/draft`: Creates a new draft.
- `PUT /api/emails/draft/:id`: Updates an existing draft.
- `DELETE /api/emails/draft/:id`: Removes a draft.
- `POST /api/emails/draft/:id/send`: Sends an existing draft.
- `PATCH /api/emails/:id/read`: Toggles read/unread status.
- `PATCH /api/emails/:id/star`: Toggles star status.
- `PATCH /api/emails/:id/archive`: Removes email from Inbox.
- `PATCH /api/emails/:id/trash`: Moves email to Trash.
- `PATCH /api/emails/:id/restore`: Restores email from Trash to Inbox.
- `GET /api/emails/:messageId/attachments/:attachmentId`: Downloads an attachment.

### Settings (`/api/settings`)
- `GET /api/settings`: Retrieves UI preferences (theme, signature).
- `PUT /api/settings`: Updates theme or signature.

### Health Check
- `GET /api/health`: Returns system health, database status, and uptime.

---

## ☁️ Free Deployment Guide (Render + GitHub)

### Architecture Overview
1. **GitHub Repository**: Stores source code.
2. **Render Web Service (Free Tier)**: Runs the Node.js backend which also serves the compiled React frontend from `/dist`.
3. **MongoDB Atlas (Free Tier)**: Stores user records, encrypted refresh tokens, and session data.

### Step 1: Push Code to GitHub
Initialize Git, commit your changes, and push to a new GitHub repository:
```bash
git add .
git commit -m "feat: complete NEXORA MAIL full-stack release"
git remote add origin https://github.com/<your-username>/nexora-mail.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render
1. Log in to [Render](https://render.com/).
2. Click **"New +" &rarr; "Web Service"**.
3. Select **"Build and deploy from a Git repository"** and connect your `nexora-mail` repository.
4. Configure service settings:
   - **Name**: `nexora-mail`
   - **Region**: Oregon (or your nearest free region)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm run build:all`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Under **Advanced &rarr; Health Check Path**, set `/api/health`.
6. Add the following **Environment Variables** in Render:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `SESSION_SECRET`: *(Generate a 32-character random string)*
   - `TOKEN_ENCRYPTION_KEY`: *(Generate a 64-character hex string)*
   - `MONGODB_URI`: *(Your MongoDB Atlas URI)*
   - `GOOGLE_CLIENT_ID`: *(From Google Cloud Console)*
   - `GOOGLE_CLIENT_SECRET`: *(From Google Cloud Console)*
   - `GOOGLE_REDIRECT_URI`: `https://nexora-mail.onrender.com/auth/google/callback` *(Replace with your actual Render URL)*
   - `DEMO_MODE_FALLBACK`: `true`
7. Click **"Create Web Service"**.

Render will automatically run `npm run build:all`, compile the frontend into `frontend/dist`, start the Express server, and serve your application at `https://<your-service>.onrender.com`.

---

## 🔒 Security & Compliance Architecture

- **Token Encryption at Rest**: Refresh tokens are encrypted using **AES-256-GCM** with 16-byte random IVs and authenticated tags. Plain text tokens are never committed to the database.
- **Zero Disk Retention**: Attachments are streamed through in-memory buffers (`multer.memoryStorage()`); uploaded files are never written to the host filesystem.
- **HTTP-Only Cookies**: Application session IDs are stored in HTTP-only, secure, `SameSite=Lax/None` cookies. OAuth credentials are never accessible to client-side scripts.
- **XSS Sanitization**: Email HTML payloads are thoroughly scrubbed using **DOMPurify** before rendering. Script tags, inline event handlers, and rogue iframes are stripped out.
- **CSRF Protection**: Google OAuth initialization creates a cryptographically random `state` parameter verified upon callback return.

---

## ❓ Troubleshooting & Common Questions

#### 1. Google OAuth displays "Access blocked: This app has not been verified"
- **Solution**: Your Google Cloud project is in "Testing" mode. Go to **Google Cloud Console &rarr; OAuth consent screen &rarr; Test users** and add your Gmail address as a test user.

#### 2. Redirect URI Mismatch (`redirect_uri_mismatch`)
- **Solution**: The redirect URI in Google Cloud Console must match your active environment:
  - Local: `http://localhost:5000/auth/google/callback`
  - Render: `https://your-service.onrender.com/auth/google/callback`

#### 3. Do I need a credit card for Render or MongoDB Atlas?
- **No**. Both Render Web Services (Free plan) and MongoDB Atlas (Shared M0 sandbox) do not require a credit card.

---

*Designed and engineered with pride for the NEXORA MAIL Project.*
