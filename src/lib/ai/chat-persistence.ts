/**
 * AI Chat Persistence Helper
 * Functions for saving and loading chat conversations from the database
 */

import { createClient } from '@/lib/supabase-client';
import type { ChatMessage } from './types';

const getSupabaseClient = () => createClient();

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  preview: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

/**
 * Save a conversation to the database
 */
export async function saveConversation(
  conversationId: string,
  title: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    // Get authenticated user if userId not provided
    let user_id = userId;
    if (!user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user found');
        return { success: false, error: 'Not authenticated' };
      }
      user_id = user.id;
    }
    
    const { error } = await supabase
      .from('ai_chat_conversations')
      .upsert({
        id: conversationId,
        user_id: user_id,
        title,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (error) {
      // Check if table doesn't exist (gracefully fail)
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        console.warn('Database tables not yet created. Please run the migration. See database/SETUP_INSTRUCTIONS.md');
        return { success: false, error: 'Database not setup' };
      }
      console.error('Error saving conversation:', error.message || error.code || JSON.stringify(error));
      return { success: false, error: error.message || 'Unknown error' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in saveConversation:', error.message || error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Save a message to the database
 */
export async function saveMessage(
  message: ChatMessage,
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('ai_chat_messages')
      .insert({
        id: message.id,
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        workflow_generated: message.workflowGenerated || false,
        workflow_id: message.workflowId || null,
        created_at: message.timestamp,
      });

    if (error) {
      // Check if table doesn't exist (gracefully fail)
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        // Silently fail - localStorage will handle persistence
        return { success: false, error: 'Database not setup' };
      }
      console.error('Error saving message:', error.message || error.code || JSON.stringify(error));
      return { success: false, error: error.message || 'Unknown error' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in saveMessage:', error.message || error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Load messages for a conversation from the database
 */
export async function loadMessages(
  conversationId: string
): Promise<{ messages: ChatMessage[]; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return { messages: [], error: error.message };
    }

    const messages: ChatMessage[] = (data || []).map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at,
      workflowGenerated: msg.workflow_generated,
      workflowId: msg.workflow_id,
    }));

    return { messages };
  } catch (error: any) {
    console.error('Error in loadMessages:', error);
    return { messages: [], error: error.message };
  }
}

/**
 * Load all conversations for the current user
 * Only returns conversations that have at least one message
 */
export async function loadConversations(): Promise<{
  conversations: ChatConversation[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();
    
    // Load all conversations
    const { data, error } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return { conversations: [], error: error.message };
    }

    if (!data || data.length === 0) {
      return { conversations: [] };
    }

    // Filter out conversations with no messages
    const conversationsWithMessages = await Promise.all(
      (data || []).map(async (conv: any) => {
        // Check if this conversation has any messages
        const { data: messages } = await supabase
          .from('ai_chat_messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .limit(1);
        
        // Only include conversations that have at least one message
        return messages && messages.length > 0 ? conv : null;
      })
    );

    // Filter out null values
    const filtered = conversationsWithMessages.filter((c): c is ChatConversation => c !== null);

    return { conversations: filtered };
  } catch (error: any) {
    console.error('Error in loadConversations:', error);
    return { conversations: [], error: error.message };
  }
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('ai_chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteConversation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('ai_chat_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating conversation title:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateConversationTitle:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete all conversations (and messages) for the current user
 */
export async function deleteAllConversationsForCurrentUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return { success: false, error: authError.message };
    }
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Load all conversation IDs for this user
    const { data: convs, error: convErr } = await supabase
      .from('ai_chat_conversations')
      .select('id')
      .eq('user_id', user.id);

    if (convErr) {
      return { success: false, error: convErr.message };
    }

    const ids = (convs || []).map((c: any) => c.id);
    if (ids.length === 0) {
      return { success: true };
    }

    // Delete messages first (in case no ON DELETE CASCADE)
    const { error: msgErr } = await supabase
      .from('ai_chat_messages')
      .delete()
      .in('conversation_id', ids);
    if (msgErr && !msgErr.message?.includes('does not exist')) {
      return { success: false, error: msgErr.message };
    }

    // Delete conversations
    const { error: delErr } = await supabase
      .from('ai_chat_conversations')
      .delete()
      .in('id', ids);
    if (delErr) {
      return { success: false, error: delErr.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteAllConversationsForCurrentUser:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

