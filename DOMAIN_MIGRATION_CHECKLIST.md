# Domain Migration Checklist: runwiseai.app

This checklist covers all configurations that need to be updated when switching from the Vercel subdomain to `runwiseai.app`.

## ✅ Environment Variables

### Vercel Environment Variables
Update these in your Vercel project settings:

- [ ] **`NEXT_PUBLIC_APP_URL`**
  - **Current**: `https://runwise-two.vercel.app` (or old Vercel subdomain)
  - **New**: `https://runwiseai.app`
  - **Used in**: Stripe checkout sessions, test checkout routes
  - **Location**: Vercel Dashboard → Settings → Environment Variables

### Cloudflare Worker Environment Variables
Update these in your Cloudflare Worker settings:

- [ ] **`INNGEST_BASE_URL`** (if set)
  - **Current**: `https://runwise-two.vercel.app/api/inngest` (or old domain)
  - **New**: `https://runwiseai.app/api/inngest`
  - **Location**: Cloudflare Dashboard → Workers & Pages → Your Worker → Settings → Variables

---

## 🔐 Authentication & OAuth

### Supabase Authentication
- [ ] **Supabase Dashboard → Authentication → URL Configuration**
  - Add redirect URL: `https://runwiseai.app/auth/callback`
  - Remove old Vercel subdomain redirect URL (optional, but recommended)
  - **Location**: Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

### Google OAuth (Gmail Integration)
- [ ] **Google Cloud Console → APIs & Services → Credentials**
  - Update **Authorized redirect URIs**:
    - Add: `https://runwiseai.app/api/auth/callback/google`
    - Remove old Vercel subdomain URI (optional)
  - **Environment Variable**: `GOOGLE_REDIRECT_URI`
    - Update to: `https://runwiseai.app/api/auth/callback/google`
  - **Location**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

### Microsoft OAuth (Azure AD)
- [ ] **Azure Portal → App Registrations → Your App → Authentication**
  - Update **Redirect URIs**:
    - Add: `https://runwiseai.app/auth/callback`
    - Remove old Vercel subdomain URI (optional)
  - **Location**: Azure Portal → App Registrations → Your App → Authentication → Platform configurations

---

## 💳 Stripe Configuration

### Stripe Dashboard
- [ ] **Stripe Dashboard → Developers → Webhooks**
  - Update webhook endpoint URL:
    - **Current**: `https://runwise-two.vercel.app/api/stripe/webhook` (or old domain)
    - **New**: `https://runwiseai.app/api/stripe/webhook`
  - **Action**: 
    1. Go to your existing webhook endpoint
    2. Click "Update endpoint"
    3. Change URL to new domain
    4. OR create new webhook and disable old one
  - **Location**: Stripe Dashboard → Developers → Webhooks → Your Webhook Endpoint

### Stripe Environment Variables
- [ ] Verify `STRIPE_WEBHOOK_SECRET` is still valid after updating webhook URL
  - If you created a new webhook, you'll need to update this secret
  - **Location**: Vercel Dashboard → Settings → Environment Variables

---

## 🔄 Inngest Configuration

### Inngest Dashboard
- [ ] **Inngest Dashboard → Apps → Your App → Settings**
  - Update **App URL**:
    - **Current**: `https://runwise-two.vercel.app/api/inngest` (or old domain)
    - **New**: `https://runwiseai.app/api/inngest`
  - **Location**: Inngest Dashboard → Apps → Your App → Settings → App URL

### Inngest Environment Variables
- [ ] Verify `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are still valid
  - These should remain the same, but verify in Inngest dashboard
  - **Location**: Vercel Dashboard → Settings → Environment Variables

---

## 🌐 Webhook Integrations

### External Services Sending Webhooks to Your App
If you have workflows with webhook triggers, external services need to be updated:

- [ ] **Slack** (if using Slack webhooks)
  - Update webhook URL in Slack app settings
  - **Format**: `https://runwiseai.app/api/webhooks/[your-webhook-path]`

- [ ] **GitHub** (if using GitHub webhooks)
  - Update webhook URL in repository settings
  - **Format**: `https://runwiseai.app/api/webhooks/[your-webhook-path]`

- [ ] **Discord** (if using Discord webhooks)
  - Update webhook URL in Discord server settings
  - **Format**: `https://runwiseai.app/api/webhooks/[your-webhook-path]`

- [ ] **Any other third-party services**
  - Update webhook URLs to use new domain
  - **Format**: `https://runwiseai.app/api/webhooks/[your-webhook-path]`

### Note on Webhook Paths
- Your webhook paths are dynamic: `/api/webhooks/[path]`
- The `[path]` is configured per workflow in the webhook trigger node
- External services need to update their webhook URLs to include the new domain

---

## ☁️ Cloudflare Worker

### Cloudflare Worker Environment Variables
- [ ] **`INNGEST_BASE_URL`** (if explicitly set)
  - **Current**: `https://runwise-two.vercel.app/api/inngest` (or old domain)
  - **New**: `https://runwiseai.app/api/inngest`
  - **Note**: If not set, it defaults to `https://api.inngest.com`, which should still work
  - **Location**: Cloudflare Dashboard → Workers & Pages → Your Worker → Settings → Variables

---

## 🔍 DNS & SSL

### Vercel Domain Configuration
- [ ] **Vercel Dashboard → Your Project → Settings → Domains**
  - Verify `runwiseai.app` is added and configured
  - Verify SSL certificate is active (should be automatic)
  - **Location**: Vercel Dashboard → Project → Settings → Domains

### DNS Records
- [ ] Verify DNS records are correctly configured
  - A record or CNAME pointing to Vercel
  - **Location**: Your domain registrar (where you purchased runwiseai.app)

---

## 🧪 Testing Checklist

After updating all configurations, test the following:

- [ ] **Authentication**
  - [ ] Email/password login works
  - [ ] Google OAuth login redirects correctly
  - [ ] Microsoft OAuth login redirects correctly
  - [ ] Password reset email links work

- [ ] **Stripe**
  - [ ] Checkout session creation works
  - [ ] Webhook events are received (check Stripe dashboard)
  - [ ] Payment processing completes

- [ ] **Inngest**
  - [ ] Workflow execution triggers correctly
  - [ ] Scheduled workflows run
  - [ ] Check Inngest dashboard for successful events

- [ ] **Webhooks**
  - [ ] Test webhook trigger with a test workflow
  - [ ] Verify webhook payloads are received
  - [ ] Check workflow execution logs

- [ ] **Cloudflare Worker**
  - [ ] Polling triggers are working
  - [ ] Check Cloudflare Worker logs (`wrangler tail`)
  - [ ] Verify Inngest events are being sent

---

## 📝 Code References (No Changes Needed)

These are automatically handled and don't need manual updates:

- ✅ `window.location.origin` in auth context (automatically uses current domain)
- ✅ Dynamic webhook routes (`/api/webhooks/[path]`) work with any domain
- ✅ Inngest serve handlers work with any domain
- ✅ Supabase client uses environment variables (already updated)

---

## 🚨 Important Notes

1. **Environment Variables**: After updating in Vercel, you may need to redeploy for changes to take effect
2. **Stripe Webhook Secret**: If you create a new webhook endpoint, update `STRIPE_WEBHOOK_SECRET`
3. **OAuth Redirect URIs**: Some OAuth providers may take a few minutes to propagate changes
4. **DNS Propagation**: DNS changes can take up to 48 hours, but usually complete within minutes
5. **SSL Certificate**: Vercel automatically provisions SSL certificates for custom domains

---

## 📋 Quick Reference: All URLs to Update

| Service | Old URL Pattern | New URL Pattern |
|---------|---------------|-----------------|
| Supabase Redirect | `https://[old-domain]/auth/callback` | `https://runwiseai.app/auth/callback` |
| Google OAuth | `https://[old-domain]/api/auth/callback/google` | `https://runwiseai.app/api/auth/callback/google` |
| Stripe Webhook | `https://[old-domain]/api/stripe/webhook` | `https://runwiseai.app/api/stripe/webhook` |
| Inngest App URL | `https://[old-domain]/api/inngest` | `https://runwiseai.app/api/inngest` |
| Cloudflare Worker | `https://[old-domain]/api/inngest` | `https://runwiseai.app/api/inngest` |
| External Webhooks | `https://[old-domain]/api/webhooks/[path]` | `https://runwiseai.app/api/webhooks/[path]` |

---

## ✅ Completion Checklist

- [ ] All environment variables updated in Vercel
- [ ] All environment variables updated in Cloudflare Worker
- [ ] Supabase redirect URLs updated
- [ ] Google OAuth redirect URIs updated
- [ ] Microsoft OAuth redirect URIs updated
- [ ] Stripe webhook endpoint updated
- [ ] Inngest app URL updated
- [ ] External webhook URLs updated (if applicable)
- [ ] DNS and SSL verified
- [ ] All tests passed
- [ ] Production deployment successful

---

**Last Updated**: After migration to runwiseai.app
**Domain**: runwiseai.app

