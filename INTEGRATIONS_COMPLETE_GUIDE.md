# Complete Integrations Guide for Runwise
## Absolute Beginner's Guide to Integrating Third-Party Services

---

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding Integrations](#understanding-integrations)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step: Creating OAuth Apps](#step-by-step-creating-oauth-apps)
5. [Gathering Credentials](#gathering-credentials)
6. [Database Setup](#database-setup)
7. [Implementation Process](#implementation-process)
8. [Testing Guide](#testing-guide)
9. [Troubleshooting](#troubleshooting)
10. [Security Best Practices](#security-best-practices)
11. [Service-Specific Guides](#service-specific-guides)

---

## Introduction

### What This Guide Covers

This guide will teach you how to:
- Create OAuth applications for third-party services
- Gather all necessary credentials and API keys
- Understand what information developers need
- Set up integrations in your Runwise platform
- Test and verify integrations work correctly

### Who This Guide Is For

- **Absolute beginners** who have never set up OAuth before
- **Non-technical founders** who need to gather credentials
- **Developers** who need detailed setup instructions
- **Anyone** integrating services into Runwise

### What You'll Learn

By the end of this guide, you'll know:
- What OAuth is and why it's needed
- How to create OAuth apps for 10+ services
- Where to find all credentials
- How to securely store credentials
- What information to provide to developers

---

## Understanding Integrations

### What Is an Integration?

An **integration** connects Runwise to external services (like Google Sheets, Slack, etc.) so that:
- Users can connect their accounts once
- Runwise can access their resources (spreadsheets, channels, etc.)
- Users can select from dropdowns instead of typing IDs
- Workflows work automatically without manual configuration

### Why Do We Need Integrations?

**Without integrations:**
- Users must manually type spreadsheet IDs
- No way to verify IDs are correct
- Workflows fail if IDs are wrong
- Users can't see what resources they have

**With integrations:**
- Users click "Connect Google" once
- Dropdown shows all their spreadsheets
- System validates selections automatically
- Workflows work reliably

### Types of Authentication

#### 1. OAuth 2.0 (Most Common)
- User clicks "Connect" button
- Redirected to service (Google, Slack, etc.)
- User approves access
- Service sends token back to Runwise
- Runwise stores token securely

**Services using OAuth:** Google, Slack, GitHub, Notion, Trello

#### 2. API Keys
- User provides API key directly
- Stored securely in database
- Used for API calls

**Services using API keys:** Airtable, Twilio, SendGrid, OpenAI

#### 3. Webhooks
- Service sends data to Runwise
- Runwise provides webhook URL
- Service calls URL when events happen

**Services using webhooks:** Discord, Stripe, PayPal

---

## Prerequisites

### What You Need Before Starting

1. **Domain/URL**
   - Production: `https://runwiseai.app`
   - Development: `http://localhost:3000`

2. **Accounts for Each Service**
   - Google account (for Google services)
   - Slack workspace
   - Airtable account
   - Notion account
   - Trello account
   - GitHub account
   - etc.

3. **Access to Service Developer Portals**
   - Google Cloud Console
   - Slack API Dashboard
   - Airtable Developer Portal
   - etc.

4. **Database Access**
   - Supabase project
   - Ability to create tables
   - Environment variable storage

5. **Basic Understanding**
   - How to copy/paste text
   - How to navigate websites
   - How to follow step-by-step instructions

---

## Step-by-Step: Creating OAuth Apps

### General OAuth Flow

1. Go to service's developer portal
2. Create new application/project
3. Configure OAuth settings
4. Set redirect URI
5. Get Client ID and Client Secret
6. Save credentials securely

---

## Service-Specific Guides

### 1. Google (Sheets, Drive, Calendar, Forms, Gmail)

Google uses one OAuth app for all Google services.

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Project name: `Runwise Integrations`
4. Click **"Create"**
5. Wait for project creation (30 seconds)

#### Step 2: Enable Required APIs

1. In Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search and enable each API:
   - **Google Sheets API**
   - **Google Drive API**
   - **Google Calendar API**
   - **Google Forms API**
   - **Gmail API**
3. For each API:
   - Click on it
   - Click **"Enable"**
   - Wait for confirmation

#### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Configure the consent screen:
   - User Type: **External** (unless you have Google Workspace)
   - App name: **Runwise**
   - User support email: **your-email@example.com**
   - Developer contact: **your-email@example.com**
   - Click **"Save and Continue"**
3. On the "Scopes" page:
   - **Note:** You can add scopes here, but they're optional at this stage
   - For now, click **"Save and Continue"** (we'll handle scopes in code)
   - If you see "Test users" page: Add your email → **"Save and Continue"**
   - Click **"Back to Dashboard"**

**Important:** The scopes you see here are just for display purposes. The actual scopes requested are determined by your application code when making OAuth requests. You don't need to add them all here - your developer will handle this in the code.

#### Step 4: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If you haven't configured the consent screen yet, you'll be prompted - follow Step 3 above first
4. Create OAuth Client:
   - Application type: **Web application**
   - Name: **Runwise Web Client**
   - Authorized JavaScript origins:
     - `https://runwiseai.app`
     - `http://localhost:3000` (for development)
   - Authorized redirect URIs:
     - `https://runwiseai.app/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google` (for development)
   - Click **"Create"**

5. **IMPORTANT:** Copy these immediately:
   - **Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-xyz123456`)
   - Save in secure location (you won't see secret again!)

**Note about Scopes:** The scopes are not configured in the OAuth client settings. Instead, your developer will request them when building the OAuth flow in your application code. The scopes listed in Step 4 below are what your developer needs to request programmatically.

#### Step 4: Document Your Credentials

Create a document with:

```
=== GOOGLE INTEGRATION ===
Client ID: [paste your Client ID here]
Client Secret: [paste your Client Secret here]

Redirect URIs:
- Production: https://runwiseai.app/api/auth/callback/google
- Development: http://localhost:3000/api/auth/callback/google

Scopes Required:
- https://www.googleapis.com/auth/spreadsheets.readonly
- https://www.googleapis.com/auth/spreadsheets
- https://www.googleapis.com/auth/drive.readonly
- https://www.googleapis.com/auth/drive.file
- https://www.googleapis.com/auth/calendar
- https://www.googleapis.com/auth/calendar.events
- https://www.googleapis.com/auth/forms.responses.readonly
- https://www.googleapis.com/auth/gmail.readonly

APIs Enabled:
- Google Sheets API
- Google Drive API
- Google Calendar API
- Google Forms API
- Gmail API
```

---

### 2. Slack

#### Step 1: Create Slack App

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Select **"From scratch"**
4. App Name: **Runwise**
5. Pick Workspace: Select your workspace
6. Click **"Create App"**

#### Step 2: Configure OAuth & Permissions

1. In app settings, go to **"OAuth & Permissions"** (left sidebar)
2. Scroll to **"Redirect URLs"**
3. Click **"Add New Redirect URL"**
4. Add:
   - `https://runwiseai.app/api/auth/callback/slack`
   - `https://localhost:3000/api/auth/callback/slack` (for development)
5. Click **"Save URLs"**

#### Step 3: Set Bot Token Scopes

1. Still in **"OAuth & Permissions"**
2. Scroll to **"Scopes"** → **"Bot Token Scopes"**
3. Click **"Add an OAuth Scope"**
4. Add these scopes:
   - `channels:read` - View basic information about public channels
   - `channels:history` - View messages in public channels
   - `chat:write` - Send messages as the bot
   - `groups:read` - View basic information about private channels
   - `groups:history` - View messages in private channels
   - `im:read` - View basic information about direct messages
   - `im:history` - View messages in direct messages
   - `mpim:read` - View basic information about group direct messages
   - `mpim:history` - View messages in group direct messages
5. Scroll up and click **"Save Changes"**

#### Step 4: Install App to Workspace

1. Still in **"OAuth & Permissions"**
2. Scroll to top
3. Click **"Install to Workspace"** button
4. Review permissions
5. Click **"Allow"**

#### Step 5: Get Credentials

1. After installation, you'll see:
   - **Bot User OAuth Token** (starts with `xoxb-`)
   - **Client ID** (at top of page)
   - **Client Secret** (at top of page)

2. **IMPORTANT:** Copy all three:
   - Bot Token: `xoxb-your-bot-token-here`
   - Client ID: `your-client-id-here`
   - Client Secret: `your-client-secret-here`

#### Step 6: Document Your Credentials

```
=== SLACK INTEGRATION ===
Bot User OAuth Token: xoxb-[your-token]
Client ID: [your-client-id]
Client Secret: [your-client-secret]

Redirect URIs:
- Production: https://runwiseai.app/api/auth/callback/slack
- Development: http://localhost:3000/api/auth/callback/slack

Bot Token Scopes:
- channels:read
- channels:history
- chat:write
- groups:read
- groups:history
- im:read
- im:history
- mpim:read
- mpim:history
```

---

### 3. Airtable

Airtable uses Personal Access Tokens (not OAuth).

#### Step 1: Create Personal Access Token

1. Go to [Airtable Account](https://airtable.com/account)
2. Scroll to **"Developer options"**
3. Click **"Create token"**
4. Token name: **Runwise Integration**
5. Scopes: Select:
   - `data.records:read` - Read records
   - `data.records:write` - Create/update records
   - `schema.bases:read` - Read base schemas
   - `schema.bases:write` - Write base schemas (if needed)
6. Access: Select bases you want to access (or **All current and future bases in all workspaces**)
7. Click **"Create token"**
8. **IMPORTANT:** Copy token immediately (you won't see it again!)
   - Token looks like: `patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

#### Step 2: Document Your Credentials

```
=== AIRTABLE INTEGRATION ===
Personal Access Token: pat[your-token]

Scopes:
- data.records:read
- data.records:write
- schema.bases:read

Note: This is an API key, not OAuth. Users will provide their own tokens.
```

---

### 4. Notion

Notion uses Internal Integration Tokens (not OAuth).

#### Step 1: Create Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Integration name: **Runwise**
4. Associated workspace: Select your workspace
5. Type: **Internal**
6. Capabilities: Check:
   - ✅ Read content
   - ✅ Insert content
   - ✅ Update content
   - ✅ Read comments (optional)
7. Click **"Submit"**
8. **IMPORTANT:** Copy **Internal Integration Token**
   - Token looks like: `secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

#### Step 2: Share Databases with Integration

1. Open any Notion database you want to use
2. Click **"..."** (three dots) → **"Connections"**
3. Find **"Runwise"** integration
4. Click to connect
5. Repeat for all databases you want to access

#### Step 3: Document Your Credentials

```
=== NOTION INTEGRATION ===
Internal Integration Token: secret_[your-token]

Capabilities:
- Read content
- Insert content
- Update content

Note: This is an API key. Users will provide their own tokens.
Each database must be shared with the integration.
```

---

### 5. Trello

Trello uses API Key + Token (not OAuth). **Note:** Trello has updated their system to use the Power-Up Admin Portal.

#### Step 1: Access Power-Up Admin Portal

1. Go to [Trello Power-Up Admin Portal](https://trello.com/power-ups/admin)
2. If you're not logged in, log in with your Trello account
3. You'll see the Power-Up Admin Portal dashboard

#### Step 2: Create or Select a Power-Up

**Option A: Create a New Power-Up (Recommended for Runwise)**

1. In the Power-Up Admin Portal, click **"Create a Power-Up"** or **"New Power-Up"**
2. Power-Up Name: **Runwise**
3. Description: **Integration for Runwise workflow automation**
4. Click **"Create"** or **"Save"**

**Option B: Use Existing Power-Up**

1. If you already have a Power-Up, select it from the list
2. Click on it to open its settings

#### Step 3: Get API Key

1. In your Power-Up settings, go to the **"API key"** section or tab
2. You'll see your **Developer API Key**
   - Looks like: `1234567890abcdef1234567890abcdef`
3. Copy the API Key

#### Step 4: Generate Token

1. Still in the Power-Up Admin Portal, look for **"Token"** or **"Generate Token"** section
2. Click **"Generate Token"** or **"Token"** link
3. You may be redirected to authorize the application
4. Authorize the application
5. You'll see your **Token**
   - Looks like: `1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
6. Copy the Token

**Alternative Method (If Token Not in Portal):**

If you can't find the token in the Power-Up Admin Portal:

1. Go to: `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&name=Runwise&key=YOUR_API_KEY`
   - Replace `YOUR_API_KEY` with the API key you copied in Step 3
2. Authorize the application
3. You'll be redirected to a page with your token in the URL
4. Copy the token from the URL (it's the part after `token=`)

#### Step 5: Configure Allowed Origins (Optional but Recommended)

1. In the Power-Up Admin Portal, find **"Allowed Origins"** or **"CORS"** settings
2. Add your domain:
   - `https://runwiseai.app`
   - `http://localhost:3000` (for development)
3. Click **"Save"**

#### Step 6: Document Your Credentials

```
=== TRELLO INTEGRATION ===
API Key: [your-api-key]
Token: [your-token]
Power-Up Name: Runwise

Note: This is an API key. Users will provide their own keys/tokens.
Each user needs to create their own Power-Up or use their own API key/token.
```

#### Troubleshooting

**If you can't access the Power-Up Admin Portal:**
- Make sure you're logged into Trello
- Try accessing directly: https://trello.com/power-ups/admin
- Check that your account has developer access

**If you can't find the API key:**
- Look for "Developer API Keys" section
- Check if you need to enable developer mode
- Try the "API key" tab in your Power-Up settings

**If token generation doesn't work:**
- Use the alternative method above with the direct authorization URL
- Make sure you've copied the API key correctly

---

### 6. GitHub

#### Step 1: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"OAuth Apps"** → **"New OAuth App"**
3. Application name: **Runwise**
4. Homepage URL: `https://runwiseai.app`
5. Authorization callback URL:
   - `https://runwiseai.app/api/auth/callback/github`
   - `http://localhost:3000/api/auth/callback/github` (for development)
6. Click **"Register application"**

#### Step 2: Get Credentials

1. You'll see:
   - **Client ID** (looks like: `Iv1.1234567890abcdef`)
   - **Client Secret** (click **"Generate a new client secret"**)
2. **IMPORTANT:** Copy both immediately

#### Step 3: Create Personal Access Token (Alternative)

For server-to-server, you might also need a PAT:

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Note: **Runwise Integration**
4. Expiration: Choose duration (90 days recommended)
5. Scopes: Check:
   - `repo` - Full control of private repositories
   - `read:org` - Read org and team membership (if needed)
6. Click **"Generate token"**
7. **IMPORTANT:** Copy token immediately (you won't see it again!)

#### Step 4: Document Your Credentials

```
=== GITHUB INTEGRATION ===
OAuth App:
- Client ID: [your-client-id]
- Client Secret: [your-client-secret]

Personal Access Token (optional, for server use):
- Token: [your-pat-token]

Redirect URIs:
- Production: https://runwiseai.app/api/auth/callback/github
- Development: http://localhost:3000/api/auth/callback/github
```

---

### 7. Discord

Discord uses webhooks (no OAuth needed for basic functionality).

#### Step 1: Create Webhook (Simple Method)

1. Go to your Discord server
2. Server Settings → **Integrations** → **Webhooks**
3. Click **"New Webhook"**
4. Name: **Runwise**
5. Channel: Select channel
6. Click **"Copy Webhook URL"**
   - Looks like: `https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz`

#### Step 2: Create Bot (Advanced Method)

For OAuth bot access:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Name: **Runwise**
4. Click **"Create"**
5. Go to **"OAuth2"** → **"URL Generator"**
6. Scopes: Check:
   - `bot`
   - `webhook.incoming`
7. Bot Permissions: Check:
   - Send Messages
   - Read Message History
   - Manage Messages
8. Copy **Generated URL**
9. Go to **"Bot"** section
10. Click **"Add Bot"**
11. Copy **Token** (click **"Reset Token"** if needed)
12. Go to **"OAuth2"** → **"General"**
13. Add Redirect URI: `https://runwiseai.app/api/auth/callback/discord`

#### Step 3: Document Your Credentials

```
=== DISCORD INTEGRATION ===
Method 1: Webhook (Simple)
- Webhook URL: https://discord.com/api/webhooks/[id]/[token]

Method 2: Bot (OAuth)
- Client ID: [your-client-id]
- Client Secret: [your-client-secret]
- Bot Token: [your-bot-token]
- Redirect URI: https://runwiseai.app/api/auth/callback/discord
```

---

### 8. SendGrid

SendGrid uses API keys.

#### Step 1: Create API Key

1. Go to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Go to **Settings** → **API Keys**
3. Click **"Create API Key"**
4. API Key Name: **Runwise Integration**
5. API Key Permissions: **Full Access** (or **Restricted Access** with Mail Send)
6. Click **"Create & View"**
7. **IMPORTANT:** Copy API key immediately (you won't see it again!)
   - Looks like: `SG.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

#### Step 2: Document Your Credentials

```
=== SENDGRID INTEGRATION ===
API Key: SG.[your-api-key]

Note: This is an API key. Users will provide their own keys.
```

---

### 9. Twilio

Twilio uses Account SID and Auth Token.

#### Step 1: Get Credentials

1. Go to [Twilio Console](https://console.twilio.com/)
2. Dashboard shows:
   - **Account SID** (looks like: `ACyour-account-sid-here`)
   - **Auth Token** (click **"Show"** to reveal, looks like: `your-auth-token-here`)

#### Step 2: Document Your Credentials

```
=== TWILIO INTEGRATION ===
Account SID: AC[your-account-sid]
Auth Token: [your-auth-token]

Note: Users will provide their own credentials.
```

---

### 10. OpenAI

OpenAI uses API keys.

#### Step 1: Create API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. Name: **Runwise Integration**
4. Click **"Create secret key"**
5. **IMPORTANT:** Copy API key immediately (you won't see it again!)
   - Looks like: `sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

#### Step 2: Document Your Credentials

```
=== OPENAI INTEGRATION ===
API Key: sk-[your-api-key]

Note: This is an API key. Users will provide their own keys.
```

---

## Gathering Credentials

### Master Credentials Document Template

Create a document called `INTEGRATIONS_CREDENTIALS.md`:

```markdown
# Runwise Integration Credentials
**IMPORTANT: Keep this document secure. Do not commit to Git.**

Last Updated: [Date]

## Domain Information
- Production Domain: https://runwiseai.app
- Development Domain: http://localhost:3000

---

## 1. Google Integration
- Client ID: [paste here]
- Client Secret: [paste here]
- Redirect URI (Production): https://runwiseai.app/api/auth/callback/google
- Redirect URI (Development): http://localhost:3000/api/auth/callback/google
- APIs Enabled: Sheets, Drive, Calendar, Forms, Gmail
- Scopes: [list all scopes]

---

## 2. Slack Integration
- Bot Token: xoxb-[paste here]
- Client ID: [paste here]
- Client Secret: [paste here]
- Redirect URI (Production): https://runwiseai.app/api/auth/callback/slack
- Redirect URI (Development): http://localhost:3000/api/auth/callback/slack
- Scopes: [list all scopes]

---

## 3. Airtable Integration
- Personal Access Token: pat[paste here]
- Scopes: [list scopes]

---

## 4. Notion Integration
- Internal Integration Token: secret_[paste here]
- Capabilities: [list capabilities]

---

## 5. Trello Integration
- API Key: [paste here]
- Token: [paste here]

---

## 6. GitHub Integration
- OAuth Client ID: [paste here]
- OAuth Client Secret: [paste here]
- Personal Access Token (optional): [paste here]
- Redirect URI (Production): https://runwiseai.app/api/auth/callback/github
- Redirect URI (Development): http://localhost:3000/api/auth/callback/github

---

## 7. Discord Integration
- Webhook URL (if using webhooks): [paste here]
- OR Bot Client ID: [paste here]
- OR Bot Client Secret: [paste here]
- OR Bot Token: [paste here]
- Redirect URI: https://runwiseai.app/api/auth/callback/discord

---

## 8. SendGrid Integration
- API Key: SG.[paste here]

---

## 9. Twilio Integration
- Account SID: AC[paste here]
- Auth Token: [paste here]

---

## 10. OpenAI Integration
- API Key: sk-[paste here]

---

## Environment Variables

Add these to your `.env.local` file:

```env
# Google
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Slack
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Airtable (example - users provide their own)
AIRTABLE_API_KEY=pat-your-token

# Notion (example - users provide their own)
NOTION_API_KEY=secret_your-token

# Trello (example - users provide their own)
TRELLO_API_KEY=your-api-key
TRELLO_TOKEN=your-token

# GitHub
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Discord
DISCORD_WEBHOOK_URL=your-webhook-url
# OR
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_BOT_TOKEN=your-bot-token

# SendGrid (example - users provide their own)
SENDGRID_API_KEY=SG.your-api-key

# Twilio (example - users provide their own)
TWILIO_ACCOUNT_SID=ACyour-account-sid
TWILIO_AUTH_TOKEN=your-auth-token

# OpenAI (example - users provide their own)
OPENAI_API_KEY=sk-your-api-key
```
```

---

## Database Setup

### Tables Needed

Your developer will create these tables in Supabase:

#### 1. `user_integrations` Table

Stores which services each user has connected.

```sql
-- Create user_integrations table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL, -- 'google', 'slack', 'airtable', etc.
  access_token TEXT, -- encrypted OAuth token
  refresh_token TEXT, -- encrypted refresh token
  token_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- additional service-specific data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_name)
);

-- Add missing columns if table exists with different schema
DO $$ 
BEGIN
  -- Add service_name if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_integrations' AND column_name = 'service_name') THEN
    ALTER TABLE user_integrations ADD COLUMN service_name TEXT;
  END IF;
  
  -- Add access_token if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_integrations' AND column_name = 'access_token') THEN
    ALTER TABLE user_integrations ADD COLUMN access_token TEXT;
  END IF;
  
  -- Add refresh_token if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_integrations' AND column_name = 'refresh_token') THEN
    ALTER TABLE user_integrations ADD COLUMN refresh_token TEXT;
  END IF;
  
  -- Add token_expires_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_integrations' AND column_name = 'token_expires_at') THEN
    ALTER TABLE user_integrations ADD COLUMN token_expires_at TIMESTAMPTZ;
  END IF;
  
  -- Add metadata if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_integrations' AND column_name = 'metadata') THEN
    ALTER TABLE user_integrations ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
  
  -- Add created_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_integrations' AND column_name = 'created_at') THEN
    ALTER TABLE user_integrations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_integrations' AND column_name = 'updated_at') THEN
    ALTER TABLE user_integrations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint 
                 WHERE conname = 'user_integrations_user_id_service_name_key') THEN
    ALTER TABLE user_integrations ADD CONSTRAINT user_integrations_user_id_service_name_key 
    UNIQUE(user_id, service_name);
  END IF;
END $$;

-- Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_service ON user_integrations(service_name);
```

#### 2. `integration_credentials` Table (Optional)

For storing user-provided API keys securely.

```sql
-- Create integration_credentials table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL,
  credential_type TEXT NOT NULL, -- 'api_key', 'token', 'webhook_url', etc.
  credential_value TEXT NOT NULL, -- encrypted
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_name, credential_type)
);

-- Create index (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_integration_credentials_user_id ON integration_credentials(user_id);
```

---

## Implementation Process

### Phase 1: Foundation (Developer Does This)

1. **Database Setup**
   - Create `user_integrations` table
   - Create `integration_credentials` table
   - Set up encryption for tokens

2. **OAuth Infrastructure**
   - Create OAuth flow handler
   - Create callback route handler
   - Set up token storage/refresh

3. **Security**
   - Encrypt tokens in database
   - Set up secure environment variables
   - Implement CSRF protection

### Phase 2: First Integration (Example: Google Sheets)

1. **OAuth Setup**
   - Create `/api/auth/connect/google` route
   - Create `/api/auth/callback/google` route
   - Handle token exchange and storage

2. **API Client**
   - Create Google Sheets API client
   - Implement token refresh
   - Handle API errors

3. **Resource Fetching**
   - Create `/api/integrations/google/spreadsheets` route
   - Create `/api/integrations/google/sheets/:spreadsheetId` route
   - Create `/api/integrations/google/columns/:spreadsheetId/:sheetName` route

4. **Node Updates**
   - Update "Add Row to Google Sheet" node
   - Replace text inputs with dropdowns
   - Add spreadsheet selection
   - Add sheet selection
   - Add column mapping UI

5. **UI Components**
   - Create "Connect Google" button
   - Create spreadsheet picker component
   - Create sheet picker component
   - Create column mapper component

### Phase 3: Repeat for Other Services

Same process for:
- Slack (channels)
- Airtable (bases, tables, fields)
- Notion (databases, properties)
- Trello (boards, lists)
- etc.

### Phase 4: AI Integration

1. **Update AI Context**
   - Add integration knowledge to prompts
   - Include available resources in context
   - Add schema information

2. **Workflow Generator Updates**
   - Check user's connected integrations
   - Suggest appropriate resources
   - Validate resource names

---

## Testing Guide

### For Each Integration

#### 1. OAuth Flow Test

1. Click "Connect [Service]" button
2. Should redirect to service login
3. Login and approve
4. Should redirect back to Runwise
5. Should show "Connected" status

#### 2. Resource Fetching Test

1. Open node configuration
2. Should see dropdown for resources
3. Should load user's resources
4. Should allow selection

#### 3. Schema Fetching Test

1. Select a resource (spreadsheet, channel, etc.)
2. Should load related resources (sheets, columns, etc.)
3. Should show schema information

#### 4. Node Configuration Test

1. Configure node with integration
2. Select resources from dropdowns
3. Save configuration
4. Verify configuration is saved

#### 5. Workflow Execution Test

1. Create workflow with integration node
2. Configure node properly
3. Run workflow
4. Verify it executes successfully
5. Check that data is correct

#### 6. Token Refresh Test

1. Wait for token to expire (or manually expire)
2. Try to use integration
3. Should automatically refresh token
4. Should work without user intervention

---

## Troubleshooting

### Common Issues

#### Issue: "Invalid redirect URI"

**Solution:**
- Check redirect URI matches exactly in service settings
- Include both production and development URIs
- Check for trailing slashes
- Verify protocol (http vs https)

#### Issue: "Token expired"

**Solution:**
- Implement token refresh logic
- Check token expiration time
- Handle refresh errors gracefully

#### Issue: "Insufficient permissions"

**Solution:**
- Check OAuth scopes are correct
- Verify user approved all permissions
- Check service-specific permission requirements

#### Issue: "Resource not found"

**Solution:**
- Validate resource exists before using
- Check user has access to resource
- Handle errors gracefully with clear messages

#### Issue: "Rate limit exceeded"

**Solution:**
- Implement rate limiting
- Cache resource lists
- Show user-friendly error messages

---

## Security Best Practices

### 1. Token Storage

- **Always encrypt tokens** in database
- Use strong encryption (AES-256)
- Never log tokens
- Never expose tokens in URLs

### 2. Environment Variables

- Store secrets in `.env.local` (never commit)
- Use different credentials for dev/prod
- Rotate credentials regularly
- Use secret management service if possible

### 3. OAuth Security

- Use state parameter for CSRF protection
- Validate redirect URIs
- Use HTTPS in production
- Implement token refresh

### 4. API Security

- Validate all user inputs
- Check user permissions
- Rate limit API calls
- Monitor for suspicious activity

### 5. Error Handling

- Never expose sensitive information in errors
- Log errors securely
- Show user-friendly messages
- Don't reveal system internals

---

## What to Provide to Developers

### Complete Information Package

When you're ready to implement, provide:

```markdown
=== INTEGRATION IMPLEMENTATION REQUEST ===

Domain Information:
- Production: https://runwiseai.app
- Development: http://localhost:3000

Starting Integrations (Priority Order):
1. Google Sheets
2. Slack
3. Airtable

=== GOOGLE CREDENTIALS ===
Client ID: [your-client-id]
Client Secret: [your-client-secret]
Redirect URI: https://runwiseai.app/api/auth/callback/google

APIs Enabled:
- Google Sheets API
- Google Drive API
- Google Calendar API
- Google Forms API
- Gmail API

Scopes:
- https://www.googleapis.com/auth/spreadsheets.readonly
- https://www.googleapis.com/auth/spreadsheets
- https://www.googleapis.com/auth/drive.readonly
- https://www.googleapis.com/auth/drive.file
- https://www.googleapis.com/auth/calendar
- https://www.googleapis.com/auth/calendar.events
- https://www.googleapis.com/auth/forms.responses.readonly
- https://www.googleapis.com/auth/gmail.readonly

=== SLACK CREDENTIALS ===
Bot Token: xoxb-[your-token]
Client ID: [your-client-id]
Client Secret: [your-client-secret]
Redirect URI: https://runwiseai.app/api/auth/callback/slack

Scopes:
- channels:read
- channels:history
- chat:write
- groups:read
- groups:history
- im:read
- im:history
- mpim:read
- mpim:history

=== AIRTABLE CREDENTIALS ===
Personal Access Token: pat[your-token]

Scopes:
- data.records:read
- data.records:write
- schema.bases:read

=== QUESTIONS ===
[Any questions you have]

=== TIMELINE ===
[When you need this completed]
```

---

## Next Steps

1. **Choose 2-3 services** to start with (recommend: Google Sheets, Slack, Airtable)
2. **Follow service-specific guides** above to create OAuth apps
3. **Gather all credentials** using the template
4. **Document everything** in your credentials document
5. **Provide information** to developers using the format above
6. **Test each integration** as it's implemented
7. **Add more integrations** incrementally

---

## Additional Resources

### Official Documentation

- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Slack OAuth](https://api.slack.com/authentication/oauth-v2)
- [Airtable API](https://airtable.com/api)
- [Notion API](https://developers.notion.com/)
- [Trello API](https://developer.atlassian.com/cloud/trello/)
- [GitHub OAuth](https://docs.github.com/en/apps/oauth-apps)

### Support

If you get stuck:
1. Check service's official documentation
2. Check service's developer community forums
3. Contact service's support
4. Ask your developer for help

---

## Checklist

Before starting implementation, ensure you have:

- [ ] Domain/URL confirmed
- [ ] Accounts for all services you want to integrate
- [ ] OAuth apps created for OAuth services
- [ ] API keys generated for API key services
- [ ] All credentials documented securely
- [ ] Environment variables prepared
- [ ] Database access confirmed
- [ ] Developer ready to implement

---

**Good luck with your integrations! 🚀**

