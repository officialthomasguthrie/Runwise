# Web Search & Read URL Tools Setup

## Web Search (Serper API)

The agent `web_search` tool uses [Serper](https://serper.dev) to run Google searches via API. Serper returns organic results, knowledge graph, and answer box data.

### Get an API Key

1. Go to [serper.dev](https://serper.dev)
2. Sign up for an account
3. Create an API key from the dashboard
4. Free tier includes 2,500 searches/month

### Environment Variable

Add to `.env.local`:

```
SERPER_API_KEY=your_serper_api_key_here
```

If `SERPER_API_KEY` is not set, the agent will surface a clear error when `web_search` is called.

### Usage

The agent can call `web_search` with:

- **query** (required): Search string
- **numResults** (optional): Number of results (1–20, default 10)

Results include titles, links, snippets, optional knowledge graph, and answer box.

---

## Read URL

The agent `read_url` tool fetches and parses content from any public URL. No API key required.

### What It Does

- **HTML pages**: Strips tags and returns readable plain text
- **JSON responses**: Parses and returns formatted JSON
- **Plain text**: Returns as-is
- **Limits**: 1MB max response size, 15s timeout, optional `maxChars` (1–100k, default 30k) to avoid token limits

### Usage

The agent can call `read_url` with:

- **url** (required): Full http(s) URL to fetch
- **maxChars** (optional): Max characters to return (1–100000, default 30000)

Use with `web_search` to read pages found in search results.
