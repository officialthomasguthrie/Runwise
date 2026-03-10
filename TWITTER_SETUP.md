# Twitter/X Integration Setup

The Twitter/X OAuth 2.0 integration and agent tools are implemented. Complete the setup below.

## 1. Add Environment Variables

Add these to your `.env.local` file (and your production environment, e.g. Vercel):

```env
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
```

Use the Client ID and Client Secret from your X app's User authentication settings. Add them to `.env.local` (never commit `.env.local`).

## 2. Restart the Dev Server

After adding the env vars, restart `npm run dev`.

## 3. Optional: Database Migration

If your `integrations` table does not yet have a `twitter` row, it will be created automatically when the first user connects. No migration needed.

## What’s Implemented

- **OAuth 2.0 flow** with PKCE
- **Integration connect** — Twitter uses OAuth redirect (no credential popup)
- **Integrations status** — Twitter is shown as connected when OAuth is complete
- **Agent tools**
  - `post_tweet` — Post a tweet (optional reply)
  - `search_tweets` — Search recent tweets (requires Elevated/Basic API access)
  - `get_twitter_profile` — Get the connected user’s profile
- **Agent builder** — “tweet”, “post to X”, etc. are detected and require Twitter
- **Legacy support** — Bearer token credential still works if OAuth is not used

## Notes

- **Search** (`search_tweets`) needs Elevated or Basic API access in the X Developer Portal.
- **Callback URLs** (already set):  
  - Production: `https://runwiseai.app/api/auth/callback/twitter`  
  - Local: `http://localhost:3000/api/auth/callback/twitter`
