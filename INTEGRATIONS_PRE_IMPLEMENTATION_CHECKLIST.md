# Pre-Implementation Checklist for Integrations
## Complete Verification Guide Before Code Implementation

**Purpose:** This checklist ensures everything is properly set up before the developer begins implementing the integration system.

---

## Table of Contents

1. [Environment Variables Check](#environment-variables-check)
2. [Database Setup Verification](#database-setup-verification)
3. [OAuth Apps Verification](#oauth-apps-verification)
4. [Credentials Documentation Check](#credentials-documentation-check)
5. [Git Security Check](#git-security-check)
6. [Service-Specific Verification](#service-specific-verification)
7. [Final Verification](#final-verification)
8. [Ready-to-Use Prompt for Developer](#ready-to-use-prompt-for-developer)

---

## Environment Variables Check

### Step 1: Verify `.env.local` File Exists

**Location:** Root of your project (same level as `package.json`)

**Check:**
- [ ] File exists: `.env.local`
- [ ] File is NOT committed to Git (check `.gitignore`)

**How to Check:**
```bash
# In your project root, run:
ls -la .env.local
# OR on Windows:
dir .env.local
```

---

### Step 2: Verify Google Environment Variables

**What to Check:**
- [ ] `GOOGLE_CLIENT_ID` exists (for user authentication/login)
- [ ] `GOOGLE_CLIENT_SECRET` exists (for user authentication/login)
- [ ] `GOOGLE_INTEGRATION_CLIENT_ID` exists (for integrations)
- [ ] `GOOGLE_INTEGRATION_CLIENT_SECRET` exists (for integrations)

**How to Check:**
1. Open `.env.local` file
2. Search for each variable name
3. Verify values are present (not empty)

**Expected Format:**
```env
# Google Authentication (User Login)
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xyz123456

# Google Integration (Service Access)
GOOGLE_INTEGRATION_CLIENT_ID=987654321-integration.apps.googleusercontent.com
GOOGLE_INTEGRATION_CLIENT_SECRET=GOCSPX-integration-secret
```

**If Missing:**
- Copy from `INTEGRATIONS_CREDENTIALS.md`
- Add to `.env.local`
- Save file

---

### Step 3: Verify Slack Environment Variables

**What to Check:**
- [ ] `SLACK_BOT_TOKEN` exists
- [ ] `SLACK_CLIENT_ID` exists
- [ ] `SLACK_CLIENT_SECRET` exists

**Expected Format:**
```env
SLACK_BOT_TOKEN=xoxb-[your-bot-token-here]
SLACK_CLIENT_ID=1234567890.1234567890123
SLACK_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr
```

**How to Verify:**
1. Open `.env.local`
2. Check values match `INTEGRATIONS_CREDENTIALS.md`
3. Ensure no extra spaces or quotes

---

### Step 4: Verify Other Service Variables (Optional)

**For services you're implementing:**
- [ ] GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- [ ] Discord: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN` (if using OAuth)
- [ ] Any other service credentials

**Note:** API key services (Airtable, Notion, Trello, SendGrid, Twilio, OpenAI) don't need environment variables - users will provide their own.

---

## Database Setup Verification

### Step 1: Verify Tables Exist

**Where to Check:** Supabase Dashboard → SQL Editor

**What to Check:**
- [ ] `user_integrations` table exists
- [ ] `integration_credentials` table exists (optional but recommended)

**How to Verify:**

1. Go to Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_integrations', 'integration_credentials');
```

**Expected Result:**
- Should return 2 rows (or 1 if you skipped `integration_credentials`)

**If Missing:**
- Go back to `INTEGRATIONS_COMPLETE_GUIDE.md`
- Run the SQL queries from the "Database Setup" section

---

### Step 2: Verify Table Structure

**Check `user_integrations` table has these columns:**

Run this query:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_integrations'
ORDER BY ordinal_position;
```

**Expected Columns:**
- [ ] `id` (uuid)
- [ ] `user_id` (uuid)
- [ ] `service_name` (text)
- [ ] `access_token` (text)
- [ ] `refresh_token` (text)
- [ ] `token_expires_at` (timestamptz)
- [ ] `metadata` (jsonb)
- [ ] `created_at` (timestamptz)
- [ ] `updated_at` (timestamptz)

**If Missing Columns:**
- The SQL migration script should have added them
- If not, run the migration part again from the guide

---

### Step 3: Verify Indexes Exist

**Check indexes are created:**

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'user_integrations';
```

**Expected Indexes:**
- [ ] `idx_user_integrations_user_id`
- [ ] `idx_user_integrations_service`

**If Missing:**
- Run the index creation SQL from the guide

---

## OAuth Apps Verification

### Step 1: Google OAuth App

**Where to Check:** [Google Cloud Console](https://console.cloud.google.com/)

**Checklist:**
- [ ] Project exists: "Runwise Integrations" (or your project name)
- [ ] APIs enabled:
  - [ ] Google Sheets API
  - [ ] Google Drive API
  - [ ] Google Calendar API
  - [ ] Google Forms API
  - [ ] Gmail API
- [ ] OAuth consent screen configured:
  - [ ] App name set
  - [ ] Support email set
  - [ ] Test users added (if in testing mode)
- [ ] OAuth client created:
  - [ ] Client ID matches `GOOGLE_INTEGRATION_CLIENT_ID` in `.env.local`
  - [ ] Client Secret matches `GOOGLE_INTEGRATION_CLIENT_SECRET` in `.env.local`
  - [ ] Redirect URIs configured:
    - [ ] `https://runwiseai.app/api/auth/callback/google`
    - [ ] `http://localhost:3000/api/auth/callback/google`

**How to Verify:**
1. Go to Google Cloud Console
2. Select your project
3. Go to **APIs & Services** → **Enabled APIs** (verify APIs)
4. Go to **APIs & Services** → **OAuth consent screen** (verify settings)
5. Go to **APIs & Services** → **Credentials** (verify OAuth client)

---

### Step 2: Slack App

**Where to Check:** [Slack API Apps](https://api.slack.com/apps)

**Checklist:**
- [ ] App exists: "Runwise"
- [ ] OAuth & Permissions configured:
  - [ ] Redirect URLs added:
    - [ ] `https://runwiseai.app/api/auth/callback/slack`
    - [ ] `http://localhost:3000/api/auth/callback/slack`
  - [ ] Bot Token Scopes added:
    - [ ] `channels:read`
    - [ ] `channels:history`
    - [ ] `chat:write`
    - [ ] `groups:read`
    - [ ] `groups:history`
    - [ ] `im:read`
    - [ ] `im:history`
    - [ ] `mpim:read`
    - [ ] `mpim:history`
- [ ] App installed to workspace
- [ ] Bot Token matches `SLACK_BOT_TOKEN` in `.env.local`
- [ ] Client ID matches `SLACK_CLIENT_ID` in `.env.local`
- [ ] Client Secret matches `SLACK_CLIENT_SECRET` in `.env.local`

**How to Verify:**
1. Go to Slack API Apps
2. Select "Runwise" app
3. Check **OAuth & Permissions** section
4. Verify all settings match above checklist

---

### Step 3: GitHub OAuth App

**Where to Check:** [GitHub Developer Settings](https://github.com/settings/developers)

**Checklist:**
- [ ] OAuth App exists: "Runwise"
- [ ] Homepage URL: `https://runwiseai.app`
- [ ] Authorization callback URL:
  - [ ] `https://runwiseai.app/api/auth/callback/github`
  - [ ] `http://localhost:3000/api/auth/callback/github`
- [ ] Client ID matches `GITHUB_CLIENT_ID` in `.env.local`
- [ ] Client Secret matches `GITHUB_CLIENT_SECRET` in `.env.local`

**How to Verify:**
1. Go to GitHub Developer Settings
2. Click **OAuth Apps**
3. Select "Runwise" app
4. Verify all settings

---

### Step 4: Discord Bot (If Using OAuth)

**Where to Check:** [Discord Developer Portal](https://discord.com/developers/applications)

**Checklist:**
- [ ] Application exists: "Runwise"
- [ ] Bot created
- [ ] OAuth2 redirect URI added: `https://runwiseai.app/api/auth/callback/discord`
- [ ] Bot token matches `DISCORD_BOT_TOKEN` in `.env.local` (if using)
- [ ] Client ID matches `DISCORD_CLIENT_ID` in `.env.local` (if using)
- [ ] Client Secret matches `DISCORD_CLIENT_SECRET` in `.env.local` (if using)

---

## Credentials Documentation Check

### Step 1: Verify `INTEGRATIONS_CREDENTIALS.md` Exists

**Location:** Root of project

**Check:**
- [ ] File exists: `INTEGRATIONS_CREDENTIALS.md`
- [ ] File contains all credentials from services you set up
- [ ] All values are filled in (no placeholders like `[paste here]`)

**How to Check:**
1. Open `INTEGRATIONS_CREDENTIALS.md`
2. Verify each section has actual values
3. Compare with what you entered in OAuth apps

---

### Step 2: Verify Credentials Match

**Cross-reference check:**

- [ ] Google Client ID in file = Google Client ID in `.env.local`
- [ ] Google Client Secret in file = Google Client Secret in `.env.local`
- [ ] Slack Bot Token in file = Slack Bot Token in `.env.local`
- [ ] Slack Client ID in file = Slack Client ID in `.env.local`
- [ ] Slack Client Secret in file = Slack Client Secret in `.env.local`
- [ ] GitHub Client ID in file = GitHub Client ID in `.env.local`
- [ ] GitHub Client Secret in file = GitHub Client Secret in `.env.local`
- [ ] All other credentials match

**If Mismatch:**
- Update `.env.local` to match `INTEGRATIONS_CREDENTIALS.md`
- Or update `INTEGRATIONS_CREDENTIALS.md` if it's wrong

---

## Git Security Check

### Step 1: Verify `.gitignore` Protects Sensitive Files

**Location:** Root of project → `.gitignore`

**Check:**
- [ ] `.env*` is in `.gitignore` (should already be there)
- [ ] `INTEGRATIONS_CREDENTIALS.md` is in `.gitignore`

**How to Check:**
1. Open `.gitignore` file
2. Search for `INTEGRATIONS_CREDENTIALS.md`
3. If not found, add it

**If Missing, Add:**
```
# Integration credentials (NEVER commit this!)
INTEGRATIONS_CREDENTIALS.md
```

---

### Step 2: Verify File is Not Tracked by Git

**Check if file is already tracked:**

```bash
git ls-files | grep INTEGRATIONS_CREDENTIALS.md
```

**Expected Result:** No output (file should not be tracked)

**If File IS Tracked:**
```bash
# Remove from Git tracking (keeps local file)
git rm --cached INTEGRATIONS_CREDENTIALS.md
```

---

### Step 3: Add to `.git/info/exclude` (Extra Protection)

**This is a local-only ignore file (never committed):**

```bash
# Add to .git/info/exclude
echo "INTEGRATIONS_CREDENTIALS.md" >> .git/info/exclude
```

**On Windows PowerShell:**
```powershell
Add-Content -Path .git/info/exclude -Value "INTEGRATIONS_CREDENTIALS.md"
```

**Verify it was added:**
```bash
cat .git/info/exclude | grep INTEGRATIONS_CREDENTIALS.md
```

---

### Step 4: Test Git Protection

**Verify Git will ignore the file:**

```bash
# Check Git status
git status

# INTEGRATIONS_CREDENTIALS.md should NOT appear in the output
```

**If it appears:**
- Make sure it's in `.gitignore`
- Run `git rm --cached INTEGRATIONS_CREDENTIALS.md` again
- Check `.gitignore` syntax is correct

---

## Service-Specific Verification

### Google Integration

**Checklist:**
- [ ] Google Cloud project created
- [ ] All 5 APIs enabled (Sheets, Drive, Calendar, Forms, Gmail)
- [ ] OAuth consent screen configured
- [ ] OAuth client created with correct redirect URIs
- [ ] Client ID and Secret in `.env.local`
- [ ] Credentials documented in `INTEGRATIONS_CREDENTIALS.md`

---

### Slack Integration

**Checklist:**
- [ ] Slack app created
- [ ] Bot Token Scopes added (all 9 scopes)
- [ ] Redirect URLs configured
- [ ] App installed to workspace
- [ ] Bot Token, Client ID, Client Secret in `.env.local`
- [ ] Credentials documented in `INTEGRATIONS_CREDENTIALS.md`

---

### GitHub Integration

**Checklist:**
- [ ] GitHub OAuth app created
- [ ] Redirect URIs configured
- [ ] Client ID and Secret in `.env.local`
- [ ] Credentials documented in `INTEGRATIONS_CREDENTIALS.md`

---

### Airtable Integration

**Checklist:**
- [ ] Personal Access Token created
- [ ] Token documented in `INTEGRATIONS_CREDENTIALS.md`
- [ ] Note: Users will provide their own tokens (no env var needed)

---

### Notion Integration

**Checklist:**
- [ ] Integration created
- [ ] Token documented in `INTEGRATIONS_CREDENTIALS.md`
- [ ] Note: Users will provide their own tokens (no env var needed)

---

### Other Services

**For each service you're implementing:**
- [ ] OAuth app/API key created
- [ ] Credentials documented
- [ ] Environment variables set (if needed)
- [ ] Redirect URIs configured (if OAuth)

---

## Final Verification

### Complete Checklist

Before proceeding, verify:

**Environment:**
- [ ] All environment variables in `.env.local`
- [ ] All values match `INTEGRATIONS_CREDENTIALS.md`
- [ ] No placeholder values

**Database:**
- [ ] `user_integrations` table exists
- [ ] `integration_credentials` table exists (optional)
- [ ] All columns present
- [ ] Indexes created

**OAuth Apps:**
- [ ] Google OAuth app configured
- [ ] Slack app configured
- [ ] GitHub OAuth app configured
- [ ] All redirect URIs correct
- [ ] All scopes/permissions set

**Security:**
- [ ] `INTEGRATIONS_CREDENTIALS.md` in `.gitignore`
- [ ] `INTEGRATIONS_CREDENTIALS.md` in `.git/info/exclude`
- [ ] File not tracked by Git
- [ ] `.env.local` protected (already should be)

**Documentation:**
- [ ] `INTEGRATIONS_CREDENTIALS.md` complete
- [ ] All credentials filled in
- [ ] No missing information

---

## Ready-to-Use Prompt for Developer

**Copy and paste this entire prompt after completing all checks above:**

---

```
I have completed all pre-implementation checks for the integrations system. Please proceed with implementing the complete integration infrastructure according to the phases outlined in INTEGRATIONS_COMPLETE_GUIDE.md (lines 931-999).

## Verification Complete

✅ Environment Variables: All set in .env.local
✅ Database: Tables created and verified
✅ OAuth Apps: All configured with correct redirect URIs
✅ Credentials: Documented in INTEGRATIONS_CREDENTIALS.md
✅ Git Security: INTEGRATIONS_CREDENTIALS.md protected from commits

## Implementation Request

Please implement the following phases:

### Phase 1: Foundation
1. Create OAuth infrastructure:
   - Generic OAuth flow handler
   - Callback route handler
   - Token storage/refresh system
   - CSRF protection

2. Create integration service layer:
   - Functions to store/retrieve user integrations
   - Token encryption/decryption
   - Integration status checking

3. Security:
   - Encrypt tokens in database
   - Secure environment variable usage
   - Implement CSRF protection for OAuth flows

### Phase 2: Google Sheets Integration (First Integration)
1. OAuth Setup:
   - Create /api/auth/connect/google route
   - Create /api/auth/callback/google route
   - Handle token exchange and storage
   - Implement token refresh logic

2. API Client:
   - Create Google Sheets API client
   - Implement token refresh
   - Handle API errors gracefully

3. Resource Fetching:
   - Create /api/integrations/google/spreadsheets route (list user's spreadsheets)
   - Create /api/integrations/google/sheets/:spreadsheetId route (list sheets in spreadsheet)
   - Create /api/integrations/google/columns/:spreadsheetId/:sheetName route (get column headers)

4. Node Updates:
   - Update "Add Row to Google Sheet" node configuration
   - Replace text inputs with dropdowns for:
     - Spreadsheet selection
     - Sheet selection
     - Column mapping
   - Add validation for selections

5. UI Components:
   - Create "Connect Google" button component
   - Create spreadsheet picker dropdown
   - Create sheet picker dropdown
   - Create column mapper UI
   - Show connection status

### Phase 3: Slack Integration
1. OAuth Setup:
   - Create /api/auth/connect/slack route
   - Create /api/auth/callback/slack route
   - Handle token exchange and storage

2. API Client:
   - Create Slack API client
   - Implement token refresh

3. Resource Fetching:
   - Create /api/integrations/slack/channels route (list user's channels)

4. Node Updates:
   - Update "Post to Slack Channel" node
   - Replace channel text input with dropdown
   - Update "New Message in Slack" trigger
   - Add channel selection dropdown

5. UI Components:
   - Create "Connect Slack" button
   - Create channel picker dropdown

### Phase 4: Additional Integrations (If Time Permits)
- Airtable (bases, tables, fields)
- Notion (databases, properties)
- GitHub (repositories)
- Other services as prioritized

### Phase 5: AI Integration
1. Update AI Context:
   - Add integration knowledge to prompts
   - Include available resources in context
   - Add schema information

2. Workflow Generator Updates:
   - Check user's connected integrations
   - Suggest appropriate resources
   - Validate resource names

## Important Notes

1. **Environment Variables:**
   - Use GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for user authentication (login)
   - Use GOOGLE_INTEGRATION_CLIENT_ID and GOOGLE_INTEGRATION_CLIENT_SECRET for integrations
   - All other service credentials are in .env.local

2. **Database:**
   - Use existing user_integrations and integration_credentials tables
   - Encrypt sensitive tokens before storing

3. **Security:**
   - Ensure INTEGRATIONS_CREDENTIALS.md is in .gitignore
   - Never commit credentials
   - Use environment variables for all secrets

4. **OAuth Redirect URIs:**
   - Production: https://runwiseai.app/api/auth/callback/[service]
   - Development: http://localhost:3000/api/auth/callback/[service]

5. **Priority:**
   - Start with Google Sheets (most commonly used)
   - Then Slack (second most common)
   - Then add others incrementally

## Credentials Location

All credentials are documented in INTEGRATIONS_CREDENTIALS.md (which is gitignored).

Environment variables are in .env.local (which is already gitignored).

Please begin implementation starting with Phase 1, then Phase 2 (Google Sheets), then Phase 3 (Slack).
```

---

## Quick Reference: What to Check

**Before giving the prompt, verify:**

1. ✅ `.env.local` has all required variables
2. ✅ Database tables exist and have correct structure
3. ✅ OAuth apps configured with correct redirect URIs
4. ✅ `INTEGRATIONS_CREDENTIALS.md` is complete
5. ✅ `INTEGRATIONS_CREDENTIALS.md` is in `.gitignore`
6. ✅ `INTEGRATIONS_CREDENTIALS.md` is NOT tracked by Git
7. ✅ All credentials match between files

**Once all checked, copy the prompt above and give it to the developer!**

---

## Troubleshooting

### If Environment Variables Don't Match

**Problem:** Values in `.env.local` don't match `INTEGRATIONS_CREDENTIALS.md`

**Solution:**
1. Open both files
2. Compare values side-by-side
3. Update `.env.local` to match `INTEGRATIONS_CREDENTIALS.md` (source of truth)
4. Save and verify

---

### If Database Tables Missing

**Problem:** Tables don't exist or missing columns

**Solution:**
1. Go to Supabase SQL Editor
2. Run the SQL from `INTEGRATIONS_COMPLETE_GUIDE.md` Database Setup section
3. Verify tables created
4. Check columns exist

---

### If OAuth App Not Working

**Problem:** Redirect URI errors or app not found

**Solution:**
1. Check redirect URIs match exactly (no trailing slashes)
2. Verify app exists in service's developer portal
3. Check Client ID/Secret match
4. Ensure app is installed/activated

---

### If Git Still Tracks Credentials File

**Problem:** `INTEGRATIONS_CREDENTIALS.md` still shows in `git status`

**Solution:**
```bash
# Remove from tracking
git rm --cached INTEGRATIONS_CREDENTIALS.md

# Verify it's in .gitignore
# Add to .git/info/exclude as backup

# Commit the removal (file stays locally)
git commit -m "Remove credentials file from tracking"
```

---

**Good luck! Once all checks pass, you're ready for implementation! 🚀**

