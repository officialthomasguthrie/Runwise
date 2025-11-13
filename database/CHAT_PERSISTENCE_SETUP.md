# AI Chat Persistence - Setup Guide

This guide will help you set up the AI chat persistence system, which saves all user conversations and messages to the Supabase database.

## Overview

The chat persistence system provides:
- ✅ **Automatic conversation saving** - Every chat is saved to the user's account
- ✅ **Message history** - All messages persist across sessions
- ✅ **Chat history browser** - Users can view and switch between past conversations
- ✅ **User isolation** - Each user only sees their own chats (RLS enforced)
- ✅ **Conversation management** - Create, view, switch, and delete conversations

## Database Setup

### Step 1: Run the SQL Migration

1. Go to your **Supabase Dashboard**
2. Navigate to the **SQL Editor**
3. Click **"New Query"**
4. Copy and paste the contents of `database/ai-chat-schema.sql`
5. Click **"Run"** to execute the migration

This will create two tables:
- `ai_chat_conversations` - Stores conversation metadata
- `ai_chat_messages` - Stores individual messages

### Step 2: Verify Tables Were Created

1. In Supabase, go to **"Table Editor"**
2. You should see two new tables:
   - `ai_chat_conversations`
   - `ai_chat_messages`

### Step 3: Verify RLS Policies

1. In Supabase, go to **"Authentication" > "Policies"**
2. You should see policies for both tables:
   - Users can view/create/update/delete their own conversations
   - Users can view/create/delete messages in their own conversations

## Features

### 1. **Automatic Conversation Creation**
When a user sends their first message, a conversation is automatically created with a title generated from the first message content.

### 2. **Real-time Message Saving**
Every message (both user and AI) is saved to the database immediately after being sent/received.

### 3. **Chat History Panel**
Click the **Clock icon** in the top bar to view all past conversations:
- Shows conversation title, preview, and metadata
- Click any conversation to load it
- Hover over a conversation to see the delete button

### 4. **Conversation Switching**
Click any conversation in the history panel to:
- Load all messages from that conversation
- Continue the conversation where you left off
- See the full context

### 5. **New Chat Creation**
Click the **Plus icon** to:
- Start a fresh conversation
- Clear the current chat area
- Create a new conversation ID

### 6. **Conversation Deletion**
Hover over any conversation in the history panel and click the **trash icon** to delete it permanently.

## Code Architecture

### Files Modified
- **`src/components/ui/ai-chat-sidebar.tsx`** - Main chat UI with persistence integration
- **`src/lib/ai/chat-persistence.ts`** - Database persistence functions
- **`database/ai-chat-schema.sql`** - Database schema and RLS policies

### Key Functions

#### Persistence Functions (`chat-persistence.ts`)
```typescript
saveConversation(id, title, userId)  // Create/update conversation
saveMessage(message, conversationId) // Save individual message
loadConversations()                  // Load user's conversation list
loadMessages(conversationId)         // Load messages for a conversation
deleteConversation(conversationId)   // Delete conversation + messages
```

#### UI Functions (`ai-chat-sidebar.tsx`)
```typescript
loadUserConversations()              // Fetch and display conversations
createNewConversation()              // Start a new chat
switchToConversation(id)             // Load existing conversation
handleDeleteConversation(id)         // Delete with confirmation
generateConversationTitle(message)   // Auto-generate title
```

## User Experience Flow

1. **User opens AI chat sidebar**
   - System loads all their past conversations
   - Shows count in header ("5 conversations")

2. **User sends first message**
   - Conversation is created automatically
   - Title is generated from first message
   - Message is saved to database
   - Conversation appears in history

3. **User continues chatting**
   - Each message is saved immediately
   - Conversation metadata updates (last_message_at, preview)
   - Message count increments

4. **User clicks Clock icon**
   - Chat history panel slides open
   - Shows all conversations sorted by most recent
   - Each shows: title, preview, message count, date

5. **User clicks a past conversation**
   - All messages load from database
   - User can continue the conversation
   - New messages append to existing conversation

6. **User deletes a conversation**
   - Confirmation dialog appears
   - On confirm, conversation + all messages deleted
   - If current conversation was deleted, new chat created

## Testing Checklist

- [ ] Tables created successfully in Supabase
- [ ] RLS policies are active
- [ ] Send a message and verify it appears in `ai_chat_messages`
- [ ] Verify conversation appears in `ai_chat_conversations`
- [ ] Click Clock icon to see conversation in history
- [ ] Click conversation to reload it
- [ ] Create new conversation and verify it's separate
- [ ] Delete conversation and verify it's removed
- [ ] Refresh page and verify conversations persist
- [ ] Test with multiple user accounts (each should only see their own)

## Troubleshooting

### "Database not setup" warning
- The database tables haven't been created yet
- Run the SQL migration from `database/ai-chat-schema.sql`

### Conversations not appearing
- Check if user is authenticated (`user` object exists)
- Check browser console for errors
- Verify RLS policies are enabled in Supabase

### Messages not saving
- Check Supabase logs for errors
- Verify the `user_id` matches the authenticated user
- Check that conversation exists before saving messages

### Cannot delete conversation
- Verify RLS policies allow DELETE operations
- Check if user owns the conversation
- Look for foreign key constraint errors

## Database Schema Reference

### `ai_chat_conversations`
```sql
id               TEXT PRIMARY KEY
user_id          UUID (foreign key to users)
title            TEXT
preview          TEXT (auto-generated from last message)
message_count    INTEGER (auto-updated via trigger)
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
last_message_at  TIMESTAMPTZ
```

### `ai_chat_messages`
```sql
id                TEXT PRIMARY KEY
conversation_id   TEXT (foreign key to conversations)
role             TEXT ('user' | 'assistant' | 'system')
content          TEXT
workflow_generated BOOLEAN
workflow_id      UUID (optional, for workflow-related messages)
created_at       TIMESTAMPTZ
```

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Verify authentication is working
4. Ensure database tables are created with correct schema
5. Test RLS policies are active and correct

---

**Last Updated**: November 1, 2025
**Version**: 1.0

