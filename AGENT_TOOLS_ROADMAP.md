# Top 50 Agent Tools Roadmap

A prioritised list of the most useful tools to add to Runwise agents. Organised by category.  
**Already implemented**: Gmail (send/read), Slack, Discord, Notion, Google Sheets, Google Calendar, **Google Drive** (list, upload, share, create folder, get metadata, read file, search), **Airtable** (create, update, list, get record), **GitHub** (create issue, list issues, add comment), **Stripe** (list customers, get customer, create invoice, get subscription, list subscriptions), Twitter/X, **`web_search`** (Serper API), **`read_url`** (fetch & parse URL content), **`get_current_time`** (current time, timezone conversion), `http_request`, memory (remember/recall), `send_notification_to_user`, `do_nothing`.

---

## Tier 1 — High Impact (Add First)

| # | Tool | Type | Description | Why |
|---|------|------|--------------|-----|
| 1 | **Twitter/X** — `post_tweet`, `search_tweets`, `get_user_tweets` | Integration | Post tweets, search, fetch user timelines | Social presence, monitoring, engagement. Twitter lib already exists. |
| 2 | **Google Drive** — `list_drive_files`, `upload_to_drive`, `share_drive_file`, `create_drive_folder`, `get_drive_file_metadata`, `read_drive_file`, `search_drive_files` | Integration | **DONE** — List, upload, share, create folders, metadata, read, search | Often used with Sheets/Calendar. High overlap with Gmail users. |
| 3 | **Airtable** — `create_airtable_record`, `update_airtable_record`, `list_airtable_records`, `get_airtable_record` | Integration | **DONE** — Create, update, list, get records | Flexible databases, popular with small teams. |
| 4 | **GitHub** — `create_github_issue`, `list_github_issues`, `add_github_comment` | Integration | **DONE** — Create/list issues, add comments | Dev workflows, bug tracking, project coordination. |
| 5 | **Stripe** — `list_stripe_customers`, `get_stripe_customer`, `create_stripe_invoice`, `get_stripe_subscription`, `list_stripe_subscriptions` | Integration | **DONE** — List/get customers, create invoice, get/list subscriptions | Billing, subscriptions, revenue visibility. |
| 6 | **`run_script`** — Execute user-defined scripts (sandboxed) | Generic | Run JS/Python in isolated runtime | Dynamic logic, data transforms, custom APIs. |
| 7 | **`web_search`** — Search the web | Generic | **DONE** — Serper API (Google results) | Research, facts, real-time info. |
| 8 | **`send_sms`** (Twilio) | Integration | Send SMS via Twilio | Alerts, 2FA, critical notifications. |
| 9 | **`get_current_time`** / `get_timezone` | Generic | **DONE** — Current time, IANA timezone, conversion | Scheduling, reminders, date logic. |
| 10 | **`read_url`** — Fetch and parse URL content | Generic | **DONE** — GET URL, HTML→text, JSON support | Scraping, link previews, external data. |

---

## Tier 2 — Communication & Collaboration

| # | Tool | Type | Description | Why |
|---|------|------|--------------|-----|
| 11 | **Microsoft Teams** — `send_message`, `list_channels` | Integration | Post to Teams channels | Enterprise comms, hybrid teams. |
| 12 | **SendGrid** — `send_email_transactional` | Integration | Send transactional email | Newsletters, alerts, marketing flows. |
| 13 | **Slack** — `list_channels`, `create_channel`, `add_reaction` | Integration | Extend Slack beyond post | Discovery, channel setup, reactions. |
| 14 | **`send_email` (generic SMTP)** | Generic | Send via any SMTP/SendGrid | Backup when Gmail not connected. |
| 15 | **Zoom** — `create_meeting`, `list_meetings` | Integration | Create/list Zoom meetings | Scheduling, links for calendar. |
| 16 | **Cal.com / Calendly** — `get_availability`, `create_booking` | Integration | Availability and bookings | Scheduling without back-and-forth. |
| 17 | **Linear** — `create_issue`, `update_issue`, `list_issues` | Integration | Issue tracking for eng teams | Modern alternative to Jira. |
| 18 | **`format_date`** | Generic | Format/parse dates | Consistent date handling across tools. |

---

## Tier 3 — CRM, Sales & Marketing

| # | Tool | Type | Description | Why |
|---|------|------|--------------|-----|
| 19 | **HubSpot** — `create_contact`, `create_deal`, `log_activity` | Integration | CRM operations | Sales, marketing, support flows. |
| 20 | **Salesforce** — `create_lead`, `update_opportunity` | Integration | Basic CRM ops | Enterprise sales automation. |
| 21 | **Intercom** — `send_message`, `create_conversation` | Integration | Customer messaging | Support, onboarding, engagement. |
| 22 | **LinkedIn** — `post_content`, `send_inmail` (if API allows) | Integration | Professional network | B2B, recruiting, thought leadership. |
| 23 | **Mailchimp** — `add_subscriber`, `create_campaign` | Integration | Email marketing | Newsletters, drip campaigns. |
| 24 | **`parse_json`** / `parse_csv` | Generic | Parse structured data | Clean data from http_request, sheets, etc. |
| 25 | **`generate_qr_code`** | Generic | Create QR code image | Events, links, payments. |

---

## Tier 4 — Productivity & Docs

| # | Tool | Type | Description | Why |
|---|------|------|--------------|-----|
| 26 | **Notion** — `search_pages`, `update_page`, `query_database` | Integration | Extend Notion beyond create | Full Notion automation. |
| 27 | **Google Docs** — `create_doc`, `append_text` | Integration | Create/edit docs | Reports, templates, content. |
| 28 | **Confluence** — `create_page`, `search` | Integration | Wiki/Knowledge base | Enterprise documentation. |
| 29 | **Dropbox** — `upload_file`, `list_folder`, `share_link` | Integration | File storage | Sharing, backups. |
| 30 | **Trello** — `create_card`, `move_card`, `add_comment` | Integration | Board automation | Kanban, project tracking. |
| 31 | **Asana** — `create_task`, `update_task`, `list_tasks` | Integration | Task management | Project workflows. |
| 32 | **`write_file`** / **`read_file`** (local/workspace) | Generic | Read/write files in agent workspace | Data persistence, exports. |
| 33 | **`generate_pdf`** | Generic | Create PDF from text/HTML | Reports, invoices, documents. |

---

## Tier 5 — Dev & Data

| # | Tool | Type | Description | Why |
|---|------|------|--------------|-----|
| 34 | **Jira** — `create_issue`, `transition_issue`, `add_comment` | Integration | Atlassian Jira | Enterprise dev workflows. |
| 35 | **Vercel / Netlify** — `list_deployments`, `trigger_deploy` | Integration | Deployment status/trigger | DevOps, staging checks. |
| 36 | **Supabase** — `query`, `insert`, `update` (user DB) | Integration | SQL on user’s Supabase | Flexible data layer. |
| 37 | **`run_sql`** (sandboxed, read-only by default) | Generic | Execute SQL on provided connection | Ad-hoc queries, reports. |
| 38 | **`encode_base64`** / **`decode_base64`** | Generic | Encode/decode base64 | Images, binaries, APIs. |
| 39 | **`hash_value`** (SHA256, etc.) | Generic | Hash strings | Checksums, security. |
| 40 | **`delay`** | Generic | Sleep for N seconds | Rate limiting, polling delays. |

---

## Tier 6 — Utility & Polish

| # | Tool | Type | Description | Why |
|---|------|------|--------------|-----|
| 41 | **`translate_text`** (Google Translate / DeepL API) | Generic | Translate text | Multilingual support. |
| 42 | **`generate_image`** (DALL·E / Stable Diffusion) | Generic | Create images from prompt | Visual content, thumbnails. |
| 43 | **`summarize_text`** | Generic | Condense long text | Emails, docs, articles. |
| 44 | **`extract_entities`** | Generic | Extract names, dates, URLs | Structured extraction from text. |
| 45 | **PayPal** — `create_invoice`, `get_transaction` | Integration | Payments | Alternative to Stripe. |
| 46 | **Shopify** — `get_order`, `update_product`, `create_draft` | Integration | E‑commerce | Store operations. |
| 47 | **`list_user_integrations`** | Generic | Return connected services | Agent can adapt to available tools. |
| 48 | **`validate_email`** / **`validate_url`** | Generic | Validate email or URL format | Data quality, sanity checks. |
| 49 | **`schedule_follow_up`** | Generic | Queue a delayed/rerun | “Remind me in 2 days”, deferred work. |
| 50 | **`ask_user`** (when async) | Generic | Request input from user | Clarification, approvals, choices. |

---

## Implementation Priorities

**Quick wins (existing integration code):**

- Twitter/X — `twitter.ts` exists  
- GitHub, Discord — partial coverage  
- Twilio (SMS), SendGrid — connection schemas exist  

**Generic tools (no new OAuth):**

- `web_search`, `read_url`, `get_current_time`  
- `parse_json`, `format_date`  
- `encode_base64`, `hash_value`, `delay`  

**High-effort, high-value:**

- `run_script` (sandboxing, security)  
- `run_sql` (connection mgmt, read-only)  
- `generate_pdf`, `generate_image`  

**Dependency on third‑party APIs:**

- `web_search` — Bing, Google, or Searx  
- `translate_text` — Google Translate or DeepL  
- `generate_image` — DALL·E, Replicate, or similar  

---

## Notes

- **OAuth integrations** require full OAuth flow, credential storage, and token refresh.
- **API-key integrations** (e.g. Stripe, Twilio) can use a generic credential store.
- **Generic tools** reduce the need to add a new integration per service.
- `http_request` already covers many APIs; adding dedicated tools improves UX and lets you inject credentials safely.
