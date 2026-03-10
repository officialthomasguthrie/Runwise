# Web Search Tool Setup (Serper API)

The agent `web_search` tool uses [Serper](https://serper.dev) to run Google searches via API. Serper returns organic results, knowledge graph, and answer box data.

## Get an API Key

1. Go to [serper.dev](https://serper.dev)
2. Sign up for an account
3. Create an API key from the dashboard
4. Free tier includes 2,500 searches/month

## Environment Variable

Add to `.env.local`:

```
SERPER_API_KEY=your_serper_api_key_here
```

If `SERPER_API_KEY` is not set, the agent will surface a clear error when `web_search` is called.

## Usage

The agent can call `web_search` with:

- **query** (required): Search string
- **numResults** (optional): Number of results (1–20, default 10)

Results include titles, links, snippets, optional knowledge graph, and answer box.
