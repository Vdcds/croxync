# Croxync - Universal Clipboard

Like AirDrop, but for everything. A Chrome extension + PWA pair that lets you save any copied text or link from your browser and instantly access it on your phone (or any other device).

## What it does

- **Chrome Extension**: Captures anything you copy (links, text, code snippets) and syncs it to the cloud
- **PWA (Progressive Web App)**: View all your saved clips on any device — phone, tablet, or another computer
- **No accounts needed**: Just a 6-character sync code. Share the code across your devices.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│ Chrome Extension │         │   PWA (Phone)   │
│  - Copy capture  │◄───────►│  - View clips   │
│  - Right-click   │   API   │  - Copy back    │
│  - Manual save   │         │  - Delete       │
└─────────────────┘         └─────────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
            ┌────────▼────────┐
            │  Next.js API    │
            │  - /api/auth    │
            │  - /api/clips   │
            │  - SQLite DB    │
            └─────────────────┘
```

## Tech Stack

- **Backend**: Next.js 16 App Router + Prisma + SQLite
- **PWA**: Next.js + Tailwind CSS + shadcn/ui
- **Extension**: Manifest V3 + vanilla JS

## Getting Started

### 1. Run the Next.js app

```bash
# Install dependencies (if not already done)
pnpm install

# The database is already set up, but if you need to reset:
npx prisma migrate dev

# Start the dev server
pnpm dev
```

The app runs at `http://localhost:3000`.

### 2. Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder from this project
5. The Croxync icon should appear in your toolbar

### 3. Configure the Extension

1. Click the Croxync icon in your toolbar
2. Set the **API URL**:
   - For local dev: `http://localhost:3000`
   - For production: your deployed URL (e.g., `https://your-app.vercel.app`)
3. Get your **sync code** from the PWA (see below) and enter it
4. Click **Save Settings**

### 4. Use the PWA

1. Open `http://localhost:3000` in your browser
2. Click **Get Started** to generate a new sync code
3. (Or enter an existing code to join)
4. Your code is saved locally — you'll be taken to the dashboard
5. On your phone:
   - Open the deployed URL in Chrome/Safari
   - Enter the same sync code
   - Tap **Add to Home Screen** to install as a PWA

## How to Use

### From the Chrome Extension

| Action | How |
|--------|-----|
| Auto-save on copy | Just `Ctrl+C` / `Cmd+C` anything on a page |
| Save selected text | Right-click selection → **Save to Croxync** |
| Save a link | Right-click link → **Save Link to Croxync** |
| Save page URL | Right-click page → **Save Page URL to Croxync** |
| Save clipboard | Click popup → **Save Clipboard** |
| Save current URL | Click popup → **Save Current URL** |

### From the PWA

- View all synced clips in reverse chronological order
- Tap the **copy icon** to copy a clip back to your device clipboard
- Tap the **trash icon** to delete a clip
- The dashboard auto-refreshes every 5 seconds

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth` | Create user (no body) or verify code (`{ code }`) |
| GET | `/api/clips?code=XXX` | Get all clips for a user |
| POST | `/api/clips` | Create a clip (`{ code, content, type, title?, source? }`) |
| DELETE | `/api/clips/:id` | Delete a clip |

All endpoints return JSON and include CORS headers for the extension.

## Deployment

### Deploy the Next.js App

The easiest way is [Vercel](https://vercel.com):

```bash
npm i -g vercel
vercel
```

Don't forget to set the `DATABASE_URL` environment variable in your deployment dashboard. For production, switch from SQLite to PostgreSQL:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Update the Extension API URL

After deploying, open the extension popup and update the API URL to your production URL.

### Install PWA on Phone

1. Open your deployed URL on your phone
2. Enter your sync code
3. Chrome/Android: Menu → **Add to Home screen**
4. Safari/iOS: Share → **Add to Home Screen**

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/route.ts          # User auth (create/verify code)
│   │   │   ├── clips/route.ts         # List & create clips
│   │   │   └── clips/[id]/route.ts    # Delete clip
│   │   ├── dashboard/page.tsx         # PWA dashboard (clips list)
│   │   ├── page.tsx                   # Landing / code entry
│   │   ├── layout.tsx                 # Root layout with PWA manifest
│   │   └── globals.css
│   ├── components/ui/                 # shadcn/ui components
│   └── lib/db.ts                      # Prisma client singleton
├── chrome-extension/
│   ├── manifest.json                  # Extension manifest v3
│   ├── popup.html / popup.js / popup.css
│   ├── background.js                  # Service worker (context menus)
│   ├── content.js                     # Copy event capture
│   └── icons/                         # Extension icons
├── prisma/
│   └── schema.prisma                  # User & Clip models
└── public/
    └── manifest.json                  # PWA manifest
```

## Future Ideas

- [ ] End-to-end encryption for clip content
- [ ] Expiring clips (auto-delete after X days)
- [ ] Image/file support
- [ ] Categories/tags for clips
- [ ] Search through clips
- [ ] Browser history auto-sync option
