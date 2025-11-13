# Node Library System

This directory contains the complete node library system with 30 pre-built workflow nodes.

## Structure

- **`types.ts`**: Type definitions for nodes, schemas, and execution context
- **`registry.ts`**: Complete registry of all 30 nodes with execution code
- **`index.ts`**: Central export point

## Available Nodes

### Action Nodes (10)
1. **Send Email** - Sends emails via SendGrid/SMTP
2. **Create Notion Page** - Creates pages in Notion databases
3. **Post to Slack Channel** - Posts messages to Slack
4. **Add Row to Google Sheet** - Adds data rows to Google Sheets
5. **Send Discord Message** - Sends messages via Discord webhooks
6. **Create Trello Card** - Creates cards in Trello boards
7. **Update Airtable Record** - Updates Airtable records
8. **Create Calendar Event** - Creates Google Calendar events
9. **Send SMS via Twilio** - Sends SMS messages
10. **Upload File to Google Drive** - Uploads files to Google Drive

### Trigger Nodes (10)
1. **New Form Submission** - Triggers on Google Form submissions
2. **New Email Received** - Triggers on new Gmail messages
3. **New Row in Google Sheet** - Triggers when rows are added
4. **New Message in Slack** - Triggers on Slack messages
5. **New Discord Message** - Triggers on Discord webhook messages
6. **Scheduled Time Trigger** - Cron-based scheduled triggers
7. **Webhook Trigger** - Generic webhook endpoint trigger
8. **New GitHub Issue** - Triggers on GitHub issue creation
9. **Payment Completed** - Triggers on payment webhooks
10. **File Uploaded** - Triggers on Google Drive file uploads

### Transform Nodes (10)
1. **Format Text** - Template-based text formatting
2. **Parse JSON** - JSON parsing with path extraction
3. **Filter Data** - Array filtering with conditions
4. **Delay Execution** - Adds execution delays
5. **Merge Data Objects** - Merges multiple objects
6. **Split String** - String splitting with delimiters
7. **Convert to CSV** - Converts arrays to CSV format
8. **Extract Email Addresses** - Regex email extraction
9. **Generate Summary with AI** - OpenAI-powered summaries
10. **Calculate Numeric Values** - Math operations (sum, avg, min, max)

## Usage

### Get a Node by ID
```typescript
import { getNodeById } from '@/lib/nodes';

const node = getNodeById('send-email');
```

### Get Nodes by Type
```typescript
import { getNodesByType } from '@/lib/nodes';

const actionNodes = getNodesByType('action');
const triggerNodes = getNodesByType('trigger');
const transformNodes = getNodesByType('transform');
```

### Search Nodes
```typescript
import { searchNodes } from '@/lib/nodes';

const emailNodes = searchNodes('email');
```

### Create a Node in React Flow
```typescript
import { createWorkflowNode } from '@/components/ui/workflow-node-library';

const newNode = createWorkflowNode(
  'send-email',
  { x: 100, y: 100 },
  { to: 'user@example.com', subject: 'Hello', body: 'World' }
);
```

## Node Structure

Each node definition includes:
- **id**: Unique identifier
- **name**: Display name
- **type**: 'trigger', 'action', or 'transform'
- **description**: Human-readable description
- **icon**: Lucide React icon name
- **category**: Node category
- **inputs**: Input schema definitions
- **outputs**: Output schema definitions
- **configSchema**: Configuration fields with validation
- **execute**: Execution function
- **code**: JavaScript code string

## Execution Context

Each node receives an execution context with:
- **auth**: Authentication tokens for various services
- **http**: HTTP client methods (get, post, put, delete)
- **logger**: Logging methods (info, error, warn)

## Next Steps

The workflow storage system should:
1. Store workflow definitions with node IDs and configurations
2. Link to node registry for execution
3. Support versioning and persistence
4. Enable workflow execution engine to run nodes

