# GitHub Agent Tools Setup

GitHub is fully integrated as an agent tool. Supports both OAuth and Personal Access Token.

## 1. Environment Variables (OAuth)

Add these to your `.env.local` for OAuth:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

Get these from [GitHub Developer Settings](https://github.com/settings/developers) when you create an OAuth App.

**Alternative**: Users can connect via Personal Access Token (credential) — no env vars required for that path.

## 2. OAuth Callback URLs

In your GitHub OAuth App settings, add:

- Production: `https://runwiseai.app/api/auth/callback/github`
- Local: `http://localhost:3000/api/auth/callback/github`

## 3. OAuth Scopes

For full issue/comment access (including private repos), the OAuth app should request:

- `repo` — Full control of private repositories

For public repos only:

- `public_repo` — Access public repositories

## 4. Connect GitHub

Users connect via **Integrations** → **GitHub**.

## Agent Tools Implemented

| Tool | Description |
|------|-------------|
| `create_github_issue` | Create a new issue. Params: owner, repo, title, body (optional), labels (optional array). |
| `list_github_issues` | List issues in a repo. Params: owner, repo, state (open/closed/all), maxResults (optional). |
| `add_github_comment` | Add a comment to an issue or PR. Params: owner, repo, issueNumber, body. |

## Keyword Detection

The agent builder detects "github", "pull request", "issue" and prompts users to connect when building agents that use it.
