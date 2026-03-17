# Google Drive Agent Tools Setup

Google Drive is fully integrated as an agent tool. It uses the same Google OAuth credentials as Gmail, Sheets, and Calendar.

## 1. Environment Variables

Ensure these are in your `.env.local` (same as other Google integrations):

```env
GOOGLE_INTEGRATION_CLIENT_ID=your_client_id
GOOGLE_INTEGRATION_CLIENT_SECRET=your_client_secret
```

## 2. Enable Google Drive API

In [Google Cloud Console](https://console.cloud.google.com):

1. Select your project
2. Enable **Google Drive API** (APIs & Services → Library → Google Drive API → Enable)
3. In OAuth consent screen, the `drive` scope will be requested when users connect

## 3. Connect Google Drive

Users connect via **Integrations** → **Google Drive**. The OAuth flow requests full Drive access (`drive` + `drive.file`).

**Note**: If users already have Gmail, Sheets, or Calendar connected, they may need to reconnect to grant the new Drive scopes. The integration record is shared across Google services.

## Agent Tools Implemented

| Tool | Description |
|------|-------------|
| `list_drive_files` | List files/folders in a folder or root. Optional query, orderBy, maxResults. |
| `upload_to_drive` | Upload a file (text or base64). Params: fileName, mimeType, content, parentFolderId, isBase64. |
| `share_drive_file` | Share a file with someone by email. Params: fileId, emailAddress, role (reader/writer/commenter), message. |
| `create_drive_folder` | Create a new folder. Params: folderName, parentFolderId. |
| `get_drive_file_metadata` | Get file metadata (name, size, mimeType, webViewLink, etc.). |
| `read_drive_file` | Read text files, CSV, JSON. Exports Google Docs/Sheets as plain text/CSV. |
| `search_drive_files` | Search Drive by query (e.g. "name contains 'report'", "mimeType='application/pdf'"). |

## Keyword Detection

The agent builder detects "google drive", "drive file", etc. and prompts users to connect Google Drive when building agents that use it.
