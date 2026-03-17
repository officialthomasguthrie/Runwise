# Quick Start - Cloudflare Worker Setup

## 🚀 Fast Track (5 Steps)

### 1. Database Migration
- Open Supabase SQL Editor
- Copy/paste: `database/migrations/create_polling_triggers_table.sql`
- Click "Run"

### 2. Get Secrets
- Supabase: Settings → API → Copy URL and service_role key
- Inngest: Settings → Copy Event Key

### 3. Install Dependencies
```bash
cd cloudflare-worker
npm install
```
**I can do this for you!** Just ask.

### 4. Set Secrets
```bash
cd cloudflare-worker
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put INNGEST_EVENT_KEY
wrangler secret put INNGEST_BASE_URL
```
(Paste values when prompted)

### 5. Deploy
```bash
cd cloudflare-worker
wrangler deploy
```
**I can do this for you!** Just ask.

## ✅ Verify
```bash
wrangler tail
```
(Should see logs every minute)

## 📖 Full Guide
See `COMPLETE_SETUP_GUIDE.md` for detailed instructions.


