# Nexora — AI-Powered Email Management
### Free Local Browser AI + Full-Stack Gmail Workspace & Natural-Language Scheduling

**NEXORA MAIL** transforms Gmail management with **NEXORA AI** (*"Your intelligent assistant for effortless communication"*), combining real **Google Gmail API** synchronization with **100% free on-device browser AI inference** (`@mlc-ai/web-llm` + **WebGPU**) and persistent MongoDB + GitHub Actions email scheduling.

**Zero AI API costs:** Nexora does not use OpenAI, Gemini, Claude, or any paid inference keys or subscriptions.

---

## Key Features

### 1. Free On-Device NEXORA AI (`WebLLM` + `WebGPU`)
- **Conversational AI Assistant (`/ai`)**: Describe any email in plain English and generate an editable `Subject`, greeting, body, closing, and signature placeholder — always requiring user approval before sending.
- **AI Email Writer**: 7 writing styles (`Professional`, `Formal`, `Friendly`, `Casual`, `Persuasive`, `Academic`, `Concise`), 10 preset prompts, recipient/role/details fields, and editable outputs (`Regenerate`, `Copy`, `Insert into Compose`, `Edit`, `Discard`).
- **AI Letter Generator**: 12 letter categories (Job, Internship, Resignation, Leave, Permission, Complaint, Apology, Recommendation, Business, College, Request, Thank-you) using safe placeholders (never fabricating personal data) with `Copy Letter`, `Download as TXT`, and `Use in Email`.
- **AI Compose Toolbar (`Write with Nexora AI`)**: 8 writing tools inside Compose — *Improve writing*, *Fix grammar*, *Make professional*, *Make concise / Shorten*, *Expand*, *Change tone* (6 tones), *Generate subject*, and *Continue writing* — with side-by-side Original vs. AI suggestion previews requiring explicit `Accept` or `Reject`.
- **AI Smart Reply (`Generate AI Reply`)**: Contextual replies inside the email reading pane (`Professional`, `Friendly`, `Short`, `Detailed`), isolating strictly the active opened email with prompt-injection boundaries (`<UNTRUSTED_EMAIL_DATA>`).
- **Graceful Fallback**: When WebGPU is unavailable or AI is disabled in Settings, Nexora automatically switches to structured offline non-AI templates without any paid fallback.

### 2. Natural-Language Email Scheduling (`/scheduled`)
- **Natural-Language Parser + Explicit Confirmation**: Interpret phrases like `"tomorrow at 9 AM"`, `"Monday at 4 PM"`, `"December 5 at 10:30 AM"`, `"next Friday afternoon"`, or `"in 2 hours"`, paired with deterministic timezone conversion (`Intl.DateTimeFormat`), future-date enforcement, and a confirmation screen before queuing.
- **Persistent Queue & Scheduled Folder**: Create, view, edit, reschedule, cancel, and delete entries (`Scheduled`, `Processing`, `Sent`, `Failed`, `Cancelled`).
- **Atomic Idempotent Dispatching**: Uses MongoDB atomic locks (`lockedAt`), `gmailMessageId` duplicate prevention, exponential backoff retries on temporary Gmail/rate-limit errors, and clean failure marking on expired OAuth tokens.

### 3. Real Gmail API Sync & Security
- Syncs Inbox, Starred, Important, Sent, Drafts, Archive, Spam, Trash, and custom Gmail labels.
- Server-side Google OAuth 2.0 (`gmail.modify`), AES-256-GCM encrypted token storage, `httpOnly` MongoDB-backed sessions (`connect-mongo`), `DOMPurify` email sanitization, `express-rate-limit`, CRLF header injection blocking, and zero disk storage for attachments.

---

## Local AI Model & Browser Compatibility

### Available Lightweight Models (`@mlc-ai/web-llm`)
| Model | Approx. Download | Est. VRAM | Notes |
| --- | --- | --- | --- |
| `Llama-3.2-1B-Instruct-q4f16_1-MLC` | **~700 MB** | ~879 MB | **Recommended Default** — fastest startup on laptops |
| `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | ~1.0 GB | ~1,630 MB | Balanced letter structure & instruction adherence |
| `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | ~400 MB | ~945 MB | Ultra-compact option for low bandwidth |
| `Llama-3.2-3B-Instruct-q4f16_1-MLC` | ~1.8 GB | ~2,264 MB | Nuanced professional/persuasive writing |
| `Qwen2.5-3B-Instruct-q4f16_1-MLC` | ~1.9 GB | ~2,505 MB | Rich long-form correspondence |

- **Automatic GPU Compatibility:** If a device's WebGPU adapter does not advertise `shader-f16`, Nexora automatically selects the matching `q4f32_1` variant.
- **Lazy Initialization & Caching:** Models never download automatically on page load. On first explicit activation, `@mlc-ai/web-llm` caches weights inside the browser Cache API so page refreshes reuse cached files without re-downloading. Users can inspect usage or clear caches under **Settings → NEXORA AI**.

### Hardware & Browser Requirements for Local AI
- **Recommended Browsers:** Chrome 113+, Microsoft Edge 113+, or Chromium-based browsers with **WebGPU** and hardware acceleration enabled.
- **Recommended Hardware:** 8 GB+ system RAM (16 GB+ recommended for 3B models) and ~2 GB free browser disk storage for model weight caching.
- **Unsupported Browsers:** Non-WebGPU browsers gracefully run deterministic template mode.

---

## Scheduled Sending Architecture (Free Tier Honest Limits)

Because the Gmail API does not offer a native schedule-send API for third-party web clients without persistent drafts/triggers, Nexora handles scheduling asynchronously:
1. User confirms recipient, subject, body, future date/time, and timezone → stored in MongoDB (`ScheduledEmail`).
2. **While Render is awake:** An in-process timer (`ENABLE_IN_PROCESS_SCHEDULER=true`) checks due rows every 60 seconds.
3. **While Render Free sleeps:** A free **GitHub Actions** workflow ([`.github/workflows/scheduled-email-dispatcher.yml`](.github/workflows/scheduled-email-dispatcher.yml)) runs on a `*/15 * * * *` schedule to wake `/api/health` and call `POST /api/scheduled-emails/internal/process` with constant-time `x-scheduler-secret` verification.

**Important Free-Tier Limitations:**
- GitHub Actions cron schedules experience runner queue delays (often 5–15+ minutes beyond the nominal cron tick), and Render Free Web Services sleep after ~15 minutes of HTTP inactivity (taking ~30–50 seconds to cold start).
- Therefore, exact-minute delivery is not guaranteed on free hosting; scheduled emails are delivered on a best-effort periodic cadence shortly after they become due. Cancelled emails are atomically excluded and never sent.

---

## Technology Stack

- **Frontend:** React 18, Vite 5, Tailwind CSS 3, `@mlc-ai/web-llm` (WebGPU + ES Module Web Worker), React Router 6, Axios, Lucide React, DOMPurify
- **Backend:** Node.js (ES Modules), Express 4, `googleapis`, Mongoose 8, `express-session`, `connect-mongo`, `nodemailer`, `multer`, `helmet`, `express-rate-limit`
- **Database & Free Hosting:** MongoDB Atlas (Free M0), Render Free Web Service, GitHub Actions

---

## Installation & Local Development

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
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
SCHEDULER_SECRET=your_random_scheduler_webhook_secret
ENABLE_IN_PROCESS_SCHEDULER=true
```

### 3. Run Local Servers
```bash
npm run dev
```
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`

### 4. Run Automated Tests & Production Build
```bash
npm test
npm run build
```

---

## Deployment Instructions (Render Free + GitHub Actions)

1. Push repository changes to **GitHub**.
2. In **Render Dashboard**, deploy using [`render.yaml`](render.yaml) (`Build Command: npm run build:all`, `Start Command: npm start`).
3. Add environment variables in Render (`MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`, `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `SCHEDULER_SECRET`, `ENABLE_IN_PROCESS_SCHEDULER=true`).
4. To activate automatic background scheduled-email dispatching while Render Free sleeps, add two **Repository Secrets** in **GitHub → Settings → Secrets and variables → Actions**:
   - `NEXORA_BACKEND_URL`: your Render URL (e.g., `https://your-service.onrender.com`)
   - `SCHEDULER_SECRET`: exact same secret value set in Render's `SCHEDULER_SECRET` environment variable.

---

## REST API Endpoints

### Auth & Settings
- `GET /api/auth/config`, `GET /auth/google`, `GET /auth/google/callback`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/disconnect`
- `GET /api/settings`, `PUT /api/settings` (includes `aiEnabled`, `aiModelId`)
- `GET /api/health`

### Emails (`/api/emails`)
- `GET /api/emails/:folder`, `/label/:labelId`, `/counts`, `/profile`, `/search`, `/:id`, `/draft/:id`
- `POST /api/emails/send`, `/draft`, `/draft/:id/send`, `/bulk`
- `PUT /api/emails/draft/:id`, `DELETE /api/emails/draft/:id`
- `PATCH /api/emails/:id/read`, `star`, `archive`, `trash`, `restore`

### Scheduled Emails (`/api/scheduled-emails`)
- `GET /api/scheduled-emails` — List user's scheduled items + status summary
- `POST /api/scheduled-emails` — Validate and queue user-confirmed scheduled email
- `POST /api/scheduled-emails/parse` — Deterministic natural-language date/time preview
- `POST /api/scheduled-emails/process-mine` — Dispatch current user's due items
- `PUT /api/scheduled-emails/:id` — Edit or reschedule pending/failed item
- `PATCH /api/scheduled-emails/:id/cancel` — Atomically cancel item
- `DELETE /api/scheduled-emails/:id` — Delete non-processing entry
- `POST /api/scheduled-emails/internal/process` — Cron dispatcher endpoint protected by `SCHEDULER_SECRET`
