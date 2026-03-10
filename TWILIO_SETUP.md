# Twilio (SMS) Integration Setup

The `send_sms` agent tool uses Twilio to send SMS. No environment variables needed — credentials are per-user.

## 1. Twilio Account

1. Sign up at [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Get an Account SID and Auth Token from [Twilio Console](https://console.twilio.com/)
3. Purchase or use a trial phone number (required for `from`)

## 2. Connect in Runwise

1. Go to **Integrations** → **Twilio** → **Connect**
2. Enter **Account SID** and **Auth Token**
3. Save

## 3. Agent Tool Usage

The agent calls `send_sms` with:

- **to** (required): Recipient phone in E.164 format (e.g. `+1234567890`)
- **from** (required): Your Twilio phone number in E.164 (e.g. `+1234567890`)
- **body** (required): Message text (max 1600 chars)

The user must provide their Twilio `from` number in agent instructions or the agent must ask when needed. Example: "When sending SMS, use +1XXXXXXXXXX as the from number."

## What's Implemented

- **Credential storage** — Account SID and Auth Token per user
- **Agent tool** — `send_sms` (to, from, body)
- **Agent builder** — "SMS", "text message", "Twilio" trigger Twilio requirement
- **Workflow node** — `send-sms-via-twilio` for workflows
