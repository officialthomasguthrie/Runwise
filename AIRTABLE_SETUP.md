# Airtable Agent Tools Setup

Airtable is fully integrated as an agent tool. Supports both OAuth (preferred) and Personal Access Token.

## 1. Environment Variables

Add these to your `.env.local` for OAuth:

```env
AIRTABLE_CLIENT_ID=your_client_id
AIRTABLE_CLIENT_SECRET=your_client_secret
```

Get these from [Airtable Developer Hub](https://airtable.com/create/oauth) when you create an OAuth integration.

**Alternative**: Users can connect via a Personal Access Token ( credential ) instead of OAuth — no env vars required for that path.

## 2. OAuth Callback URLs

In your Airtable OAuth app settings, add:

- Production: `https://runwiseai.app/api/auth/callback/airtable`
- Local: `http://localhost:3000/api/auth/callback/airtable`

## 3. Connect Airtable

Users connect via **Integrations** → **Airtable**. OAuth requests scopes: `data.records:read`, `data.records:write`, `schema.bases:read`.

## Agent Tools Implemented

| Tool | Description |
|------|-------------|
| `create_airtable_record` | Create a new record. Params: baseId, tableId, fields (object). |
| `update_airtable_record` | Update an existing record. Params: baseId, tableId, recordId, fields. |
| `list_airtable_records` | List records with optional maxRecords, view, filterByFormula, sort. |
| `get_airtable_record` | Get a single record by ID. Params: baseId, tableId, recordId. |

## Base ID and Table ID

- **Base ID**: From the Airtable base URL: `https://airtable.com/appXXXXXXXXXXXXXX/...` → `appXXXXXXXXXXXXXX`
- **Table ID**: Either the table name (e.g. "Tasks") or the table ID from the API (e.g. "tblXXXXXXXXXXXXXX")

## Keyword Detection

The agent builder detects "airtable" and prompts users to connect when building agents that use it.
