# Configuration System - Quick Start Guide

## 🚀 What Was Implemented

A complete universal configuration system that:
1. ✅ Validates all nodes before workflow execution
2. ✅ Shows visual indicators for unconfigured nodes
3. ✅ Provides a sliding configuration panel
4. ✅ Dynamically generates forms based on node schema
5. ✅ Supports all field types (text, textarea, number, select, array, object)
6. ✅ Saves configuration with workflows

## 📝 How to Test

### 1. Start the Dev Server
```bash
npm run dev
```

### 2. Navigate to Dashboard
Go to `http://localhost:3000/dashboard`

### 3. Generate a Workflow
Type a prompt like:
- "Send a welcome email when a user signs up"
- "Create a Slack notification when a form is submitted"
- "Generate daily sales reports and email them"

### 4. Observe Configuration Status
After the AI generates the workflow, you'll see:

**Top-left status card:**
```
⚠️ 2 node(s) need configuration
1 / 3 nodes ready
```

**Orange "Configure" button:**
```
⚙️ Configure (2)
```

**Nodes with orange rings:**
- Nodes that need configuration will have an orange ring
- "Config Required" badge in the header
- Orange "Configure Required" button in the footer

### 5. Configure a Node

**Option A:** Click the orange "Configure" button in the top-left

**Option B:** Double-click any node

**Option C:** Click the "Configure" button in a node's footer

### 6. Fill the Configuration Form

The panel will slide in from the right showing:
- Node name and description
- Configuration status (X/Y required fields)
- Dynamic form fields based on the node type
- Pro tips about using variables

Fill in all required fields (marked with red *):
- API keys
- Email addresses  
- Channel IDs
- File paths
- Webhook URLs
- Any custom configuration

**Example - SendGrid Email Node:**
```
API Key: sk-sendgrid-abc123
From Email: no-reply@yourapp.com
To Email: {{input.email}}
Subject: Welcome!
Body: <h1>Welcome!</h1>
```

### 7. Save Configuration

Click **"Save Configuration"**

The node will:
- ✅ Orange ring disappears
- ✅ Green checkmark appears in header
- ✅ Button changes to "Configured ✓"

### 8. Configure Remaining Nodes

Repeat for all unconfigured nodes until the status shows:
```
✓ All nodes configured
3 / 3 nodes ready
```

### 9. Run the Workflow

Once all nodes are configured:
- The **"Run Workflow"** button becomes enabled
- Click it to execute the workflow
- View execution results in the bottom panel

## 🎨 Visual Guide

### Unconfigured Node
```
┌───────────────────────────────┐
│ 🔗 Send Email  [⚠️ Config Required] │ ← Orange badge
├───────────────────────────────┤
│ Send Email                    │
│ Sends an email to recipients  │
├───────────────────────────────┤
│ Configuration                 │
│ [⚙️ Configure Required]        │ ← Orange button
└───────────────────────────────┘
   ↑ Orange ring around node
```

### Configured Node
```
┌───────────────────────────────┐
│ 🔗 Send Email           [✓]    │ ← Green checkmark
├───────────────────────────────┤
│ Send Email                    │
│ Sends an email to recipients  │
├───────────────────────────────┤
│ Configuration                 │
│ [⚙️ Configured ✓]              │ ← Success state
└───────────────────────────────┘
```

## 🧪 Test Scenarios

### Scenario 1: Email Workflow
1. Prompt: "Send a welcome email when a user signs up"
2. Configure Webhook Trigger:
   - Path: `/user-signup`
3. Configure Send Email:
   - API Key: `your-sendgrid-key`
   - From: `welcome@yourapp.com`
   - To: `{{input.email}}`
   - Subject: `Welcome!`
   - Body: `<h1>Welcome to our app!</h1>`
4. Run workflow

### Scenario 2: Slack Notification
1. Prompt: "Send Slack notification when form submitted"
2. Configure Form Trigger:
   - Form ID: `contact-form`
3. Configure Slack Message:
   - Webhook URL: `https://hooks.slack.com/...`
   - Channel: `#notifications`
   - Message: `New form submission: {{input.name}}`
4. Run workflow

### Scenario 3: Multi-Step Workflow
1. Prompt: "Get weather data, format it, and send email"
2. Configure Weather API:
   - API Key: `your-weather-api-key`
   - Location: `{{input.city}}`
3. Configure Format Transform:
   - Template: `Weather in {{city}}: {{temp}}°F`
4. Configure Email:
   - All email fields
5. Run workflow

## 🔍 Debugging

### Check Configuration Status
Open browser DevTools and check:
```javascript
// In React DevTools, inspect ReactFlowEditor component
// Look for state:
- nodes (should have config in data.config)
- showConfigPanel (should toggle when opening)
- selectedNodeForConfig (should be set when clicked)
```

### Common Issues

**Q: Config panel doesn't open when I double-click**
- Check console for errors
- Verify node has a valid `nodeId`
- Check that node definition exists in registry

**Q: Run button stays disabled**
- Ensure ALL nodes have required configuration
- Look for any nodes still showing orange rings
- Check the status card count

**Q: Configuration doesn't save**
- Check for validation errors (red text under fields)
- Ensure all required fields (* marked) are filled
- Check browser console for errors

## 📊 Expected Behavior

| User Action | Expected Result |
|------------|----------------|
| Workflow generated | Status card shows unconfigured count |
| Click "Configure" button | Panel opens for first unconfigured node |
| Double-click node | Panel opens for that node |
| Fill required fields | Errors clear as you type |
| Save configuration | Panel closes, node updates, status updates |
| Configure all nodes | "Run Workflow" button enables |
| Click "Run" with unconfigured | Alert shown, execution prevented |
| Click "Run" when ready | Workflow executes, results shown |

## 🎉 Success Criteria

✅ Configuration system complete when:
1. Nodes show visual indicators (orange ring, badges)
2. Status card displays correct counts
3. Config panel opens on click/double-click
4. Form fields render dynamically
5. Validation works (required fields)
6. Configuration saves to node
7. Visual indicators update after save
8. Run button enables/disables correctly
9. Workflow execution validates config first
10. Works with AI-generated workflows

## 📚 Next Steps

After testing, see `WORKFLOW_CONFIGURATION_SYSTEM.md` for:
- Full documentation
- Component API reference
- Security considerations
- Best practices
- Future enhancements

## 🎯 Quick Tips

1. **Use Variables:** Reference previous node data with `{{variable}}`
2. **Configure in Order:** Start from triggers, work through flow
3. **Double-Click:** Fastest way to open config panel
4. **Watch Status:** Status card shows progress
5. **Test Early:** Configure and run small workflows first

---

**Ready to test!** Generate a workflow and start configuring! 🚀

