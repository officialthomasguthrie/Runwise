# Complete OAuth 2.0 Integration Guide for Runwise

## Table of Contents
1. [What is OAuth?](#what-is-oauth)
2. [General Setup Process](#general-setup-process)
3. [Integration-Specific Guides](#integration-specific-guides)
4. [What to Prompt Me With](#what-to-prompt-me-with)
5. [Testing Your Integrations](#testing-your-integrations)

---

## What is OAuth?

**OAuth** (Open Authorization) is a way for users to securely connect their accounts to Runwise without giving you their passwords. Instead:

1. User clicks "Connect" on an integration
2. They're redirected to the service (e.g., Airtable, Trello)
3. They log in and approve access
4. The service sends Runwise a special token
5. Runwise uses that token to access their data

**Benefits:**
- More secure (no passwords stored)
- Better user experience (one-click connection)
- Automatic token refresh (when supported)
- Users can revoke access anytime

---

## General Setup Process

For **every** integration, you'll follow these steps:

### Step 1: Create OAuth App
1. Go to the service's developer portal
2. Create a new OAuth application
3. Set redirect URLs (where users come back after approving)
4. Copy your credentials (Client ID and Client Secret)

### Step 2: Add Credentials to Environment
Add the credentials to your `.env.local` file:
```env
SERVICE_CLIENT_ID=your_client_id_here
SERVICE_CLIENT_SECRET=your_client_secret_here
```

### Step 3: Prompt Me
Copy the prompt template for that service and fill in your credentials.

### Step 4: Test
After I implement it, test the connection flow.

---

## Integration-Specific Guides

### 1. Airtable OAuth 2.0

#### Setup Instructions

1. **Go to Airtable Developer Portal**
   - Visit: https://airtable.com/create/oauth
   - Or: https://airtable.com/developers/web/guides/oauth-integrations

2. **Create New OAuth Integration**
   - Click "Create new integration"
   - Fill in:
     - **Name**: `Runwise` (or your app name)
     - **Description**: `Workflow automation platform`
     - **Logo**: Upload your app logo (optional)

3. **Configure OAuth Settings**
   - **Redirect URI** (add both):
     - Development: `http://localhost:3000/api/auth/callback/airtable`
     - Production: `https://runwiseai.app/api/auth/callback/airtable`
   - **Scopes** (select these):
     - `data.records:read` - Read records
     - `data.records:write` - Write records
     - `schema.bases:read` - Read base schemas

4. **Get Your Credentials**
   - **Client ID**: Found in your integration settings
   - **Client Secret**: Found in your integration settings (click to reveal)

5. **Add to `.env.local`**
   ```env
   AIRTABLE_CLIENT_ID=your_client_id_here
   AIRTABLE_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert Airtable integration from API token authentication to OAuth 2.0. Here are my credentials (remember to not expose):
AIRTABLE_CLIENT_ID=d40b806f-5886-4631-8765-deb52cb603a8
AIRTABLE_CLIENT_SECRET=c175b3987c0ad585a33e7cff4f35dca20ae26ae696fe1423e5b7b7349a729f4c

Do the following:
1. Add Airtable OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/airtable/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/airtable/route.ts (OAuth callback route)
4. Update src/lib/integrations/airtable.ts to use OAuth tokens instead of API tokens (get from getUserIntegration instead of getIntegrationCredential)
5. Update src/components/ui/workflow-node-library.tsx to change Airtable credentialType from 'api_token' to 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'airtable' to oauthServices array in handleConnect
7. Update src/app/integrations/page.tsx to add 'airtable' to oauthServices array in handleConnect
8. Update src/app/api/integrations/disconnect/route.ts to add 'airtable' to oauthServices array and remove from credentialServices
9. Update src/app/api/integrations/status/route.ts to check for Airtable OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap to include 'airtable': 'airtable' mapping
11. Remove the credential dialog for Airtable (since it will use OAuth now)

Make sure to:
- Use the same OAuth pattern as Google/Slack/GitHub/Notion
- Store tokens using storeUserIntegration (not storeIntegrationCredential)
- Handle token refresh if Airtable supports it
- Update all references from api_token to oauth for Airtable
- Keep backward compatibility if possible (check both OAuth and API token)
```

---

### 2. Trello OAuth 1.0a (via Power-Ups)

**Note:** Trello uses OAuth 1.0a (different from OAuth 2.0) and requires creating a Power-Up first. This is more complex but follows a similar pattern.

#### Setup Instructions

1. **Go to Trello Power-Ups Administration**
   - Visit: https://trello.com/power-ups/admin
   - Log in with your Trello account

2. **Create a New Power-Up**
   - Click "Create new Power-Up"
   - Fill in:
     - **Name**: `Runwise` (or your app name)
     - **Author**: Your name/company
     - **Description**: `Workflow automation platform`
     - **Iframe Connector URL**: `https://runwiseai.app` (or your domain)
     - **Support Email**: Your support email

3. **Get Your API Key and OAuth Secret**
   - After creating the Power-Up, go to the "API Key" tab
   - Click "Generate a new API Key" if you don't have one
   - Your **API Key** will be displayed (this is your Consumer Key)
   - Your **OAuth Secret** will be displayed (this is your Consumer Secret - keep it secure!)
   - **Important**: Copy both values immediately - you may not be able to see the OAuth Secret again

4. **Configure Allowed Origins**
   - In the "API Key" tab, find "Allowed Origins" section
   - Add your redirect URIs:
     - Development: `   `
     - Production: `https://runwiseai.app`
   - This allows Trello to redirect back to your app after authorization

5. **OAuth 1.0a Flow Details:**
   - **Consumer Key**: Your API Key from Power-Up settings
   - **Consumer Secret**: Your OAuth Secret from Power-Up settings
   - **Request Token URL**: `https://trello.com/1/OAuthGetRequestToken`
   - **Access Token URL**: `https://trello.com/1/OAuthGetAccessToken`
   - **Authorize URL**: `https://trello.com/1/OAuthAuthorizeToken`
   - **Redirect URI**:
     - Development: `http://localhost:3000/api/auth/callback/trello`
     - Production: `https://runwiseai.app/api/auth/callback/trello`

6. **Add to `.env.local`**
   ```env
   TRELLO_API_KEY=your_api_key_from_power_up
   TRELLO_CLIENT_SECRET=your_oauth_secret_from_power_up
   ```

#### What to Prompt Me With

```
Convert Trello integration from API key + token authentication to OAuth 1.0a (via Power-Ups). Here are my credentials:
TRELLO_API_KEY=89c2cfb0f01a57c89fabd923380fdcb8
TRELLO_CLIENT_SECRET=615ca4ac7c56935534c10ee9f19b122afebf5e0c12e705b3f1123ef8d97c8e67

Note: Trello uses OAuth 1.0a which is different from OAuth 2.0. The flow requires:
- Request token step (get request token from Trello)
- User authorization (redirect user to Trello)
- Access token exchange (exchange request token for access token)

Important: Make sure you've:
1. Created a Power-Up at https://trello.com/power-ups/admin
2. Generated API Key and OAuth Secret from Power-Up settings
3. Added allowed origins (http://localhost:3000 and https://runwiseai.app)

Do the following:
1. Add Trello OAuth 1.0a config functions to src/lib/integrations/oauth.ts (update the existing stub)
2. Create src/app/api/auth/connect/trello/route.ts (OAuth initiation route - gets request token and redirects)
3. Create src/app/api/auth/callback/trello/route.ts (OAuth callback route - exchanges request token for access token)
4. Update src/lib/integrations/trello.ts to use OAuth tokens instead of API key + token
5. Update src/components/ui/workflow-node-library.tsx to change Trello credentialType from 'api_key_and_token' to 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'trello' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'trello' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'trello' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Trello OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap
11. Remove the credential dialog for Trello

Make sure to:
- Implement OAuth 1.0a flow (request token → authorize → access token)
- Use crypto for OAuth 1.0a signature generation (HMAC-SHA1)
- Store request token in cookie/session between steps
- Store tokens using storeUserIntegration
- Keep backward compatibility if possible (check both OAuth and API key + token)
- Use the OAuth Secret from Power-Up (not the API key) for signature generation
```

---

### 3. Stripe OAuth (Connect)

**Note:** Stripe OAuth is for Stripe Connect (allowing users to connect their Stripe accounts). This is different from API keys.

#### Setup Instructions

1. **Go to Stripe Dashboard**
   - Visit: https://dashboard.stripe.com/
   - Log in to your Stripe account

2. **Go to Developers → OAuth**
   - Or visit: https://dashboard.stripe.com/settings/applications/oauth

3. **Create OAuth Application**
   - Click "Add application"
   - Fill in:
     - **Application name**: `Runwise`
     - **Redirect URI** (add both):
       - Development: `http://localhost:3000/api/auth/callback/stripe`
       - Production: `https://runwiseai.app/api/auth/callback/stripe`

4. **Get Your Credentials**
   - **Client ID**: Found in OAuth application settings
   - **Client Secret**: Found in OAuth application settings (click to reveal)

5. **Add to `.env.local`**
   ```env
   STRIPE_CLIENT_ID=your_client_id_here
   STRIPE_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert Stripe integration from API key authentication to OAuth 2.0 (Stripe Connect). Here are my credentials:
- STRIPE_CLIENT_ID: [paste your client ID]
- STRIPE_CLIENT_SECRET: [paste your client secret]

Do the following:
1. Add Stripe OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/stripe/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/stripe/route.ts (OAuth callback route)
4. Update src/lib/integrations/stripe.ts to use OAuth tokens instead of API keys (get from getUserIntegration instead of getIntegrationCredential)
5. Update src/components/ui/workflow-node-library.tsx to change Stripe credentialType from 'api_token' to 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'stripe' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'stripe' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'stripe' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Stripe OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap
11. Remove the credential dialog for Stripe

Make sure to:
- Use Stripe Connect OAuth flow
- Store tokens using storeUserIntegration
- Handle token refresh if Stripe supports it
- Keep backward compatibility if possible
```

---

### 4. Shopify OAuth 2.0

#### Setup Instructions

1. **Go to Shopify Partners Dashboard**
   - Visit: https://partners.shopify.com/
   - Log in or create a partner account

2. **Create New App**
   - Click "Apps" → "Create app"
   - Choose "Custom app"
   - Fill in:
     - **App name**: `Runwise`
     - **App URL**: `https://runwiseai.app` (or your domain)

3. **Configure OAuth Settings**
   - Go to "App setup" tab
   - Under "Redirection URLs", add:
     - Development: `http://localhost:3000/api/auth/callback/shopify`
     - Production: `https://runwiseai.app/api/auth/callback/shopify`
   - **Scopes** (select these):
     - `read_products` - Read products
     - `write_products` - Write products
     - `read_orders` - Read orders
     - `read_customers` - Read customers
     - `read_inventory` - Read inventory

4. **Get Your Credentials**
   - **Client ID**: Found in "App credentials" section (also called "API key")
   - **Client Secret**: Found in "App credentials" section (also called "API secret key")

5. **Add to `.env.local`**
   ```env
   SHOPIFY_CLIENT_ID=your_client_id_here
   SHOPIFY_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert Shopify integration to OAuth 2.0. Here are my credentials:
SHOPIFY_CLIENT_ID=your_client_id_here
SHOPIFY_CLIENT_SECRET=your_client_secret_here

Do the following:
1. Add Shopify OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/shopify/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/shopify/route.ts (OAuth callback route)
4. Create src/lib/integrations/shopify.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Shopify with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'shopify' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'shopify' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'shopify' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Shopify OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Shopify OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle shop parameter in OAuth flow (users select their shop)
- Keep backward compatibility if possible
```

---

### 5. HubSpot OAuth 2.0

#### Setup Instructions

1. **Go to HubSpot Developer Portal**
   - Visit: https://developers.hubspot.com/
   - Log in with your HubSpot account

2. **Create New App**
   - Click "Create app"
   - Fill in:
     - **App name**: `Runwise`
     - **Description**: `Workflow automation platform`

3. **Configure OAuth Settings**
   - Go to "Auth" tab
   - **Redirect URI** (add both):
     - Development: `http://localhost:3000/api/auth/callback/hubspot`
     - Production: `https://runwiseai.app/api/auth/callback/hubspot`
   - **Scopes** (select these):
     - `contacts` - Read/write contacts
     - `content` - Read/write content
     - `files` - Read/write files
     - `forms` - Read/write forms
     - `tickets` - Read/write tickets

4. **Get Your Credentials**
   - **Client ID**: Found in "Auth" tab
   - **Client Secret**: Found in "Auth" tab (click to reveal)

5. **Add to `.env.local`**
   ```env
   HUBSPOT_CLIENT_ID=your_client_id_here
   HUBSPOT_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert HubSpot integration to OAuth 2.0. Here are my credentials:
HUBSPOT_CLIENT_ID=18251ac0-070d-4269-8602-3589ded746bb
HUBSPOT_CLIENT_SECRET=db2d5dd8-ec8e-4c81-b136-8a8964d6dd37

Do the following:
1. Add HubSpot OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/hubspot/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/hubspot/route.ts (OAuth callback route)
4. Create src/lib/integrations/hubspot.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add HubSpot with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'hubspot' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'hubspot' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'hubspot' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for HubSpot OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use HubSpot OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle token refresh (HubSpot tokens expire)
- Keep backward compatibility if possible
```

---

### 6. Asana OAuth 2.0

#### Setup Instructions

1. **Go to Asana Developer Portal**
   - Visit: https://app.asana.com/0/developer-console
   - Log in with your Asana account

2. **Create New App**
   - Click "Create new app"
   - Fill in:
     - **App name**: `Runwise`
     - **App URL**: `https://runwiseai.app`

3. **Configure OAuth Settings**
   - Go to "App settings"
   - **Redirect URI** (add both):
     - Development: `http://localhost:3000/api/auth/callback/asana`
     - Production: `https://runwiseai.app/api/auth/callback/asana`
   - **Scopes** (select these):
     - `default` - Basic read access
     - `default:write` - Write access

4. **Get Your Credentials**
   - **Client ID**: Found in app settings
   - **Client Secret**: Found in app settings (click to reveal)

5. **Add to `.env.local`**
   ```env
   ASANA_CLIENT_ID=your_client_id_here
   ASANA_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert Asana integration to OAuth 2.0. Here are my credentials:
ASANA_CLIENT_ID=1212641838930235
ASANA_CLIENT_SECRET=e6e3679d7abc530418826739e4c0528d

Do the following:
1. Add Asana OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/asana/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/asana/route.ts (OAuth callback route)
4. Create src/lib/integrations/asana.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Asana with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'asana' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'asana' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'asana' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Asana OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Asana OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle token refresh if Asana supports it
- Keep backward compatibility if possible
```

---

### 7. Jira OAuth 2.0

#### Setup Instructions

1. **Go to Atlassian Developer Portal**
   - Visit: https://developer.atlassian.com/console/myapps/
   - Log in with your Atlassian account

2. **Create New App**
   - Click "Create app"
   - Choose "OAuth 2.0 (3LO)" for Jira Cloud
   - Fill in:
     - **App name**: `Runwise`
     - **App URL**: `https://runwiseai.app`

3. **Configure OAuth Settings**
   - Go to "Authorization" tab
   - **Callback URL** (add both):
     - Development: `http://localhost:3000/api/auth/callback/jira`
     - Production: `https://runwiseai.app/api/auth/callback/jira`
   - **Scopes** (select these):
     - `read:jira-work` - Read Jira data
     - `write:jira-work` - Write Jira data
     - `read:jira-user` - Read user info

4. **Get Your Credentials**
   - **Client ID**: Found in "Settings" → "API credentials"
   - **Client Secret**: Found in "Settings" → "API credentials" (click to reveal)

5. **Add to `.env.local`**
   ```env
   JIRA_CLIENT_ID=your_client_id_here
   JIRA_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert Jira integration to OAuth 2.0. Here are my credentials:
JIRA_CLIENT_ID=LnRY7RegM6L1xMnx10bnAxKDXX27ZEVu
JIRA_CLIENT_SECRET=ATOAt2YmfnJ6RQAtnRor-rz_PTfb3223FCJUfaZ26mRbCTV2eynMPi_8YwH3hVJ6CvF87B5D8330

Do the following:
1. Add Jira OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/jira/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/jira/route.ts (OAuth callback route)
4. Create src/lib/integrations/jira.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Jira with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'jira' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'jira' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'jira' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Jira OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Jira OAuth 2.0 (3LO) flow
- Store tokens using storeUserIntegration
- Handle token refresh (Jira tokens expire)
- Keep backward compatibility if possible
```

---

### 8. Salesforce OAuth 2.0

#### Setup Instructions

1. **Go to Salesforce Setup**
   - Visit: https://login.salesforce.com/
   - Log in to your Salesforce account

2. **Create Connected App**
   - Go to Setup → App Manager → New Connected App
   - Fill in:
     - **Connected App Name**: `Runwise`
     - **API Name**: `Runwise`
     - **Contact Email**: Your email

3. **Enable OAuth Settings**
   - Check "Enable OAuth Settings"
   - **Callback URL** (add both):
     - Development: `http://localhost:3000/api/auth/callback/salesforce`
     - Production: `https://runwiseai.app/api/auth/callback/salesforce`
   - **Selected OAuth Scopes** (add these):
     - `Full access (full)`
     - `Perform requests on your behalf at any time (refresh_token, offline_access)`

4. **Get Your Credentials**
   - After saving, find:
     - **Consumer Key**: This is your Client ID
     - **Consumer Secret**: This is your Client Secret (click to reveal)

5. **Add to `.env.local`**
   ```env
   SALESFORCE_CLIENT_ID=your_consumer_key_here
   SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
   ```

#### What to Prompt Me With

```
Convert Salesforce integration to OAuth 2.0. Here are my credentials:
- SALESFORCE_CLIENT_ID: [paste your consumer key]
- SALESFORCE_CLIENT_SECRET: [paste your consumer secret]

Do the following:
1. Add Salesforce OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/salesforce/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/salesforce/route.ts (OAuth callback route)
4. Create src/lib/integrations/salesforce.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Salesforce with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'salesforce' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'salesforce' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'salesforce' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Salesforce OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Salesforce OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle token refresh (Salesforce tokens expire)
- Store instance URL (users may use different Salesforce instances)
- Keep backward compatibility if possible
```

---

### 9. Mailchimp OAuth 2.0

#### Setup Instructions

1. **Go to Mailchimp Developer Portal**
   - Visit: https://developer.mailchimp.com/
   - Log in with your Mailchimp account

2. **Create New App**
   - Go to: https://developer.mailchimp.com/documentation/marketing/guides/how-to-use-oauth2/
   - Or: https://admin.mailchimp.com/account/oauth2/
   - Click "Register Your Application"

3. **Configure OAuth Settings**
   - Fill in:
     - **App name**: `Runwise`
     - **Redirect URI** (add both):
       - Development: `http://localhost:3000/api/auth/callback/mailchimp`
       - Production: `https://runwiseai.app/api/auth/callback/mailchimp`

4. **Get Your Credentials**
   - **Client ID**: Found after creating app
   - **Client Secret**: Found after creating app (click to reveal)

5. **Add to `.env.local`**
   ```env
   MAILCHIMP_CLIENT_ID=your_client_id_here
   MAILCHIMP_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert Mailchimp integration to OAuth 2.0. Here are my credentials:
- MAILCHIMP_CLIENT_ID: [paste your client ID]
- MAILCHIMP_CLIENT_SECRET: [paste your client secret]

Do the following:
1. Add Mailchimp OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/mailchimp/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/mailchimp/route.ts (OAuth callback route)
4. Create src/lib/integrations/mailchimp.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Mailchimp with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'mailchimp' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'mailchimp' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'mailchimp' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Mailchimp OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Mailchimp OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle token refresh if Mailchimp supports it
- Store datacenter/API endpoint (users may be on different datacenters)
- Keep backward compatibility if possible
```

---

### 10. LinkedIn OAuth 2.0

#### Setup Instructions

1. **Go to LinkedIn Developer Portal**
   - Visit: https://www.linkedin.com/developers/
   - Log in with your LinkedIn account

2. **Create New App**
   - Click "Create app"
   - Fill in:
     - **App name**: `Runwise`
     - **LinkedIn Page**: Select or create a LinkedIn page
     - **App use case**: Select appropriate option
     - **App logo**: Upload logo (optional)

3. **Configure OAuth Settings**
   - Go to "Auth" tab
   - **Redirect URLs** (add both):
     - Development: `http://localhost:3000/api/auth/callback/linkedin`
     - Production: `https://runwiseai.app/api/auth/callback/linkedin`
   - **Products** (request access to):
     - `Sign In with LinkedIn using OpenID Connect`
     - `Marketing Developer Platform` (if needed)
   - **Scopes** (select these):
     - `openid` - Basic profile
     - `profile` - Profile information
     - `email` - Email address
     - `w_member_social` - Post updates (if needed)

4. **Get Your Credentials**
   - **Client ID**: Found in "Auth" tab
   - **Client Secret**: Found in "Auth" tab (click to reveal)

5. **Add to `.env.local`**
   ```env
   LINKEDIN_CLIENT_ID=your_client_id_here
   LINKEDIN_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert LinkedIn integration to OAuth 2.0. Here are my credentials:
- LINKEDIN_CLIENT_ID: [paste your client ID]
- LINKEDIN_CLIENT_SECRET: [paste your client secret]

Do the following:
1. Add LinkedIn OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/linkedin/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/linkedin/route.ts (OAuth callback route)
4. Create src/lib/integrations/linkedin.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add LinkedIn with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'linkedin' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'linkedin' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'linkedin' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for LinkedIn OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use LinkedIn OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle token refresh if LinkedIn supports it
- Keep backward compatibility if possible
```

---

### 11. Facebook OAuth 2.0

#### Setup Instructions

1. **Go to Facebook Developers**
   - Visit: https://developers.facebook.com/
   - Log in with your Facebook account

2. **Create New App**
   - Click "My Apps" → "Create App"
   - Choose "Business" or "Consumer" type
   - Fill in:
     - **App name**: `Runwise`
     - **App contact email**: Your email

3. **Add Facebook Login Product**
   - Go to "Add a Product"
   - Find "Facebook Login" and click "Set Up"
   - Choose "Web" platform

4. **Configure OAuth Settings**
   - Go to "Facebook Login" → "Settings"
   - **Valid OAuth Redirect URIs** (add both):
     - Development: `http://localhost:3000/api/auth/callback/facebook`
     - Production: `https://runwiseai.app/api/auth/callback/facebook`
   - **App Domains**: Add `runwiseai.app` (or your domain)

5. **Get Your Credentials**
   - Go to "Settings" → "Basic"
   - **App ID**: This is your Client ID
   - **App Secret**: This is your Client Secret (click to reveal)

6. **Add to `.env.local`**
   ```env
   FACEBOOK_CLIENT_ID=your_app_id_here
   FACEBOOK_CLIENT_SECRET=your_app_secret_here
   ```

#### What to Prompt Me With

```
Convert Facebook integration to OAuth 2.0. Here are my credentials:
- FACEBOOK_CLIENT_ID: [paste your app ID]
- FACEBOOK_CLIENT_SECRET: [paste your app secret]

Do the following:
1. Add Facebook OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/facebook/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/facebook/route.ts (OAuth callback route)
4. Create src/lib/integrations/facebook.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Facebook with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'facebook' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'facebook' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'facebook' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Facebook OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Facebook OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle token refresh (Facebook tokens expire)
- Request appropriate permissions/scopes
- Keep backward compatibility if possible
```

---

### 12. Instagram OAuth 2.0

**Note:** Instagram uses Facebook's OAuth system. You'll use the same Facebook app.

#### Setup Instructions

1. **Use Same Facebook App**
   - Use the Facebook app you created above
   - Go to "Add a Product"
   - Add "Instagram Basic Display" or "Instagram Graph API"

2. **Configure Instagram Settings**
   - For Instagram Basic Display:
     - **Valid OAuth Redirect URIs** (add both):
       - Development: `http://localhost:3000/api/auth/callback/instagram`
       - Production: `https://runwiseai.app/api/auth/callback/instagram`
   - For Instagram Graph API:
     - Use same redirect URIs
     - Request `instagram_basic`, `instagram_content_publish` scopes

3. **Get Your Credentials**
   - Use the same App ID and App Secret from Facebook

4. **Add to `.env.local`**
   ```env
   INSTAGRAM_CLIENT_ID=your_facebook_app_id_here
   INSTAGRAM_CLIENT_SECRET=your_facebook_app_secret_here
   ```

#### What to Prompt Me With

```
Convert Instagram integration to OAuth 2.0. Here are my credentials:
- INSTAGRAM_CLIENT_ID: [paste your Facebook app ID]
- INSTAGRAM_CLIENT_SECRET: [paste your Facebook app secret]

Note: Instagram uses Facebook's OAuth system.

Do the following:
1. Add Instagram OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/instagram/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/instagram/route.ts (OAuth callback route)
4. Create src/lib/integrations/instagram.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Instagram with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'instagram' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'instagram' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'instagram' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Instagram OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Instagram OAuth 2.0 flow (via Facebook)
- Store tokens using storeUserIntegration
- Handle token refresh (Instagram tokens expire)
- Request appropriate Instagram scopes
- Keep backward compatibility if possible
```

---

### 13. Zoom OAuth 2.0

#### Setup Instructions

1. **Go to Zoom Marketplace**
   - Visit: https://marketplace.zoom.us/
   - Log in with your Zoom account

2. **Create New App**
   - Click "Develop" → "Build App"
   - Choose "OAuth" app type
   - Fill in:
     - **App name**: `Runwise`
     - **Company name**: Your company name
     - **Developer contact**: Your email

3. **Configure OAuth Settings**
   - Go to "App Credentials"
   - **Redirect URL for OAuth** (add both):
     - Development: `http://localhost:3000/api/auth/callback/zoom`
     - Production: `https://runwiseai.app/api/auth/callback/zoom`
   - **Scopes** (select these):
     - `meeting:read` - Read meetings
     - `meeting:write` - Create/update meetings
     - `user:read` - Read user info

4. **Get Your Credentials**
   - **Client ID**: Found in "App Credentials"
   - **Client Secret**: Found in "App Credentials" (click to reveal)

5. **Add to `.env.local`**
   ```env
   ZOOM_CLIENT_ID=your_client_id_here
   ZOOM_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert Zoom integration to OAuth 2.0. Here are my credentials:
- ZOOM_CLIENT_ID: [paste your client ID]
- ZOOM_CLIENT_SECRET: [paste your client secret]

Do the following:
1. Add Zoom OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/zoom/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/zoom/route.ts (OAuth callback route)
4. Create src/lib/integrations/zoom.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Zoom with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'zoom' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'zoom' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'zoom' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Zoom OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Zoom OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle token refresh (Zoom tokens expire)
- Keep backward compatibility if possible
```

---

### 14. Microsoft Teams OAuth 2.0

**Note:** Microsoft Teams uses Azure AD (Microsoft Identity Platform) for OAuth.

#### Setup Instructions

1. **Go to Azure Portal**
   - Visit: https://portal.azure.com/
   - Log in with your Microsoft account

2. **Register New Application**
   - Go to "Azure Active Directory" → "App registrations" → "New registration"
   - Fill in:
     - **Name**: `Runwise`
     - **Supported account types**: Choose appropriate (usually "Accounts in any organizational directory and personal Microsoft accounts")
     - **Redirect URI**: 
       - Platform: "Web"
       - URI: `http://localhost:3000/api/auth/callback/microsoft-teams` (add production later)

3. **Configure OAuth Settings**
   - Go to "Authentication"
   - **Redirect URIs** (add both):
     - Development: `http://localhost:3000/api/auth/callback/microsoft-teams`
     - Production: `https://runwiseai.app/api/auth/callback/microsoft-teams`
   - **Implicit grant**: Enable "ID tokens" if needed
   - **API permissions**: Add Microsoft Graph permissions:
     - `User.Read` - Read user profile
     - `Chat.ReadWrite` - Read/write chats
     - `ChannelMessage.ReadWrite` - Read/write channel messages

4. **Get Your Credentials**
   - Go to "Overview"
   - **Application (client) ID**: This is your Client ID
   - Go to "Certificates & secrets" → "New client secret"
   - **Client Secret**: Create and copy (you can only see it once!)

5. **Add to `.env.local`**
   ```env
   MICROSOFT_TEAMS_CLIENT_ID=your_application_id_here
   MICROSOFT_TEAMS_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert Microsoft Teams integration to OAuth 2.0. Here are my credentials:
- MICROSOFT_TEAMS_CLIENT_ID: [paste your application ID]
- MICROSOFT_TEAMS_CLIENT_SECRET: [paste your client secret]

Note: Microsoft Teams uses Azure AD (Microsoft Identity Platform) for OAuth.

Do the following:
1. Add Microsoft Teams OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/microsoft-teams/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/microsoft-teams/route.ts (OAuth callback route)
4. Create src/lib/integrations/microsoft-teams.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Microsoft Teams with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'microsoft-teams' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'microsoft-teams' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'microsoft-teams' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Microsoft Teams OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Microsoft Identity Platform OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle token refresh (Microsoft tokens expire)
- Request appropriate Microsoft Graph scopes
- Keep backward compatibility if possible
```

---

### 15. Dropbox OAuth 2.0

#### Setup Instructions

1. **Go to Dropbox App Console**
   - Visit: https://www.dropbox.com/developers/apps
   - Log in with your Dropbox account

2. **Create New App**
   - Click "Create app"
   - Choose:
     - **API**: "Dropbox API"
     - **Type**: "Full Dropbox" or "App folder"
     - **Name**: `Runwise`

3. **Configure OAuth Settings**
   - Go to "Settings" tab
   - **OAuth 2** section:
     - **Redirect URI** (add both):
       - Development: `http://localhost:3000/api/auth/callback/dropbox`
       - Production: `https://runwiseai.app/api/auth/callback/dropbox`
   - **Scopes** (select these):
     - `files.content.read` - Read file contents
     - `files.content.write` - Write file contents
     - `files.metadata.read` - Read file metadata

4. **Get Your Credentials**
   - **App key**: This is your Client ID
   - **App secret**: This is your Client Secret

5. **Add to `.env.local`**
   ```env
   DROPBOX_CLIENT_ID=your_app_key_here
   DROPBOX_CLIENT_SECRET=your_app_secret_here
   ```

#### What to Prompt Me With

```
Convert Dropbox integration to OAuth 2.0. Here are my credentials:
- DROPBOX_CLIENT_ID: [paste your app key]
- DROPBOX_CLIENT_SECRET: [paste your app secret]

Do the following:
1. Add Dropbox OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/dropbox/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/dropbox/route.ts (OAuth callback route)
4. Create src/lib/integrations/dropbox.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Dropbox with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'dropbox' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'dropbox' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'dropbox' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Dropbox OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Dropbox OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle token refresh if Dropbox supports it
- Keep backward compatibility if possible
```

---

### 16. Spotify OAuth 2.0

#### Setup Instructions

1. **Go to Spotify Developer Dashboard**
   - Visit: https://developer.spotify.com/dashboard
   - Log in with your Spotify account

2. **Create New App**
   - Click "Create app"
   - Fill in:
     - **App name**: `Runwise`
     - **App description**: `Workflow automation platform`
     - **Website**: `https://runwiseai.app`
     - **Redirect URI**: `http://localhost:3000/api/auth/callback/spotify` (add production later)

3. **Configure OAuth Settings**
   - Go to app settings
   - **Redirect URIs** (add both):
     - Development: `http://localhost:3000/api/auth/callback/spotify`
     - Production: `https://runwiseai.app/api/auth/callback/spotify`
   - **Scopes** (select these):
     - `user-read-private` - Read user profile
     - `user-read-email` - Read user email
     - `playlist-read-private` - Read playlists
     - `playlist-modify-public` - Modify playlists

4. **Get Your Credentials**
   - **Client ID**: Found in app overview
   - **Client Secret**: Found in app overview (click to reveal)

5. **Add to `.env.local`**
   ```env
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert Spotify integration to OAuth 2.0. Here are my credentials:
- SPOTIFY_CLIENT_ID: [paste your client ID]
- SPOTIFY_CLIENT_SECRET: [paste your client secret]

Do the following:
1. Add Spotify OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/spotify/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/spotify/route.ts (OAuth callback route)
4. Create src/lib/integrations/spotify.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Spotify with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'spotify' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'spotify' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'spotify' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Spotify OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Spotify OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle token refresh (Spotify tokens expire)
- Keep backward compatibility if possible
```

---

### 17. Figma OAuth 2.0

#### Setup Instructions

1. **Go to Figma Developer Portal**
   - Visit: https://www.figma.com/developers/api#access-tokens
   - Or: https://www.figma.com/developers/apps

2. **Create New App**
   - Go to: https://www.figma.com/developers/apps
   - Click "Create new app"
   - Fill in:
     - **App name**: `Runwise`
     - **Description**: `Workflow automation platform`

3. **Configure OAuth Settings**
   - Go to app settings
   - **Redirect URI** (add both):
     - Development: `http://localhost:3000/api/auth/callback/figma`
     - Production: `https://runwiseai.app/api/auth/callback/figma`
   - **Scopes** (select these):
     - `file_read` - Read files
     - `file_write` - Write files

4. **Get Your Credentials**
   - **Client ID**: Found in app settings
   - **Client Secret**: Found in app settings (click to reveal)

5. **Add to `.env.local`**
   ```env
   FIGMA_CLIENT_ID=your_client_id_here
   FIGMA_CLIENT_SECRET=your_client_secret_here
   ```

#### What to Prompt Me With

```
Convert Figma integration to OAuth 2.0. Here are my credentials:
- FIGMA_CLIENT_ID: [paste your client ID]
- FIGMA_CLIENT_SECRET: [paste your client secret]

Do the following:
1. Add Figma OAuth config functions to src/lib/integrations/oauth.ts
2. Create src/app/api/auth/connect/figma/route.ts (OAuth initiation route)
3. Create src/app/api/auth/callback/figma/route.ts (OAuth callback route)
4. Create src/lib/integrations/figma.ts if it doesn't exist, or update existing to use OAuth tokens
5. Update src/components/ui/workflow-node-library.tsx to add Figma with credentialType 'oauth'
6. Update src/components/ui/integrations-settings.tsx to add 'figma' to oauthServices array
7. Update src/app/integrations/page.tsx to add 'figma' to oauthServices array
8. Update src/app/api/integrations/disconnect/route.ts to add 'figma' to oauthServices array
9. Update src/app/api/integrations/status/route.ts to check for Figma OAuth integration
10. Update src/lib/integrations/service.ts integrationNameMap

Make sure to:
- Use Figma OAuth 2.0 flow
- Store tokens using storeUserIntegration
- Handle token refresh if Figma supports it
- Keep backward compatibility if possible
```

---

## What to Prompt Me With

After setting up each integration's OAuth app and adding credentials to `.env.local`, use the prompts provided in each integration's section above. Each prompt follows this pattern:

1. States which integration to convert
2. Provides credentials (Client ID and Client Secret)
3. Lists all files that need to be created/modified
4. Includes specific requirements for that service

**Important:** Always:
- Restart your dev server after adding new environment variables
- Test the OAuth flow after I implement it
- Check that tokens are stored correctly
- Verify disconnect works

---

## Testing Your Integrations

After I implement each integration, test:

1. **Connection Flow**
   - Go to integrations page
   - Click "Connect" on the integration
   - Should redirect to service's OAuth page
   - Authorize the connection
   - Should redirect back and show success message
   - Integration should appear in "Configured Integrations"

2. **Token Storage**
   - Check database to verify tokens are stored
   - Tokens should be encrypted in `user_integrations` table

3. **API Calls**
   - Test that workflow nodes can use the integration
   - Verify API calls work with OAuth tokens

4. **Disconnect**
   - Click "Disconnect" on the integration
   - Should remove from "Configured Integrations"
   - Should reappear in "Discover Integrations"

5. **Reconnect**
   - Connect again after disconnecting
   - Should work without issues

---

## Common Issues & Solutions

### Issue: "Invalid redirect URI"
**Solution:** Make sure the redirect URI in your OAuth app matches exactly what's in the code (including `http://` vs `https://`)

### Issue: "Invalid client credentials"
**Solution:** 
- Check that environment variables are set correctly
- Restart your dev server after adding env variables
- Verify Client ID and Secret are correct (no extra spaces)

### Issue: "State mismatch" or "CSRF error"
**Solution:** This is normal security - just try connecting again. The state token expires after 10 minutes.

### Issue: Tokens not refreshing
**Solution:** Some services don't provide refresh tokens. Check the service's documentation for token expiration policies.

---

## Quick Reference: Environment Variables

After setting up all integrations, your `.env.local` should have:

```env
# Existing
GOOGLE_INTEGRATION_CLIENT_ID=...
GOOGLE_INTEGRATION_CLIENT_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# New OAuth Integrations
AIRTABLE_CLIENT_ID=...
AIRTABLE_CLIENT_SECRET=...
TRELLO_API_KEY=...
TRELLO_CLIENT_SECRET=...
STRIPE_CLIENT_ID=...
STRIPE_CLIENT_SECRET=...
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
HUBSPOT_CLIENT_ID=...
HUBSPOT_CLIENT_SECRET=...
ASANA_CLIENT_ID=...
ASANA_CLIENT_SECRET=...
JIRA_CLIENT_ID=...
JIRA_CLIENT_SECRET=...
SALESFORCE_CLIENT_ID=...
SALESFORCE_CLIENT_SECRET=...
MAILCHIMP_CLIENT_ID=...
MAILCHIMP_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
MICROSOFT_TEAMS_CLIENT_ID=...
MICROSOFT_TEAMS_CLIENT_SECRET=...
DROPBOX_CLIENT_ID=...
DROPBOX_CLIENT_SECRET=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
FIGMA_CLIENT_ID=...
FIGMA_CLIENT_SECRET=...
```

---

## Next Steps

1. **Start with one integration** - Don't try to do all at once. Start with Airtable or Trello.
2. **Follow the guide** - Use the step-by-step instructions for that integration.
3. **Get credentials** - Set up the OAuth app and get your Client ID and Secret.
4. **Add to .env.local** - Add the credentials to your environment file.
5. **Prompt me** - Use the exact prompt template for that integration.
6. **Test** - After I implement it, test the full flow.
7. **Repeat** - Move on to the next integration.

Good luck! 🚀

