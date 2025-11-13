# Database Setup Instructions for AI Chat

## Overview
The AI chat feature now uses Supabase database for persistent storage of chat conversations and messages.

## Setup Steps

### 1. Access Supabase SQL Editor
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to the **SQL Editor** section in the left sidebar
3. Click **New Query**

### 2. Run the AI Chat Schema Migration
1. Open the file: `database/ai-chat-schema.sql`
2. Copy all the SQL content from that file
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### 3. Verify Tables Were Created
1. Go to **Table Editor** in Supabase
2. You should see two new tables:
   - `ai_chat_conversations` - Stores chat session information
   - `ai_chat_messages` - Stores individual messages

### 4. Check Row Level Security (RLS)
The migration automatically enables RLS with policies that ensure:
- Users can only see their own conversations
- Users can only create/update/delete their own messages
- All data is properly isolated by user

## What This Enables

✅ **Persistent Chat History**: Messages are saved to database and never disappear  
✅ **Cross-Device Access**: Access your chats from any device  
✅ **Recent Chats**: Browse all your previous conversations  
✅ **Reliable Storage**: Database backup ensures no data loss  
✅ **Fast Access**: localStorage cache for instant loading  

## How It Works

The system uses a **dual-layer persistence strategy**:

1. **Primary Storage (Database)**: All messages are permanently saved to Supabase
2. **Cache Layer (localStorage)**: Recent messages cached for instant access
3. **Load Strategy**: Loads from database first, falls back to cache
4. **Save Strategy**: Saves to both database and cache simultaneously

## Troubleshooting

### If tables already exist
If you see an error that tables already exist, that's fine! The `IF NOT EXISTS` clauses will skip creation.

### If you get permission errors
Make sure you're logged in as the database owner in Supabase.

### If chats aren't persisting
1. Check browser console for errors
2. Verify you're authenticated (logged in)
3. Check that RLS policies are enabled
4. Try refreshing the page

## Optional: Running Main Schema
If you haven't set up the main database schema yet, you should also run:
1. Open `database/schema.sql`
2. Run it in Supabase SQL Editor
3. This creates the users table and other core tables

## Verification

After setup, test by:
1. Sending a message in the AI chat
2. Refreshing the page - messages should persist
3. Checking the `ai_chat_conversations` table in Supabase - you should see your chat
4. Checking the `ai_chat_messages` table - you should see your messages

