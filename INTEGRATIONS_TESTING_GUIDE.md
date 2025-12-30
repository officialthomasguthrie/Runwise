# Integrations Testing Guide

This guide provides comprehensive testing procedures for all integrations in Runwise. Follow these steps to verify that each integration works correctly.

## 📋 Pre-Testing Checklist

Before you begin testing, ensure:

- [ ] All environment variables are set in `.env.local`:
  - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
  - `INTEGRATION_ENCRYPTION_KEY`
  - `GOOGLE_INTEGRATION_CLIENT_ID` and `GOOGLE_INTEGRATION_CLIENT_SECRET`
  - `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET`
- [ ] Database tables exist:
  - `user_integrations` (for OAuth tokens)
  - `integration_credentials` (for API keys/tokens)
- [ ] You have test accounts/credentials ready for each service
- [ ] Development server is running (`npm run dev`)

---

## 🔐 Integration Connection Testing

### Test 1: Google Sheets (OAuth)

**Steps:**
1. Navigate to Settings → Integrations tab
2. Find "Google Sheets" in the "Discover Integrations" section
3. Click "Connect" button
4. You should be redirected to Google OAuth consent screen
5. Authorize the application
6. You should be redirected back to settings page

**Expected Results:**
- [ ] Google Sheets appears in "Configured Integrations" section
- [ ] Shows "Connected" status with green checkmark
- [ ] "Disconnect" button is visible
- [ ] No longer appears in "Discover Integrations" section

**Verify in Database:**
```sql
SELECT service_name, created_at FROM user_integrations WHERE service_name = 'google';
```
Should show one row with encrypted `access_token` and `refresh_token`.

---

### Test 2: Slack (OAuth)

**Steps:**
1. Navigate to Settings → Integrations tab
2. Find "Slack" in the "Discover Integrations" section
3. Click "Connect" button
4. You should be redirected to Slack OAuth consent screen
5. Authorize the application
6. You should be redirected back to settings page

**Expected Results:**
- [ ] Slack appears in "Configured Integrations" section
- [ ] Shows "Connected" status with green checkmark
- [ ] "Disconnect" button is visible
- [ ] No longer appears in "Discover Integrations" section

**Verify in Database:**
```sql
SELECT service_name, created_at FROM user_integrations WHERE service_name = 'slack';
```

---

### Test 3: GitHub (OAuth)

**Steps:**
1. Navigate to Settings → Integrations tab
2. Find "GitHub" in the "Discover Integrations" section
3. Click "Connect" button
4. You should be redirected to GitHub OAuth consent screen
5. Authorize the application
6. You should be redirected back to settings page

**Expected Results:**
- [ ] GitHub appears in "Configured Integrations" section
- [ ] Shows "Connected" status with green checkmark
- [ ] "Disconnect" button is visible
- [ ] No longer appears in "Discover Integrations" section

**Verify in Database:**
```sql
SELECT service_name, created_at FROM user_integrations WHERE service_name = 'github';
```

---

### Test 4: Notion (API Token)

**Prerequisites:**
- Have a Notion Internal Integration Token ready (starts with `secret_` or `ntn_`)
- Token should have access to at least one database

**Steps:**
1. Navigate to Settings → Integrations tab
2. Find "Notion" in the "Discover Integrations" section
3. Click "Connect" button
4. A dialog should open asking for "Notion API Token"
5. Enter your Notion token
6. Click "Connect" in the dialog
7. Dialog should close

**Expected Results:**
- [ ] Notion appears in "Configured Integrations" section
- [ ] Shows "Connected" status with green checkmark
- [ ] "Disconnect" button is visible
- [ ] No longer appears in "Discover Integrations" section

**Verify in Database:**
```sql
SELECT service_name, credential_type FROM integration_credentials WHERE service_name = 'notion';
```
Should show one row with `credential_type = 'api_token'` and encrypted `credential_value`.

---

### Test 5: Airtable (API Token)

**Prerequisites:**
- Have an Airtable Personal Access Token ready (starts with `pat`)
- Token should have access to at least one base

**Steps:**
1. Navigate to Settings → Integrations tab
2. Find "Airtable" in the "Discover Integrations" section
3. Click "Connect" button
4. A dialog should open asking for "Airtable Personal Access Token"
5. Enter your Airtable token
6. Click "Connect" in the dialog
7. Dialog should close

**Expected Results:**
- [ ] Airtable appears in "Configured Integrations" section
- [ ] Shows "Connected" status with green checkmark
- [ ] "Disconnect" button is visible
- [ ] No longer appears in "Discover Integrations" section

**Verify in Database:**
```sql
SELECT service_name, credential_type FROM integration_credentials WHERE service_name = 'airtable';
```

---

### Test 6: Trello (API Key + Token)

**Prerequisites:**
- Have a Trello API Key ready
- Have a Trello Token ready
- Both should be from the same Trello account

**Steps:**
1. Navigate to Settings → Integrations tab
2. Find "Trello" in the "Discover Integrations" section
3. Click "Connect" button
4. A dialog should open with two fields:
   - "Trello API Key"
   - "Trello Token"
5. Enter both values
6. Click "Connect" in the dialog
7. Dialog should close

**Expected Results:**
- [ ] Trello appears in "Configured Integrations" section
- [ ] Shows "Connected" status with green checkmark
- [ ] "Disconnect" button is visible
- [ ] No longer appears in "Discover Integrations" section

**Verify in Database:**
```sql
SELECT service_name, credential_type FROM integration_credentials WHERE service_name = 'trello';
```
Should show two rows: one with `credential_type = 'api_key'` and one with `credential_type = 'token'`.

---

## 🔌 Disconnect Testing

### Test 7: Disconnect OAuth Integration

**Steps:**
1. Navigate to Settings → Integrations tab
2. Find a connected OAuth integration (e.g., Google Sheets)
3. Click "Disconnect" button
4. Button should show "Disconnecting..." briefly
5. Integration should disappear from "Configured Integrations" section
6. Integration should reappear in "Discover Integrations" section

**Expected Results:**
- [ ] Integration removed from configured list
- [ ] Integration appears in discover list with "Connect" button
- [ ] Database record deleted (verify with SQL query)

**Verify in Database:**
```sql
SELECT * FROM user_integrations WHERE service_name = 'google';
```
Should return no rows.

---

### Test 8: Disconnect Credential-Based Integration

**Steps:**
1. Navigate to Settings → Integrations tab
2. Find a connected credential-based integration (e.g., Notion)
3. Click "Disconnect" button
4. Button should show "Disconnecting..." briefly
5. Integration should disappear from "Configured Integrations" section
6. Integration should reappear in "Discover Integrations" section

**Expected Results:**
- [ ] Integration removed from configured list
- [ ] Integration appears in discover list with "Connect" button
- [ ] Database credentials deleted

**Verify in Database:**
```sql
SELECT * FROM integration_credentials WHERE service_name = 'notion';
```
Should return no rows.

---

## 📝 Node Configuration Testing

### Test 9: Google Sheets Node - Resource Selection

**Prerequisites:**
- Google Sheets integration connected

**Steps:**
1. Create a new workflow or open an existing one
2. Add "Add Row to Google Sheet" node
3. Click "Configure" button on the node
4. Node should expand showing configuration fields
5. Click on "Spreadsheet" dropdown field
6. Dropdown should show list of your Google Spreadsheets
7. Select a spreadsheet
8. "Sheet" dropdown should appear and populate with sheets from selected spreadsheet
9. Select a sheet
10. Fill in other required fields (values, etc.)
11. Click "Save Configuration"

**Expected Results:**
- [ ] Spreadsheet dropdown shows your spreadsheets (not empty)
- [ ] Sheet dropdown appears after selecting spreadsheet
- [ ] Sheet dropdown shows sheets from selected spreadsheet
- [ ] Configuration saves successfully
- [ ] Node shows green checkmark (fully configured)

**Test Workflow Prompt:**
```
Add a row to my "Sales Data" spreadsheet in the "January" sheet with values: Name=John, Email=john@example.com, Amount=100
```

---

### Test 10: Slack Node - Channel Selection

**Prerequisites:**
- Slack integration connected

**Steps:**
1. Create a new workflow or open an existing one
2. Add "Post to Slack Channel" node
3. Click "Configure" button
4. Click on "Channel" dropdown field
5. Dropdown should show list of your Slack channels
6. Select a channel
7. Enter a message
8. Click "Save Configuration"

**Expected Results:**
- [ ] Channel dropdown shows your Slack channels
- [ ] Can select a channel
- [ ] Configuration saves successfully
- [ ] Node shows green checkmark

**Test Workflow Prompt:**
```
Post a message to the #general channel in Slack saying "Hello from Runwise!"
```

---

### Test 11: GitHub Node - Repository Selection

**Prerequisites:**
- GitHub integration connected

**Steps:**
1. Create a new workflow or open an existing one
2. Add "New GitHub Issue" trigger node
3. Click "Configure" button
4. Click on "Repository" dropdown field
5. Dropdown should show list of your GitHub repositories
6. Select a repository
7. "Owner" field should auto-fill from repository selection
8. Click "Save Configuration"

**Expected Results:**
- [ ] Repository dropdown shows your repositories
- [ ] Owner field auto-fills when repository is selected
- [ ] Configuration saves successfully
- [ ] Node shows green checkmark

**Test Workflow Prompt:**
```
Create a workflow that triggers when a new issue is created in my "my-project" repository
```

---

### Test 12: Notion Node - Database Selection

**Prerequisites:**
- Notion integration connected
- At least one database shared with your Notion integration

**Steps:**
1. Create a new workflow or open an existing one
2. Add "Create Notion Page" node
3. Click "Configure" button
4. Click on "Database" dropdown field
5. Dropdown should show list of your Notion databases
6. Select a database
7. Enter a title
8. Click "Save Configuration"

**Expected Results:**
- [ ] Database dropdown shows your databases
- [ ] Can select a database
- [ ] Configuration saves successfully
- [ ] Node shows green checkmark

**Test Workflow Prompt:**
```
Create a new page in my "Tasks" Notion database with the title "Complete integration testing"
```

---

### Test 13: Airtable Node - Base and Table Selection

**Prerequisites:**
- Airtable integration connected
- At least one base with tables

**Steps:**
1. Create a new workflow or open an existing one
2. Add "Update Airtable Record" node
3. Click "Configure" button
4. Click on "Base" dropdown field
5. Dropdown should show list of your Airtable bases
6. Select a base
7. "Table" dropdown should appear and populate
8. Select a table
9. Enter a record ID
10. Enter fields to update (JSON format)
11. Click "Save Configuration"

**Expected Results:**
- [ ] Base dropdown shows your bases
- [ ] Table dropdown appears after selecting base
- [ ] Table dropdown shows tables from selected base
- [ ] Configuration saves successfully
- [ ] Node shows green checkmark

**Test Workflow Prompt:**
```
Update record recXXXXXXXXXXXXXX in my "Projects" base, "Tasks" table with fields: Status=Completed, Notes=Done
```

---

### Test 14: Trello Node - Board and List Selection

**Prerequisites:**
- Trello integration connected
- At least one board with lists

**Steps:**
1. Create a new workflow or open an existing one
2. Add "Create Trello Card" node
3. Click "Configure" button
4. Click on "Board" dropdown field
5. Dropdown should show list of your Trello boards
6. Select a board
7. "List" dropdown should appear and populate
8. Select a list
9. Enter card name
10. Click "Save Configuration"

**Expected Results:**
- [ ] Board dropdown shows your boards
- [ ] List dropdown appears after selecting board
- [ ] List dropdown shows lists from selected board
- [ ] Configuration saves successfully
- [ ] Node shows green checkmark

**Test Workflow Prompt:**
```
Create a Trello card in my "Project Management" board, "To Do" list with the name "Test integration"
```

---

## 🔄 Workflow Execution Testing

### Test 15: Execute Google Sheets Workflow

**Prerequisites:**
- Google Sheets integration connected
- Workflow with "Add Row to Google Sheet" node configured

**Steps:**
1. Create a workflow with "Add Row to Google Sheet" node
2. Configure the node with a valid spreadsheet, sheet, and values
3. Save the workflow
4. Execute/run the workflow
5. Check the execution logs

**Expected Results:**
- [ ] Workflow executes without errors
- [ ] Row is added to the Google Sheet
- [ ] Execution logs show success
- [ ] No authentication errors

**Verify:**
- Open the Google Sheet and verify the new row exists

---

### Test 16: Execute Slack Workflow

**Prerequisites:**
- Slack integration connected
- Workflow with "Post to Slack Channel" node configured

**Steps:**
1. Create a workflow with "Post to Slack Channel" node
2. Configure with a valid channel and message
3. Save and execute the workflow
4. Check execution logs

**Expected Results:**
- [ ] Workflow executes successfully
- [ ] Message appears in the Slack channel
- [ ] Execution logs show success

**Verify:**
- Check the Slack channel for the posted message

---

### Test 17: Execute Notion Workflow

**Prerequisites:**
- Notion integration connected
- Workflow with "Create Notion Page" node configured

**Steps:**
1. Create a workflow with "Create Notion Page" node
2. Configure with a valid database and title
3. Save and execute the workflow
4. Check execution logs

**Expected Results:**
- [ ] Workflow executes successfully
- [ ] Page is created in the Notion database
- [ ] Execution logs show success

**Verify:**
- Open the Notion database and verify the new page exists

---

### Test 18: Execute Airtable Workflow

**Prerequisites:**
- Airtable integration connected
- Workflow with "Update Airtable Record" node configured

**Steps:**
1. Create a workflow with "Update Airtable Record" node
2. Configure with valid base, table, record ID, and fields
3. Save and execute the workflow
4. Check execution logs

**Expected Results:**
- [ ] Workflow executes successfully
- [ ] Record is updated in Airtable
- [ ] Execution logs show success

**Verify:**
- Open the Airtable base and verify the record was updated

---

### Test 19: Execute Trello Workflow

**Prerequisites:**
- Trello integration connected
- Workflow with "Create Trello Card" node configured

**Steps:**
1. Create a workflow with "Create Trello Card" node
2. Configure with valid board, list, and card name
3. Save and execute the workflow
4. Check execution logs

**Expected Results:**
- [ ] Workflow executes successfully
- [ ] Card is created in the Trello board
- [ ] Execution logs show success

**Verify:**
- Open the Trello board and verify the new card exists

---

## 🤖 AI Workflow Generation Testing

### Test 20: AI Generates Workflow with Connected Integrations

**Prerequisites:**
- At least one integration connected (e.g., Google Sheets)

**Steps:**
1. Navigate to Dashboard or Workspace
2. Open AI chat
3. Send a prompt that requires an integration:
   ```
   Create a workflow that adds a row to my Google Sheet when a new form is submitted
   ```
4. AI should generate a workflow
5. Check if the workflow includes the correct integration node
6. Check if the node is pre-configured with your resources

**Expected Results:**
- [ ] AI generates a workflow with integration node
- [ ] AI mentions your connected integrations in the response
- [ ] Node is configured with your actual spreadsheet/sheet (if available)
- [ ] AI suggests using your connected resources

**Test Prompts:**
```
Add a row to my Google Sheet when I receive an email
Post to Slack when a new GitHub issue is created
Create a Notion page when a Trello card is completed
Update Airtable when a new form submission comes in
```

---

### Test 21: AI Context Includes Integration Resources

**Prerequisites:**
- Multiple integrations connected with resources

**Steps:**
1. Connect Google Sheets (with spreadsheets)
2. Connect Slack (with channels)
3. Connect GitHub (with repositories)
4. Open AI chat
5. Ask: "What integrations do I have connected?"
6. AI should list your integrations and available resources

**Expected Results:**
- [ ] AI knows about your connected integrations
- [ ] AI can list your spreadsheets, channels, repositories, etc.
- [ ] AI suggests workflows using your actual resources

---

## ⚠️ Error Handling Testing

### Test 22: Invalid Token Handling

**Steps:**
1. Connect Notion with an invalid token
2. Try to configure a Notion node
3. Try to fetch databases

**Expected Results:**
- [ ] Error message displayed clearly
- [ ] User can see what went wrong
- [ ] Option to update/reconnect the integration

---

### Test 23: Expired Token Handling (OAuth)

**Steps:**
1. Connect Google Sheets
2. Manually expire the token in database (set `token_expires_at` to past date)
3. Try to execute a workflow using Google Sheets
4. System should attempt to refresh the token

**Expected Results:**
- [ ] System detects expired token
- [ ] Token is automatically refreshed
- [ ] Workflow executes successfully
- [ ] New token stored in database

**Verify:**
```sql
SELECT token_expires_at FROM user_integrations WHERE service_name = 'google';
```
Should show a future date.

---

### Test 24: Missing Integration Handling

**Steps:**
1. Create a workflow with a Google Sheets node
2. Disconnect Google Sheets integration
3. Try to configure the node
4. Try to execute the workflow

**Expected Results:**
- [ ] Node shows "Connect Google" button
- [ ] Cannot execute workflow without connection
- [ ] Clear error message about missing integration

---

### Test 25: Resource Not Found Handling

**Steps:**
1. Configure a node with a specific resource (e.g., spreadsheet ID)
2. Delete that resource in the external service
3. Try to execute the workflow

**Expected Results:**
- [ ] Clear error message about resource not found
- [ ] Suggests reconfiguring the node
- [ ] Execution fails gracefully

---

## 🔍 Edge Cases Testing

### Test 26: Multiple Accounts (Same Service)

**Steps:**
1. Connect Google Sheets with Account A
2. Disconnect
3. Connect Google Sheets with Account B
4. Verify resources shown are from Account B

**Expected Results:**
- [ ] Old connection is removed
- [ ] New connection works correctly
- [ ] Resources shown are from new account

---

### Test 27: Large Resource Lists

**Steps:**
1. Connect an integration with many resources (e.g., 100+ spreadsheets)
2. Configure a node
3. Open resource dropdown

**Expected Results:**
- [ ] Dropdown is scrollable
- [ ] All resources load correctly
- [ ] Performance is acceptable
- [ ] Search/filter works (if implemented)

---

### Test 28: Special Characters in Resource Names

**Steps:**
1. Create a resource with special characters (e.g., "Sheet & Data (2024)")
2. Connect integration
3. Configure a node
4. Select the resource with special characters

**Expected Results:**
- [ ] Resource name displays correctly
- [ ] Selection works correctly
- [ ] No encoding issues

---

### Test 29: Concurrent Connections

**Steps:**
1. Open Settings → Integrations in two browser tabs
2. Connect an integration in Tab 1
3. Check Tab 2

**Expected Results:**
- [ ] Tab 2 should refresh or show updated state
- [ ] No conflicts or errors

---

### Test 30: Network Failures

**Steps:**
1. Connect an integration
2. Disconnect from internet
3. Try to configure a node
4. Try to fetch resources

**Expected Results:**
- [ ] Clear error message about network failure
- [ ] No crashes or infinite loading
- [ ] User can retry when connection is restored

---

## 📊 Integration Status API Testing

### Test 31: Status API Returns Correct Data

**Steps:**
1. Connect multiple integrations (mix of OAuth and credential-based)
2. Open browser DevTools → Network tab
3. Navigate to Settings → Integrations
4. Check the `/api/integrations/status` request

**Expected Results:**
- [ ] API returns all connected integrations
- [ ] Response includes both OAuth and credential-based integrations
- [ ] No sensitive data (tokens/keys) in response
- [ ] Response format is correct

**Expected Response Format:**
```json
{
  "integrations": [
    {
      "service": "google",
      "connected": true,
      "expiresAt": "2024-12-31T23:59:59Z",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "service": "notion",
      "connected": true,
      "expiresAt": null,
      "createdAt": null
    }
  ]
}
```

---

## 🧪 Advanced Testing Scenarios

### Test 32: Workflow with Multiple Integrations

**Steps:**
1. Connect Google Sheets, Slack, and Notion
2. Create a workflow with all three:
   - Trigger: New form submission
   - Action 1: Add row to Google Sheet
   - Action 2: Post to Slack
   - Action 3: Create Notion page
3. Execute the workflow

**Expected Results:**
- [ ] All nodes execute successfully
- [ ] Each integration uses its stored credentials
- [ ] No credential conflicts
- [ ] All actions complete in order

**Test Workflow Prompt:**
```
When a new form is submitted, add the data to my "Submissions" Google Sheet, post a notification to #alerts Slack channel, and create a page in my "Logs" Notion database
```

---

### Test 33: Token Refresh During Execution

**Steps:**
1. Connect Google Sheets
2. Note the token expiration time
3. Wait until token is close to expiring (or manually set expiration to 5 minutes from now)
4. Execute a workflow that takes longer than 5 minutes
5. Check if token is refreshed automatically

**Expected Results:**
- [ ] Token is refreshed before expiration
- [ ] Workflow continues without interruption
- [ ] New token is stored in database

---

### Test 34: Integration Field in Node Configuration

**Steps:**
1. Connect Google Sheets
2. Add "Add Row to Google Sheet" node
3. Expand node configuration
4. Test the integration field:
   - Click on spreadsheet dropdown
   - Verify it doesn't close the node
   - Select a spreadsheet
   - Verify sheet dropdown appears
   - Select a sheet
   - Verify configuration saves

**Expected Results:**
- [ ] Dropdown clicks don't close the node
- [ ] Dependent fields appear correctly
- [ ] Configuration persists after saving

---

## 🐛 Troubleshooting Checklist

If something doesn't work, check:

### Connection Issues
- [ ] Environment variables are set correctly
- [ ] OAuth redirect URIs match in service settings
- [ ] Database tables exist and have correct schema
- [ ] Encryption key is set and consistent

### Resource Fetching Issues
- [ ] Integration is actually connected (check database)
- [ ] Token/credentials are valid (not expired)
- [ ] User has access to the resources in the external service
- [ ] API endpoints are accessible (check network tab)

### Execution Issues
- [ ] Node is fully configured
- [ ] All required fields are filled
- [ ] Resource IDs are correct
- [ ] Token hasn't expired (for OAuth)
- [ ] Check execution logs for specific errors

### UI Issues
- [ ] Integration status API returns correct data
- [ ] Component state updates correctly
- [ ] No console errors in browser DevTools
- [ ] Database queries return expected results

---

## 📝 Test Results Template

Use this template to track your testing:

```
## Test Results - [Date]

### Integration Connections
- [ ] Google Sheets: ✅ / ❌ (Notes: ...)
- [ ] Slack: ✅ / ❌ (Notes: ...)
- [ ] GitHub: ✅ / ❌ (Notes: ...)
- [ ] Notion: ✅ / ❌ (Notes: ...)
- [ ] Airtable: ✅ / ❌ (Notes: ...)
- [ ] Trello: ✅ / ❌ (Notes: ...)

### Node Configuration
- [ ] Google Sheets node: ✅ / ❌ (Notes: ...)
- [ ] Slack node: ✅ / ❌ (Notes: ...)
- [ ] GitHub node: ✅ / ❌ (Notes: ...)
- [ ] Notion node: ✅ / ❌ (Notes: ...)
- [ ] Airtable node: ✅ / ❌ (Notes: ...)
- [ ] Trello node: ✅ / ❌ (Notes: ...)

### Workflow Execution
- [ ] Google Sheets workflow: ✅ / ❌ (Notes: ...)
- [ ] Slack workflow: ✅ / ❌ (Notes: ...)
- [ ] Notion workflow: ✅ / ❌ (Notes: ...)
- [ ] Airtable workflow: ✅ / ❌ (Notes: ...)
- [ ] Trello workflow: ✅ / ❌ (Notes: ...)

### AI Integration
- [ ] AI knows about integrations: ✅ / ❌ (Notes: ...)
- [ ] AI suggests correct resources: ✅ / ❌ (Notes: ...)
- [ ] AI generates workflows with integrations: ✅ / ❌ (Notes: ...)

### Issues Found
1. [Issue description]
2. [Issue description]

### Next Steps
- [Action item]
- [Action item]
```

---

## 🎯 Quick Test Scenarios

### Scenario 1: First-Time User Flow
1. New user signs up
2. Goes to Settings → Integrations
3. Connects Google Sheets
4. Creates first workflow with Google Sheets node
5. Executes workflow
6. Verifies row was added to sheet

**Expected:** Smooth onboarding experience, no errors

---

### Scenario 2: Power User Flow
1. User connects all 6 integrations
2. Creates complex workflow using multiple integrations
3. Executes workflow
4. Verifies all actions completed

**Expected:** All integrations work together seamlessly

---

### Scenario 3: Integration Management
1. User connects 3 integrations
2. Disconnects one
3. Reconnects with different account
4. Verifies resources update correctly

**Expected:** Clean state management, no orphaned data

---

## ✅ Final Verification Checklist

Before marking integrations as production-ready:

- [ ] All 6 integrations can be connected
- [ ] All 6 integrations can be disconnected
- [ ] All node configurations work correctly
- [ ] All workflows execute successfully
- [ ] AI integration context works
- [ ] Error handling is robust
- [ ] Token refresh works (for OAuth)
- [ ] Database encryption is working
- [ ] No sensitive data exposed in API responses
- [ ] UI is responsive and user-friendly
- [ ] All edge cases handled
- [ ] Performance is acceptable
- [ ] Documentation is complete

---

## 📞 Support Resources

If you encounter issues:

1. **Check Logs:**
   - Browser console (F12)
   - Server logs (terminal)
   - Database queries

2. **Verify Credentials:**
   - OAuth apps are configured correctly
   - Tokens/keys are valid
   - Scopes/permissions are correct

3. **Database Checks:**
   - Tables exist
   - Data is encrypted
   - Foreign keys are correct

4. **API Testing:**
   - Test endpoints directly with Postman/curl
   - Verify authentication
   - Check response formats

---

**Happy Testing! 🚀**

