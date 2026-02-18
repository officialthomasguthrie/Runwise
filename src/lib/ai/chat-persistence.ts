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
    
    const { error } = await (supabase
      .from('ai_chat_conversations') as any)
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
    
    // First, verify the conversation exists and belongs to the current user
    // This is required by RLS policies
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Check if conversation exists
    const { data: conversation, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      // Conversation doesn't exist - create it first
      console.log('Conversation does not exist, creating it before saving message');
      const { success, error } = await saveConversation(
        conversationId,
        'New Chat',
        user.id
      );
      
      if (!success) {
        console.error('Failed to create conversation before saving message:', error);
        return { success: false, error: error || 'Failed to create conversation' };
      }
    } else {
      // Verify conversation belongs to current user
      const conv = conversation as { id: string; user_id: string };
      if (conv.user_id !== user.id) {
        // Conversation exists but belongs to a different user
        return { success: false, error: 'Conversation does not belong to current user' };
      }
    }
    
    // Now save the message
    const { error } = await (supabase
      .from('ai_chat_messages') as any)
      .upsert({
        id: message.id,
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        workflow_generated: message.workflowGenerated || false,
        workflow_id: message.workflowId || null,
        is_paywall_message: message.isPaywallMessage || false,
        created_at: message.timestamp,
      }, { onConflict: 'id' });

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
 * Delete messages in a conversation created after a specific timestamp (exclusive)
 */
export async function deleteMessagesAfter(
  conversationId: string,
  timestamp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('ai_chat_messages')
      .delete()
      .eq('conversation_id', conversationId)
      .gt('created_at', timestamp);

    if (error) {
      console.error('Error deleting future messages:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteMessagesAfter:', error);
    return { success: false, error: error.message };
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

    const messages: ChatMessage[] = (data || []).map((msg: any) => {
      const chatMsg: ChatMessage = {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        workflowGenerated: msg.workflow_generated,
        workflowId: msg.workflow_id,
        isPaywallMessage: msg.is_paywall_message || false,
      };
      
      // Reconstruct workflow generation messages by checking content patterns
      // If it's a workflow-generated message, check if it's the success or summary message
      if (msg.workflow_generated) {
        // Check if this is a step progress message (contains JSON step progress data)
        try {
          const parsed = JSON.parse(msg.content);
          // If it's valid JSON and has step progress structure, mark it as step progress
          if (parsed && typeof parsed === 'object' && (
            'intent' in parsed || 'node-matching' in parsed || 'workflow-configuration' in parsed
          )) {
            (chatMsg as any).isStepProgress = true;
          }
        } catch (e) {
          // Not JSON, continue with other checks
        }
        
        // Check if this is the "Workflow Generated Successfully" message
        if (msg.content === 'Workflow Generated Successfully') {
          (chatMsg as any).workflowGeneratedSuccess = true;
        }
        // Check if this is the summary (reasoning) message
        // Summary messages come after the success message and contain the AI's explanation
        // We'll identify them by checking if they follow a workflow generation pattern
        else if (msg.content && !msg.content.includes('has been generated and added to your canvas') && 
                 msg.content !== 'Workflow Generated Successfully' && !(chatMsg as any).isStepProgress) {
          // This is likely the summary message
          (chatMsg as any).workflowGeneratedSummary = true;
        }
      }
      
      // Also check if this is a paywall message by content pattern (for backward compatibility)
      // This ensures old paywall messages without the flag still work
      if (!chatMsg.isPaywallMessage && msg.content === 'Your workflow is ready. Upgrade to continue.') {
        chatMsg.isPaywallMessage = true;
      }
      
      return chatMsg;
    });

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
    const { error } = await (supabase
      .from('ai_chat_conversations') as any)
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

