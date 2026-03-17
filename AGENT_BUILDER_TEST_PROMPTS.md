# Agent Builder — Test Prompts & Expected Behaviour

A reference for manually QA-ing the agent builder. Each prompt covers a specific capability, trigger type, or edge case. Run these in the agent builder chat to verify correct feasibility checking, planning, and plan output.

---

## How to Read This Doc

For each test:
- **Prompt** — what to type in the agent builder
- **Expected: Feasible?** — should the builder accept or reject this?
- **Expected trigger** — which trigger type the plan should produce
- **Expected tools** — key tools the instructions/plan should reference
- **What to check** — specific things to verify in the output

---

## ✅ SHOULD BE ACCEPTED (Feasible)

---

### 1. Competitor Monitoring (Web Search + Schedule)

**Prompt:**
> Monitor my competitors and alert me when they launch new features or campaigns.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `schedule` or `heartbeat` (e.g. daily)  
**Expected tools:** `web_search`, `read_url`, `send_notification_to_user` or `send_slack_message`  
**What to check:**
- Should NOT be rejected
- Plan should have a behaviour with `behaviourType: "schedule"` or `"heartbeat"`
- Instructions should mention using web search to find competitor news
- Should suggest alerting via Slack or email

---

### 2. Email Auto-Reply (Gmail Trigger)

**Prompt:**
> Watch my Gmail inbox and automatically reply to any email about pricing with a standard response.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `new-email-received` (google-gmail)  
**Expected tools:** `send_email_gmail` (with `replyToThread: "yes"`)  
**What to check:**
- `behaviourType: "polling"`, `triggerType: "new-email-received"`
- Instructions mention reading email content and replying in-thread
- Memory or instructions store the standard pricing response

---

### 3. Daily Morning Briefing (Schedule, No Integration)

**Prompt:**
> Every morning at 8am, send me a daily briefing with top news in AI and my top 3 priorities.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `schedule` with cron `"0 8 * * *"`  
**Expected tools:** `web_search`, `recall`, `send_notification_to_user` or `send_slack_message` or `send_email_gmail`  
**What to check:**
- `scheduleCron` should be `"0 8 * * *"` (or close equivalent)
- No integration required for schedule — should work even with no connected accounts
- Instructions should mention searching for AI news

---

### 4. GitHub Issue Triage (GitHub Trigger)

**Prompt:**
> When a new GitHub issue is opened in my repo, analyse it, add a comment suggesting a fix, and label it.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `new-github-issue` (github)  
**Expected tools:** `add_github_comment`, `create_github_issue` (or label via API), `http_request`  
**What to check:**
- `triggerType: "new-github-issue"`
- Instructions describe reading issue and composing a helpful reply
- `add_github_comment` mentioned for posting the response

---

### 5. Slack Summariser (Slack Trigger)

**Prompt:**
> Watch my Slack channel #general and every hour summarise the last hour of messages and post the summary back.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `schedule` (hourly) — note: Slack trigger watches for new messages, but summarising over time uses a schedule  
**Expected tools:** `send_slack_message`, `remember` / `recall`  
**What to check:**
- Hourly cron `"0 * * * *"`
- Instructions reference reading Slack messages and posting a summary
- May also accept `new-message-in-slack` trigger with memory-based accumulation — both valid

---

### 6. Google Sheets Lead Ingestion (Sheets Trigger)

**Prompt:**
> When a new row is added to my Google Sheet of leads, send them a welcome email from Gmail and add them to Notion.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `new-row-in-google-sheet` (google-sheets)  
**Expected tools:** `send_email_gmail`, `create_notion_page`  
**What to check:**
- `triggerType: "new-row-in-google-sheet"`
- Instructions reference reading columns (name, email) from the new row
- Both Gmail send and Notion page creation mentioned

---

### 7. Webhook-triggered Agent (No Integration)

**Prompt:**
> When someone submits my contact form (webhook), send me a Slack notification and add their details to my Airtable CRM.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `webhook`  
**Expected tools:** `send_slack_message`, `create_airtable_record`  
**What to check:**
- `behaviourType: "webhook"`
- `config.path` set to something like `"contact-form"` or similar
- No trigger type needed (webhook has no `triggerType`)

---

### 8. Stripe Payment Monitor (Schedule + Stripe)

**Prompt:**
> Every day at 6pm check for any overdue Stripe invoices and send me an email summary.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `schedule` with cron `"0 18 * * *"`  
**Expected tools:** `list_stripe_customers`, `list_stripe_subscriptions`, `send_email_gmail`  
**What to check:**
- Stripe tools are referenced in instructions
- Daily cron at 6pm
- Email used for delivery

---

### 9. Twitter/X Mention Monitor (Schedule + Twitter)

**Prompt:**
> Search Twitter every 30 minutes for mentions of my brand "Runwise" and notify me on Slack with any new tweets.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `schedule` (every 30 min: `"*/30 * * * *"`)  
**Expected tools:** `search_tweets`, `send_slack_message`, `remember` / `recall`  
**What to check:**
- `search_tweets` mentioned in instructions
- `remember` used to track already-seen tweet IDs
- Correct cron expression

---

### 10. Google Drive File Processor (Drive Trigger)

**Prompt:**
> When a new file is uploaded to my Google Drive folder, read it, summarise its content, and post the summary to my Slack.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `file-uploaded` (google-drive)  
**Expected tools:** `read_drive_file`, `send_slack_message`  
**What to check:**
- `triggerType: "file-uploaded"`
- Instructions reference reading the file content and summarising
- Slack used for delivery

---

### 11. Market Research Agent (Web Search, No Integration)

**Prompt:**
> I want an agent that researches the latest trends in electric vehicles each week and emails me a report.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `schedule` (weekly, e.g. `"0 9 * * 1"` — Monday 9am)  
**Expected tools:** `web_search`, `read_url`, `send_email_gmail`  
**What to check:**
- Weekly cron
- `web_search` + `read_url` used to gather research
- Compiled report sent via email

---

### 12. Calendar Event Auto-Creator (Forms Trigger)

**Prompt:**
> When someone submits my booking form on Google Forms, create a Google Calendar event for the meeting.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `new-form-submission` (google-forms)  
**Expected tools:** `create_calendar_event`  
**What to check:**
- `triggerType: "new-form-submission"`
- Instructions reference parsing name, date, time from form response
- `create_calendar_event` used

---

### 13. Airtable CRM Updater (Airtable Trigger)

**Prompt:**
> When a new record appears in my Airtable CRM, look up the company on the web, add enrichment notes, and update the record.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `new-airtable-record` (airtable)  
**Expected tools:** `web_search`, `read_url`, `update_airtable_record`  
**What to check:**
- `triggerType: "new-airtable-record"`
- `web_search` + `read_url` used for company research
- `update_airtable_record` used to write enrichment back

---

### 14. SMS Alert Agent (Twilio, Schedule)

**Prompt:**
> Every Friday at 5pm, send me an SMS summary of this week's activity via Twilio.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `schedule` with cron `"0 17 * * 5"` (Friday 5pm)  
**Expected tools:** `send_sms`, `recall`  
**What to check:**
- `send_sms` referenced in instructions
- Correct cron expression for Friday 5pm
- `recall` used to gather weekly summary from memory

---

### 15. Manual / No Trigger Agent (Chat-Only)

**Prompt:**
> I want an assistant that helps me draft emails. I'll ask it to write emails for me whenever I need one.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** None (manual-only)  
**Expected tools:** `send_email_gmail` (optional), `remember`  
**What to check:**
- `behaviours: []` — no trigger, manual-only agent
- Instructions describe the email drafting persona
- Agent should have a clear persona and writing style

---

## ❌ SHOULD BE REJECTED (Infeasible)

---

### 16. Microsoft Teams Integration

**Prompt:**
> Watch my Microsoft Teams channel and summarise all messages each morning.

**Expected: Feasible?** ❌ No  
**Expected rejection reason:** "We don't support Microsoft Teams yet."  
**What to check:**
- Hard rejection — no plan generated
- Friendly error message mentioning Teams is not supported
- Does NOT ask clarifying questions before rejecting

---

### 17. Jira Issue Agent

**Prompt:**
> Create a Jira issue automatically whenever a bug is reported in my Slack channel.

**Expected: Feasible?** ❌ No  
**Expected rejection reason:** "We don't support Jira yet."  
**What to check:**
- Rejected deterministically (programmatic layer)
- Note: Slack trigger itself is fine — the rejection is specifically because Jira creation is unsupported

---

### 18. Zoom Meeting Agent

**Prompt:**
> Book a Zoom meeting when someone emails me requesting a call.

**Expected: Feasible?** ❌ No  
**Expected rejection reason:** "We don't support Zoom yet."  
**What to check:**
- Rejected on "Zoom integration" pattern
- Note: the email trigger is fine — Zoom booking API is what's unsupported

---

---

## ⚠️ EDGE CASES — Should Be Accepted (Tricky)

---

### 19. Ambiguous "Monitor" Request (No Explicit Tool)

**Prompt:**
> Monitor my competitors' websites daily and alert me if their pricing page changes.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `schedule` (daily)  
**Expected tools:** `read_url`, `remember`, `send_notification_to_user`  
**What to check:**
- `read_url` used to fetch pricing pages
- `remember` used to store last-seen page content (change detection via comparison)
- No rejection — this is fully achievable with our tools

---

### 20. Multi-Step Compound Agent

**Prompt:**
> When a new lead fills out my Google Form, (1) send them a welcome email, (2) add them to my Airtable CRM, (3) post a notification in Slack, and (4) schedule a Google Calendar follow-up for 3 days later.

**Expected: Feasible?** ✅ Yes  
**Expected trigger:** `new-form-submission` (google-forms)  
**Expected tools:** `send_email_gmail`, `create_airtable_record`, `send_slack_message`, `create_calendar_event`, `get_current_time`  
**What to check:**
- Single behaviour with `triggerType: "new-form-submission"`
- Instructions enumerate all 4 steps in order
- `get_current_time` used to calculate the follow-up date (now + 3 days)
- `create_calendar_event` used for the follow-up

---

## Summary Table

| # | Prompt Summary | Should Accept | Trigger Type | Key Tools |
|---|---|---|---|---|
| 1 | Monitor competitors | ✅ | schedule | web_search, read_url, notify |
| 2 | Email auto-reply | ✅ | new-email-received | send_email_gmail |
| 3 | Daily morning briefing | ✅ | schedule | web_search, notify |
| 4 | GitHub issue triage | ✅ | new-github-issue | add_github_comment |
| 5 | Slack hourly summary | ✅ | schedule | send_slack_message, recall |
| 6 | Sheets lead → email + Notion | ✅ | new-row-in-google-sheet | send_email_gmail, create_notion_page |
| 7 | Webhook → Slack + Airtable | ✅ | webhook | send_slack_message, create_airtable_record |
| 8 | Stripe invoice monitor | ✅ | schedule | list_stripe_subscriptions, send_email_gmail |
| 9 | Twitter mention monitor | ✅ | schedule | search_tweets, send_slack_message |
| 10 | Drive file summariser | ✅ | file-uploaded | read_drive_file, send_slack_message |
| 11 | EV market research | ✅ | schedule | web_search, read_url, send_email_gmail |
| 12 | Forms → Calendar event | ✅ | new-form-submission | create_calendar_event |
| 13 | Airtable + web enrichment | ✅ | new-airtable-record | web_search, update_airtable_record |
| 14 | SMS weekly summary | ✅ | schedule | send_sms, recall |
| 15 | Manual email assistant | ✅ | none | send_email_gmail, remember |
| 16 | Microsoft Teams | ❌ | — | Not supported |
| 17 | Jira issue creation | ❌ | — | Not supported |
| 18 | Zoom meeting booking | ❌ | — | Not supported |
| 19 | Competitor pricing change | ✅ | schedule | read_url, remember, notify |
| 20 | Multi-step lead pipeline | ✅ | new-form-submission | email, airtable, slack, calendar |
