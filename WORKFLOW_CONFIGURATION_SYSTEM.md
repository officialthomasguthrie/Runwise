# Workflow Configuration System

## Overview

The Workflow Configuration System ensures that all AI-generated and manually created workflow nodes are properly configured before execution. It provides a user-friendly interface for setting up API keys, credentials, email addresses, and other required parameters.

## Features

### 1. **Dynamic Configuration Forms**
- Automatically generates forms based on node `configSchema`
- Supports multiple field types:
  - Text inputs
  - Textareas (for long text/JSON)
  - Number inputs
  - Select dropdowns
  - Array inputs (comma-separated)
  - Object inputs (JSON)

### 2. **Visual Indicators**
- **Orange ring** around unconfigured nodes
- **Config Required badge** in node header
- **Orange "Configure Required" button** in node footer
- **Green checkmark** for configured nodes
- **Status card** in top-left showing overall configuration progress

### 3. **Configuration Panel**
- Slides in from the right when opened
- Shows node details and description
- Displays required vs optional fields
- Real-time validation
- Pro tips for using variables (e.g., `{{variable}}`)

### 4. **Validation Before Execution**
- Prevents workflow execution if any nodes are unconfigured
- Shows alert with count of unconfigured nodes
- Highlights first unconfigured node

## How It Works

### For Users

#### 1. Generate or Create a Workflow
When you generate a workflow with AI or manually add nodes, some nodes may require configuration (API keys, email addresses, etc.).

#### 2. Identify Unconfigured Nodes
Look for:
- Orange ring around the node
- "Config Required" badge in the node header
- Orange "Configure Required" button

#### 3. Configure Nodes
**Option A: Click the "Configure" button** in the top-left toolbar
- This will open the first unconfigured node

**Option B: Double-click any node** to open its configuration panel

**Option C: Click the "Configure" button** in the node's footer

#### 4. Fill Out the Configuration Form
- Fill in all **required fields** (marked with red asterisk *)
- Use variables from previous nodes: `{{input.email}}`
- Click **"Save Configuration"** when done

#### 5. Run the Workflow
Once all nodes are configured, the "Run Workflow" button will become enabled.

### For Developers

#### Node Configuration Schema

Each node in `src/lib/nodes/registry.ts` has a `configSchema` that defines what configuration it needs:

```typescript
configSchema: {
  apiKey: {
    type: 'string',
    label: 'API Key',
    description: 'Your SendGrid API key',
    required: true,
  },
  from: {
    type: 'string',
    label: 'From Email',
    description: 'Sender email address',
    required: true,
  },
  to: {
    type: 'string',
    label: 'To Email',
    description: 'Recipient email address (can use {{variables}})',
    required: true,
  },
  subject: {
    type: 'string',
    label: 'Subject',
    description: 'Email subject line',
    required: false,
  },
  body: {
    type: 'textarea',
    label: 'Email Body',
    description: 'HTML or plain text email body',
    required: true,
  },
}
```

#### Field Types

| Type | UI Component | Example Use Case |
|------|-------------|------------------|
| `string` | Text input | API keys, email addresses, URLs |
| `textarea` | Textarea | Email bodies, long descriptions |
| `number` | Number input | Timeouts, retry counts |
| `select` | Dropdown | Predefined options (e.g., priority levels) |
| `array` | Text input (comma-separated) | List of email addresses |
| `object` | Textarea (JSON) | Complex structured data |

#### Adding a Select Field

```typescript
priority: {
  type: 'select',
  label: 'Priority',
  description: 'Task priority level',
  required: true,
  options: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ],
}
```

## Components

### 1. `NodeConfigPanel` (`src/components/ui/node-config-panel.tsx`)
The main configuration panel component that slides in from the right.

**Props:**
- `node: Node` - The React Flow node to configure
- `onUpdate: (nodeId: string, config: any) => void` - Callback when config is saved
- `onClose: () => void` - Callback when panel is closed

**Features:**
- Dynamic form generation based on `configSchema`
- Real-time validation
- Progress indicator (X/Y required fields)
- Helpful tips and examples

### 2. `ReactFlowEditor` (`src/components/ui/react-flow-editor.tsx`)
Enhanced with configuration management.

**New State:**
- `selectedNodeForConfig` - Currently selected node for configuration
- `showConfigPanel` - Whether to show the config panel

**New Functions:**
- `isNodeConfigured(node)` - Checks if a node is fully configured
- `getUnconfiguredNodes()` - Returns array of unconfigured nodes
- `validateWorkflowConfiguration()` - Validates entire workflow
- `openNodeConfig(node)` - Opens config panel for a node
- `handleNodeConfigUpdate(nodeId, config)` - Saves node configuration

**UI Additions:**
- Configuration status card (top-left)
- "Configure" button (orange, shows count)
- "Run Workflow" button (disabled until all configured)
- Configuration panel (slides in from right)

### 3. `WorkflowNode` (`src/components/ui/workflow-node-library.tsx`)
Enhanced with visual configuration indicators.

**New Visual Elements:**
- Orange ring for unconfigured nodes
- "Config Required" badge in header
- Green checkmark for configured nodes
- Smart button text based on status

## Configuration Flow

```
┌─────────────────────┐
│ AI Generates        │
│ Workflow            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Nodes Added to      │
│ Canvas              │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ System Checks       │
│ Configuration       │
└──────┬──────────────┘
       │
       ├─ All Configured ───────────────┐
       │                                 │
       └─ Some Unconfigured             │
              │                          │
              ▼                          ▼
       ┌─────────────────┐      ┌──────────────┐
       │ Show Orange     │      │ Enable "Run" │
       │ Indicators      │      │ Button       │
       └──────┬──────────┘      └──────────────┘
              │
              ▼
       ┌─────────────────┐
       │ User Clicks     │
       │ "Configure"     │
       └──────┬──────────┘
              │
              ▼
       ┌─────────────────┐
       │ Config Panel    │
       │ Opens           │
       └──────┬──────────┘
              │
              ▼
       ┌─────────────────┐
       │ User Fills Form │
       │ & Saves         │
       └──────┬──────────┘
              │
              ▼
       ┌─────────────────┐
       │ Node Marked     │
       │ Configured      │
       └──────┬──────────┘
              │
              ▼
       ┌─────────────────┐
       │ Repeat for      │
       │ Other Nodes     │
       └──────┬──────────┘
              │
              ▼
       ┌─────────────────┐
       │ All Configured  │
       │ → Run Enabled   │
       └─────────────────┘
```

## User Experience

### Before Configuration
- Workflow canvas shows nodes with orange rings
- Status card: "3 node(s) need configuration"
- Configure button: "Configure (3)"
- Run button: **Disabled**

### During Configuration
- User clicks "Configure" or double-clicks a node
- Panel slides in from right
- User sees form with all required fields
- Real-time validation as they type
- Helpful tips about using variables

### After Configuration
- Orange ring disappears
- Green checkmark appears
- Button changes to "Configured ✓"
- Status updates: "2 node(s) need configuration"

### All Configured
- Status card: "All nodes configured" with green checkmark
- Configure button hidden
- Run button: **Enabled**
- User can execute workflow

## Best Practices

### For Users

1. **Use Variables** - Reference data from previous nodes using `{{variable}}` syntax
2. **Configure in Order** - Start from trigger nodes and work through the flow
3. **Test Configuration** - After configuring, run the workflow to verify
4. **Save Workflows** - Configuration is saved with the workflow

### For Developers

1. **Clear Labels** - Use descriptive labels for config fields
2. **Helpful Descriptions** - Explain what each field does and provide examples
3. **Required vs Optional** - Only mark fields as required if truly necessary
4. **Validation** - Use appropriate field types (email, URL, number)
5. **Defaults** - Provide sensible defaults when possible

## Security

### Credential Storage
Currently, configuration is stored in the `workflow_data` JSON in the database. For production:

**⚠️ TODO: Implement Secure Credential Storage**
- Move sensitive credentials (API keys, passwords) to a separate encrypted table
- Use environment variables or secrets management service
- Never expose credentials in client-side code
- Implement credential rotation

### Recommended Approach
```typescript
// Instead of storing directly in node.data.config
config: {
  apiKey: "sk-123456..." // ❌ Don't do this
}

// Store a reference to a credential
config: {
  apiKeyRef: "sendgrid-api-key-1" // ✅ Do this
}

// Retrieve credential securely at execution time
const apiKey = await getCredential(user.id, "sendgrid-api-key-1");
```

## Testing

### Manual Testing Checklist

1. ✅ Generate a workflow with AI
2. ✅ Verify unconfigured nodes have orange indicators
3. ✅ Click "Configure" button
4. ✅ Config panel opens with correct form
5. ✅ Fill in required fields
6. ✅ Try to save without filling required fields (should show errors)
7. ✅ Fill all required fields and save
8. ✅ Verify node updates (green checkmark, no orange ring)
9. ✅ Double-click a configured node to re-open config
10. ✅ Configure all nodes
11. ✅ Verify "Run Workflow" button is enabled
12. ✅ Click "Run Workflow"
13. ✅ Verify workflow executes

### Automated Testing
TODO: Add Playwright/Cypress tests for configuration flow

## Troubleshooting

### Problem: Config panel doesn't open
**Solution:** Check browser console for errors. Ensure node has a valid `nodeId` and definition exists in registry.

### Problem: "Run" button stays disabled
**Solution:** Check all nodes are configured. Look for any nodes with orange rings or "Config Required" badges.

### Problem: Configuration doesn't save
**Solution:** Check for validation errors. Ensure all required fields are filled. Check browser console for errors.

### Problem: Node definition not found
**Solution:** Verify the node's `nodeId` matches an entry in `src/lib/nodes/registry.ts`.

## Future Enhancements

- [ ] Secure credential storage (separate encrypted table)
- [ ] Credential templates (pre-filled common configurations)
- [ ] Bulk configuration (configure multiple nodes at once)
- [ ] Configuration presets (save and reuse common configs)
- [ ] Field-level validation (regex, format checking)
- [ ] Conditional fields (show field B only if field A is filled)
- [ ] Rich text editor for email bodies
- [ ] OAuth integration for third-party services
- [ ] Configuration import/export
- [ ] Configuration versioning

## API Reference

### `isNodeConfigured(node: Node): boolean`
Checks if a node has all required configuration filled.

### `validateWorkflowConfiguration(): { valid: boolean; message?: string; nodes?: Node[] }`
Validates the entire workflow's configuration status.

### `openNodeConfig(node: Node): void`
Opens the configuration panel for a specific node.

### `handleNodeConfigUpdate(nodeId: string, config: any): void`
Updates a node's configuration and triggers re-render.

## Summary

The Workflow Configuration System provides a seamless, user-friendly way to configure AI-generated and manual workflows. It ensures all required information is collected before execution, provides clear visual feedback, and makes the configuration process intuitive for users of all technical levels.

**Key Benefits:**
- ✅ Prevents execution errors due to missing configuration
- ✅ Clear visual indicators of what needs attention
- ✅ Dynamic forms adapt to any node type
- ✅ User-friendly interface with helpful tips
- ✅ Supports complex configurations (arrays, objects, JSON)
- ✅ Real-time validation and feedback
- ✅ Saved with workflow for persistence

---

**Questions or Issues?** Check the troubleshooting section or review the component source code.

