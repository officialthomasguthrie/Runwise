"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Clock, 
  MoreHorizontal, 
  Send,
  Loader2,
  AlertCircle,
  Trash2,
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/auth-context';
import type { ChatMessage } from '@/lib/ai/types';
import { 
  saveConversation, 
  saveMessage, 
  loadConversations, 
  loadMessages, 
  deleteConversation,
  type ChatConversation,
  updateConversationTitle,
  deleteAllConversationsForCurrentUser,
  deleteMessagesAfter
} from '@/lib/ai/chat-persistence';

interface AIChatSidebarProps {
  onWorkflowGenerated?: (workflow: { nodes: any[]; edges: any[]; workflowName?: string }) => void;
  initialPrompt?: string | null;
  getCurrentWorkflow?: () => { nodes: any[]; edges: any[] };
}

/**
 * AI Chat Sidebar - Full Featured Chat Interface
 * 
 * Supports:
 * - Real-time AI conversation
 * - Workflow generation detection
 * - Hybrid node generation (library + custom)
 * - Message history with database persistence
 * - Chat history browsing
 */
export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ onWorkflowGenerated, initialPrompt, getCurrentWorkflow }) => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string>(() => `chat_${Date.now()}`);
  const [workflowPrompt, setWorkflowPrompt] = useState<string | null>(null);
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);
  const [workflowJson, setWorkflowJson] = useState<string | null>(null);
  const [isJsonExpanded, setIsJsonExpanded] = useState(false);
  
  // Chat history state
  const [allConversations, setAllConversations] = useState<ChatConversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [openTabs, setOpenTabs] = useState<ChatConversation[]>([]);
  // Show recent chats by default when no tabs are open
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [hasUnsavedMessages, setHasUnsavedMessages] = useState(false);
  
  // Auto-show recent chats when no tabs are open
  useEffect(() => {
    if (openTabs.length === 0) {
      // Only update if we're not already showing recent chats
      if (!showChatHistory) {
        setShowChatHistory(true);
      }
      // Clear messages when no tabs are open
      if (messages.length > 0) {
        setMessages([]);
      }
    } else {
      // If there are tabs and we're showing recent chats, hide it
      // Only if the active conversation is in the open tabs
      if (showChatHistory && openTabs.some(t => t.id === activeConversationId)) {
        setShowChatHistory(false);
      }
    }
  }, [openTabs.length]);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  
  // Message editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState<string>('');
  const editingTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messageBoxRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [hasOverflow, setHasOverflow] = useState<Map<string, boolean>>(new Map());
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNewConversation = useRef(true);
  const hasProcessedInitialPrompt = useRef(false);
  const titleGeneratedRef = useRef(false);
  const shortTitleGeneratedRef = useRef(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Auto-resize editing textarea based on content (max 85px)
  useEffect(() => {
    if (editingTextareaRef.current && editingMessageId) {
      editingTextareaRef.current.style.height = 'auto';
      const scrollHeight = editingTextareaRef.current.scrollHeight;
      const maxHeight = 85; // Same as bottom textbox
      editingTextareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [editingMessageContent, editingMessageId]);

  // Check for text overflow in message boxes
  useEffect(() => {
    const checkOverflow = () => {
      const newHasOverflow = new Map<string, boolean>();
      messageBoxRefs.current.forEach((element, messageId) => {
        if (element) {
          const hasOverflow = element.scrollHeight > element.clientHeight;
          newHasOverflow.set(messageId, hasOverflow);
        }
      });
      setHasOverflow(newHasOverflow);
    };
    
    checkOverflow();
    
    // Check on window resize
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadUserConversations();
    }
  }, [user]);

  // Cleanup: Delete empty conversations when navigating away or unmounting
  const previousConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentId = activeConversationId;
    const previousId = previousConversationIdRef.current;
    
    // If we switched conversations, check if the previous one was empty
    if (previousId && previousId !== currentId) {
      // Check if previous conversation had messages
      loadMessages(previousId).then(({ messages }) => {
        if (messages.length === 0) {
          // Delete empty conversation
          deleteConversation(previousId).then(() => {
            // Reload conversations list
            loadUserConversations();
          });
        }
      });
    }
    
    // Update the ref for next time
    previousConversationIdRef.current = currentId;

    // Cleanup on unmount: delete current empty conversation if it has no messages
    return () => {
      if (currentId) {
        loadMessages(currentId).then(({ messages }) => {
          if (messages.length === 0) {
            deleteConversation(currentId).catch(console.error);
          }
        }).catch(console.error);
      }
    };
  }, [activeConversationId]);

  // Auto-send initial prompt from dashboard
  useEffect(() => {
    if (initialPrompt && user && !hasProcessedInitialPrompt.current && !isLoading) {
      console.log('🚀 Auto-sending initial prompt:', initialPrompt);
      hasProcessedInitialPrompt.current = true;
      
      // Set input value and trigger send after a short delay to ensure component is ready
      setInputValue(initialPrompt);
      setTimeout(() => {
        // Manually trigger the send
        const sendInitialPrompt = async () => {
          if (!user) return;

          const userMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: initialPrompt.trim(),
            timestamp: new Date().toISOString(),
          };

          // Add user message
          setMessages((prev) => [...prev, userMessage]);
          setInputValue('');
          setIsLoading(true);
          setError(null);

          // Ensure conversation exists before inserting message
          const conversationTitle = 'New Chat';
          const { success, error } = await saveConversation(
            activeConversationId,
            conversationTitle,
            user.id
          );

          if (!success) {
            console.error('Failed to create conversation before auto message:', error);
            setIsLoading(false);
            setError(error || 'Failed to create conversation');
            return;
          }

          await saveMessage(userMessage, activeConversationId);

          isNewConversation.current = false;

          const newTab: ChatConversation = {
            id: activeConversationId,
            title: conversationTitle,
            user_id: user.id,
            created_at: new Date().toISOString(),
          } as ChatConversation;
          setOpenTabs((prev) => {
            const withoutDup = prev.filter(t => t.id !== activeConversationId);
            const updated = [...withoutDup, newTab];
            return updated.slice(-5);
          });

          setShowChatHistory(false);

          loadUserConversations();

          // Generate title from first user message for new chats (in background, don't wait)
          shortTitleGeneratedRef.current = true;
          generateShortTitle(userMessage.content).then((shortTitle) => {
            if (shortTitle) {
              updateConversationTitle(activeConversationId, shortTitle);
              setConversationTitleEverywhere(activeConversationId, shortTitle);
            }
          }).catch((err) => {
            console.error('Error generating short title:', err);
          });

          // Create streaming AI message placeholder with "Thinking..." initially
          const aiMessageId = `msg_${Date.now()}`;
          const aiMessage: ChatMessage = {
            id: aiMessageId,
            role: 'assistant',
            content: 'Thinking...',
            timestamp: new Date().toISOString(),
          };

          // Add "Thinking..." message that will be updated incrementally when text arrives
          setMessages((prev) => [...prev, aiMessage]);

          try {

            // Call AI chat API with streaming
            const response = await fetch('/api/ai/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: userMessage.content,
                chatId: activeConversationId,
                conversationHistory: [],
              }),
            });

            if (!response.ok) {
              const errorData = await safeParseJSON(response);
              throw new Error(errorData.error || 'Failed to get AI response');
            }

            if (!response.body) {
              throw new Error('Response body is null');
            }

            // Read the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullMessage = '';

            while (true) {
              const { done, value } = await reader.read();
              
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6).trim();
                  // Skip empty or incomplete JSON
                  if (!jsonStr || jsonStr.length === 0) continue;
                  
                  try {
                    const data = JSON.parse(jsonStr);
                    
                    if (data.type === 'chunk') {
                      fullMessage += data.content;
                      // Update the message incrementally, replacing "Thinking..." with actual content
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === aiMessageId
                            ? { ...msg, content: fullMessage }
                            : msg
                        )
                      );
                    } else if (data.type === 'complete') {
                      fullMessage = data.message;
                      // Final update with complete message
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === aiMessageId
                            ? { ...msg, content: fullMessage }
                            : msg
                        )
                      );

                      // Save complete AI message to database
                      const completeAiMessage: ChatMessage = {
                        id: aiMessageId,
                        role: 'assistant',
                        content: fullMessage,
                        timestamp: new Date().toISOString(),
                      };
                      await saveMessage(completeAiMessage, activeConversationId);

                      // Generate AI-based title once, using the earliest available content
                      // Skip if we already generated a short title from the user's first message
                      if (!titleGeneratedRef.current && !shortTitleGeneratedRef.current) {
                        titleGeneratedRef.current = true;
                        const source = messages.length > 0 ? messages[0].content : fullMessage;
                        const aiTitle = await requestAiTitle(source);
                        const finalTitle = aiTitle || generateConversationTitle(source);
                        await updateConversationTitle(activeConversationId, finalTitle);
                        setConversationTitleEverywhere(activeConversationId, finalTitle);
                      }

                      // Check if workflow generation is suggested
                      if (data.metadata?.shouldGenerateWorkflow && data.metadata?.workflowPrompt) {
                        setWorkflowPrompt(data.metadata.workflowPrompt);
                        // Don't auto-generate - wait for user to click the button
                        console.log('🎯 Workflow generation ready. Waiting for user to click Generate button.');
                      }
                    } else if (data.type === 'error') {
                      throw new Error(data.error || 'Stream error');
                    }
                  } catch (parseError) {
                    // Only log if it's not an empty/incomplete JSON error
                    if (jsonStr.length > 0) {
                      console.error('Error parsing stream data:', parseError, 'JSON string:', jsonStr.substring(0, 100));
                    }
                  }
                }
              }
            }
          } catch (err: any) {
            console.error('Error sending initial prompt:', err);
            setError(err.message || 'Failed to send message');
            
            // Remove the incomplete AI message and add error message
            setMessages((prev) => {
              const filtered = prev.filter((msg) => msg.id !== aiMessageId);
              return [
                ...filtered,
                {
                  id: `msg_${Date.now()}`,
                  role: 'assistant',
                  content: `Sorry, I encountered an error: ${err.message}`,
                  timestamp: new Date().toISOString(),
                },
              ];
            });
          } finally {
            setIsLoading(false);
          }
        };

        sendInitialPrompt();
      }, 100);
    }
  }, [initialPrompt, user, isLoading]);

  // Load conversations function
  const loadUserConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const { conversations, error } = await loadConversations();
      if (error) {
        console.warn('Could not load conversations:', error);
      } else {
        setAllConversations(conversations);
        setOpenTabs((prev) => {
          if (prev.length > 0) return prev;
          // Keep only the 5 most recent
          return (conversations || []).slice(0, 5);
        });
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Create new conversation
  const createNewConversation = () => {
    const newId = `chat_${Date.now()}`;
    setActiveConversationId(newId);
    setMessages([]);
    setWorkflowPrompt(null);
    setError(null);
    setHasUnsavedMessages(false);
    isNewConversation.current = true;
    titleGeneratedRef.current = false;
    shortTitleGeneratedRef.current = false;
    setShowChatHistory(false);

    // Open a new tab for this conversation immediately (don't save to DB yet)
    const newTab: ChatConversation = {
      id: newId,
      title: 'New Chat',
      user_id: user?.id ?? '',
      created_at: new Date().toISOString(),
    } as ChatConversation;
    setOpenTabs((prev) => {
      const withoutDup = prev.filter(t => t.id !== newId);
      const updated = [...withoutDup, newTab];
      // Keep only the last 5 (most recent at end)
      return updated.slice(-5);
    });

    // Don't persist empty conversations - will be saved when first message is sent
  };

  // Switch to existing conversation
  const switchToConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setMessages([]);
    setIsLoading(true);
    setShowChatHistory(false);
    
    // Ensure this conversation is in open tabs
    setOpenTabs((prev) => {
      const fromAll = allConversations.find(c => c.id === conversationId);
      const newTab: ChatConversation = fromAll || {
        id: conversationId,
        title: 'New Chat',
        user_id: user?.id ?? '',
        created_at: new Date().toISOString(),
      } as ChatConversation;

      // Move to end if exists; else add; then cap to 5
      const without = prev.filter(t => t.id !== conversationId);
      const updated = [...without, newTab];
      return updated.slice(-5);
    });
    
    try {
      const { messages: loadedMessages } = await loadMessages(conversationId);
      setMessages(loadedMessages);
      isNewConversation.current = false;
      setHasUnsavedMessages(false);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const closeTab = async (conversationId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Check if this conversation has any messages
    const { messages: conversationMessages } = await loadMessages(conversationId);
    
    // If no messages, delete the conversation from database
    if (conversationMessages.length === 0) {
      await deleteConversation(conversationId);
    }
    
    setOpenTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== conversationId);
      // If we closed the active tab, switch to the last remaining tab if any
      if (conversationId === activeConversationId && remaining.length > 0) {
        const nextActive = remaining[remaining.length - 1].id;
        setActiveConversationId(nextActive);
      }
      // If no tabs left, show recent chats
      if (remaining.length === 0) {
        setShowChatHistory(true);
      }
      return remaining;
    });
    
    // Reload conversations list to reflect deletions
    loadUserConversations();
  };

  // Open delete confirmation modal
  const handleDeleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setShowDeleteModal(true);
  };

  // Confirm and delete conversation
  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;

    try {
      const { success } = await deleteConversation(conversationToDelete);
      if (success) {
        setAllConversations(prev => prev.filter(c => c.id !== conversationToDelete));
        
        // Close the tab if it's open
        setOpenTabs((prev) => {
          const remaining = prev.filter((t) => t.id !== conversationToDelete);
          // If we closed the active tab, switch to the last remaining tab if any
          if (conversationToDelete === activeConversationId) {
            if (remaining.length > 0) {
              const nextActive = remaining[remaining.length - 1].id;
              setActiveConversationId(nextActive);
            } else {
              // No tabs left, show recent chats
              setShowChatHistory(true);
              createNewConversation();
            }
          }
          return remaining;
        });
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setError('Failed to delete conversation');
    } finally {
      setShowDeleteModal(false);
      setConversationToDelete(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  const clearAllHistory = () => {
    setShowClearAllModal(true);
  };

  const confirmClearAllHistory = async () => {
    try {
      const { success, error } = await deleteAllConversationsForCurrentUser();
      if (!success) {
        setError(error || 'Failed to clear history');
        return;
      }
      setAllConversations([]);
      setOpenTabs([]);
      setMessages([]);
      isNewConversation.current = true;
      titleGeneratedRef.current = false;
      shortTitleGeneratedRef.current = false;
      setShowChatHistory(true);
    } catch (err: any) {
      console.error('Error clearing history:', err);
      setError(err.message || 'Failed to clear history');
    } finally {
      setShowClearAllModal(false);
    }
  };

  const cancelClearAllHistory = () => setShowClearAllModal(false);

  // Helper function to safely parse JSON from response
  const safeParseJSON = async (response: Response): Promise<any> => {
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    // If response is empty, return error
    if (!text || text.trim().length === 0) {
      return { error: 'Empty response from server' };
    }
    
    // If response is not JSON, return error object with text
    if (!contentType || !contentType.includes('application/json')) {
      return { error: text || 'Invalid response format' };
    }
    
    // Try to parse as JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      // If parsing fails, return the text as error
      return { error: text || 'Failed to parse response' };
    }
  };

  // Generate conversation title from first message
  const generateConversationTitle = (message: string): string => {
    // Take first 50 characters or first line, whichever is shorter
    const firstLine = message.split('\n')[0];
    const truncated = firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;
    return truncated || 'New Chat';
  };

  const requestAiTitle = async (sourceText: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `You are a helpful assistant. Generate a concise, 4-7 word title for the following chat content. Only return the title text with no quotes or extra text. Content:\n\n${sourceText}`,
          chatId: `${activeConversationId}-title`,
          conversationHistory: [],
        }),
      });
      if (!res.ok) return null;
      const data = await safeParseJSON(res);
      if (data.error) return null;
      const content: string | undefined = data?.message?.content || data?.content || data?.text;
      if (!content) return null;
      const title = content.split('\n')[0].trim().replace(/^"|"$/g, '');
      return title.length > 0 ? title : null;
    } catch {
      return null;
    }
  };

  // Generate a 3-5 word title from the user's first message
  const generateShortTitle = async (userMessage: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `You are a helpful assistant. Generate a concise 3-5 word title that summarizes what the user is asking or wants to do. Only return the title text with no quotes, periods, or extra text. User message:\n\n${userMessage}`,
          chatId: `${activeConversationId}-short-title`,
          conversationHistory: [],
        }),
      });
      if (!res.ok) return null;
      if (!res.body) return null;

      // Read the stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            // Skip empty or incomplete JSON
            if (!jsonStr || jsonStr.length === 0) continue;
            
            try {
              const data = JSON.parse(jsonStr);
              if (data.type === 'chunk') {
                fullMessage += data.content;
              } else if (data.type === 'complete') {
                fullMessage = data.message;
                break;
              } else if (data.type === 'error') {
                return null;
              }
            } catch (parseError) {
              // Only log if it's not an empty/incomplete JSON error
              if (jsonStr.length > 0) {
                console.error('Error parsing stream data:', parseError);
              }
            }
          }
        }
      }

      if (!fullMessage) return null;
      const title = fullMessage.split('\n')[0].trim().replace(/^"|"$|\.$/g, '');
      // Ensure it's 3-5 words
      const words = title.split(/\s+/).filter(w => w.length > 0);
      if (words.length >= 3 && words.length <= 5) {
        return words.join(' ');
      }
      // If not 3-5 words, truncate or pad as needed
      if (words.length > 5) {
        return words.slice(0, 5).join(' ');
      }
      if (words.length < 3 && words.length > 0) {
        return title; // Return as-is if less than 3 words
      }
      return null;
    } catch {
      return null;
    }
  };

  const setConversationTitleEverywhere = (conversationId: string, title: string) => {
    setAllConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title } : c));
    setOpenTabs(prev => prev.map(t => t.id === conversationId ? { ...t, title } : t));
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !user) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // Track if this is a new conversation
    const isFirstMessage = isNewConversation.current;

    // Ensure the conversation exists before saving the first message (RLS requires it)
    if (isFirstMessage) {
      const conversationTitle = 'New Chat';
      const { success, error } = await saveConversation(
        activeConversationId,
        conversationTitle,
        user.id
      );

      if (!success) {
        console.error('Failed to create conversation before first message:', error);
        setIsLoading(false);
        setError(error || 'Failed to create conversation');
        return;
      }

      isNewConversation.current = false;
      loadUserConversations();
    }

    // Save user message to database
    await saveMessage(userMessage, activeConversationId);

    // Generate title from first user message for new chats (in background, don't wait)
    if (isFirstMessage) {
      // This is the first message in a new conversation - generate title
      shortTitleGeneratedRef.current = true;
      generateShortTitle(userMessage.content).then((shortTitle) => {
        if (shortTitle) {
          updateConversationTitle(activeConversationId, shortTitle);
          setConversationTitleEverywhere(activeConversationId, shortTitle);
        }
      }).catch((err) => {
        console.error('Error generating short title:', err);
      });
    }

    // Create streaming AI message placeholder with "Thinking..." initially
    const aiMessageId = `msg_${Date.now()}`;
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: 'Thinking...',
      timestamp: new Date().toISOString(),
    };

    // Add "Thinking..." message that will be updated incrementally when text arrives
    setMessages((prev) => [...prev, aiMessage]);

    try {

      // Call AI chat API with streaming
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          chatId: activeConversationId,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        const errorData = await safeParseJSON(response);
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            // Skip empty or incomplete JSON
            if (!jsonStr || jsonStr.length === 0) continue;
            
            try {
              const data = JSON.parse(jsonStr);
              
              if (data.type === 'chunk') {
                fullMessage += data.content;
                // Update the message incrementally, replacing "Thinking..." with actual content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: fullMessage }
                      : msg
                  )
                );
              } else if (data.type === 'complete') {
                fullMessage = data.message;
                // Final update with complete message
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: fullMessage }
                      : msg
                  )
                );

                // Save complete AI message to database
                const completeAiMessage: ChatMessage = {
                  id: aiMessageId,
                  role: 'assistant',
                  content: fullMessage,
                  timestamp: new Date().toISOString(),
                };
                await saveMessage(completeAiMessage, activeConversationId);

                // Generate AI-based title once, using the earliest available content
                // Skip if we already generated a short title from the user's first message
                if (!titleGeneratedRef.current && !shortTitleGeneratedRef.current) {
                  titleGeneratedRef.current = true;
                  const source = messages.length > 0 ? messages[0].content : fullMessage;
                  const aiTitle = await requestAiTitle(source);
                  const finalTitle = aiTitle || generateConversationTitle(source);
                  await updateConversationTitle(activeConversationId, finalTitle);
                  setConversationTitleEverywhere(activeConversationId, finalTitle);
                }

                // Check if workflow generation is suggested
                if (data.metadata?.shouldGenerateWorkflow && data.metadata?.workflowPrompt) {
                  setWorkflowPrompt(data.metadata.workflowPrompt);
                }
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Stream error');
              }
            } catch (parseError) {
              // Only log if it's not an empty/incomplete JSON error
              if (jsonStr.length > 0) {
                console.error('Error parsing stream data:', parseError, 'JSON string:', jsonStr.substring(0, 100));
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      
      // Remove the incomplete AI message and add error message
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== aiMessageId);
        return [
          ...filtered,
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I encountered an error: ${err.message}`,
            timestamp: new Date().toISOString(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAndSend = async (messageId: string, newContent: string, timestamp: string) => {
    if (!newContent.trim() || isLoading || !user) return;
    
    setIsLoading(true);
    setEditingMessageId(null);
    
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
        setIsLoading(false);
        return;
    }
    
    const updatedMessage = {
        ...messages[messageIndex],
        content: newContent.trim()
    };
    
    // Keep messages up to this one (history + updated message)
    const newHistory = messages.slice(0, messageIndex);
    const newMessagesState = [...newHistory, updatedMessage];
    
    setMessages(newMessagesState);
    
    const aiMessageId = `msg_${Date.now()}`;

    try {
        // Update the edited message
        await saveMessage(updatedMessage, activeConversationId);
        // Delete everything after it
        await deleteMessagesAfter(activeConversationId, timestamp);
        
        const aiMessage: ChatMessage = {
          id: aiMessageId,
          role: 'assistant',
          content: 'Thinking...',
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: newContent.trim(),
            chatId: activeConversationId,
            conversationHistory: newHistory,
          }),
        });

        if (!response.ok) {
          const errorData = await safeParseJSON(response);
          throw new Error(errorData.error || 'Failed to get AI response');
        }

        if (!response.body) throw new Error('Response body is null');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullMessage = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              
              try {
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'chunk') {
                  fullMessage += data.content;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMessageId
                        ? { ...msg, content: fullMessage }
                        : msg
                    )
                  );
                } else if (data.type === 'complete') {
                  fullMessage = data.message;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMessageId
                        ? { ...msg, content: fullMessage }
                        : msg
                    )
                  );

                  const completeAiMessage: ChatMessage = {
                    id: aiMessageId,
                    role: 'assistant',
                    content: fullMessage,
                    timestamp: new Date().toISOString(),
                  };
                  await saveMessage(completeAiMessage, activeConversationId);

                  if (data.metadata?.shouldGenerateWorkflow && data.metadata?.workflowPrompt) {
                    setWorkflowPrompt(data.metadata.workflowPrompt);
                  }
                } else if (data.type === 'error') {
                  throw new Error(data.error || 'Stream error');
                }
              } catch (parseError) {
                 if (jsonStr.length > 0) {
                    console.error('Error parsing stream data:', parseError);
                 }
              }
            }
          }
        }

    } catch (err: any) {
        console.error('Error in edit and send:', err);
        setError(err.message || 'Failed to send message');
        
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== aiMessageId);
          return [
            ...filtered,
            {
              id: `msg_${Date.now()}`,
              role: 'assistant',
              content: `Sorry, I encountered an error: ${err.message}`,
              timestamp: new Date().toISOString(),
            },
          ];
        });
    } finally {
        setIsLoading(false);
    }
  };

  const generateWorkflow = async () => {
    if (!workflowPrompt || !user) return;

    setIsGeneratingWorkflow(true);
    setError(null);
    setWorkflowJson('');
    setIsJsonExpanded(false);

    // Add initial message indicating workflow generation has started
    const generatingMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: 'Generating your workflow...',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, generatingMessage]);

    try {
      // Get current workflow state if available
      const currentWorkflow = getCurrentWorkflow ? getCurrentWorkflow() : { nodes: [], edges: [] };
      
      // Call workflow generation API with streaming
      const response = await fetch('/api/ai/generate-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: workflowPrompt,
          availableNodes: [], // API will fetch all available nodes
          currentWorkflow: currentWorkflow, // Send current workflow context
        }),
      });

      if (!response.ok) {
        const errorData = await safeParseJSON(response);
        throw new Error(errorData.error || 'Failed to generate workflow');
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedJson = '';
      let finalWorkflow: any = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            // Skip empty or incomplete JSON
            if (!jsonStr || jsonStr.length === 0) continue;
            
            try {
              const data = JSON.parse(jsonStr);
              
              if (data.type === 'json-chunk') {
                // Update JSON in real-time as it streams
                accumulatedJson = data.content;
                const workflowData = {
                  nodes: [],
                  edges: [],
                  workflowName: '',
                };
                
                // Try to parse the accumulated JSON (might be incomplete)
                try {
                  const parsed = JSON.parse(accumulatedJson);
                  workflowData.nodes = parsed.nodes || [];
                  workflowData.edges = parsed.edges || [];
                  workflowData.workflowName = parsed.workflowName || 'Untitled Workflow';
                } catch {
                  // JSON is incomplete, just show what we have
                }
                
                // Format and display the JSON (even if incomplete)
                setWorkflowJson(JSON.stringify(workflowData, null, 2));
              } else if (data.type === 'complete') {
                // Final workflow received
                finalWorkflow = data.workflow;
                const workflowData = {
                  nodes: data.workflow.nodes,
                  edges: data.workflow.edges,
                  workflowName: data.workflow.workflowName,
                };
                setWorkflowJson(JSON.stringify(workflowData, null, 2));
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Stream error');
              }
            } catch (parseError) {
              // Only log if it's not an empty/incomplete JSON error
              if (jsonStr.length > 0) {
                console.error('Error parsing stream data:', parseError);
              }
            }
          }
        }
      }

      if (!finalWorkflow) {
        throw new Error('Workflow generation incomplete');
      }

      // Notify parent component
      if (onWorkflowGenerated) {
        onWorkflowGenerated({
          nodes: finalWorkflow.nodes,
          edges: finalWorkflow.edges,
          workflowName: finalWorkflow.workflowName,
        });
      }

      // Remove the "Generating..." message and add success message
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== generatingMessage.id);
        return [
          ...filtered,
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Workflow "${finalWorkflow.workflowName}" has been generated and added to your canvas! ${finalWorkflow.reasoning || ''}`,
            timestamp: new Date().toISOString(),
            workflowGenerated: true,
          },
        ];
      });
      setWorkflowPrompt(null);
    } catch (err: any) {
      console.error('Error generating workflow:', err);
      setError(err.message || 'Failed to generate workflow');
      setWorkflowJson(null);
      
      // Remove the "Generating..." message and add error message
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== generatingMessage.id);
        return [
          ...filtered,
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I couldn't generate the workflow: ${err.message}`,
            timestamp: new Date().toISOString(),
          },
        ];
      });
    } finally {
      setIsGeneratingWorkflow(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full w-full max-w-full flex flex-col bg-background/95 backdrop-blur-sm overflow-x-hidden min-w-0">
      {/* Top Bar - Action Icons */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-background/50">
        {/* Header / Tabs */}
        {showChatHistory ? (
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">AI Assistant</h2>
          </div>
        ) : (
          <div
            className="flex-1 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex items-center gap-1">
              {(() => {
                const activeId = activeConversationId;
                const activeTab = openTabs.find(t => t.id === activeId) || null;
                const otherTabs = openTabs.filter(t => t.id !== activeId);
                const remainingSlots = 5 - (activeTab ? 1 : 0);
                const limitedOthers = remainingSlots > 0 ? otherTabs.slice(-remainingSlots) : [];
                const renderTabs = activeTab ? [activeTab, ...limitedOthers] : limitedOthers;
                return renderTabs;
              })().map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => switchToConversation(tab.id)}
                  className={`group relative inline-flex items-center px-3 py-1.5 rounded-md text-xs border ${
                    tab.id === activeConversationId
                      ? 'bg-muted text-foreground border-border'
                      : 'text-muted-foreground border-transparent'
                  }`}
                  title={tab.title}
                >
                  {/* Title area capped to 14ch but can be shorter */}
                  <span className="inline-block max-w-[14ch] truncate">
                    {tab.title.length <= 14 ? tab.title : `${tab.title.slice(0, 14)}...`}
                  </span>
                  {/* Reserve fixed space for X so layout doesn't shift */}
                  <span
                    className="ml-2 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    onClick={(e) => closeTab(tab.id, e)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Icons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            title="New Chat"
            onClick={createNewConversation}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${
              showChatHistory
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground'
            }`}
            title="Chat History"
            onClick={() => setShowChatHistory(!showChatHistory)}
          >
            <Clock className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={loadUserConversations}>
                Refresh History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMessages([])}>
                Clear Current Chat
              </DropdownMenuItem>
              {showChatHistory && (
                <DropdownMenuItem onClick={clearAllHistory}>
                  Clear All History
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat History Panel - Full Screen */}
      {showChatHistory ? (
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-background/50 overflow-x-hidden">
          <ScrollArea className="flex-1 h-full overflow-y-auto overflow-x-hidden max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex-1 min-h-[320px] px-3 py-4 space-y-2">
              {isLoadingConversations ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : allConversations.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center space-y-2 px-4">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
                  <div>
                    <p className="text-sm font-medium text-foreground">No chats yet</p>
                    <p className="text-xs text-muted-foreground">Start a new conversation to see it here.</p>
                  </div>
                </div>
              ) : (
                allConversations.map((conversation) => {
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => switchToConversation(conversation.id)}
                      className={`group relative w-full text-left px-3 py-2 rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl transition-all duration-300 text-foreground ${
                        conversation.id === activeConversationId
                          ? 'shadow-sm ring-1 ring-stone-300 dark:ring-white/30'
                          : 'hover:shadow-sm hover:border-stone-300 dark:hover:border-white/30'
                      }`}
                    >
                      <span className="pr-8 text-sm font-medium leading-tight whitespace-pre-wrap break-words">
                        {conversation.title}
                      </span>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conversation.id, e as any);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            // Create a synthetic mouse event for handleDeleteConversation
                            const syntheticEvent = {
                              stopPropagation: () => e.stopPropagation(),
                            } as React.MouseEvent;
                            handleDeleteConversation(conversation.id, syntheticEvent);
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-red-500 opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-red-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <>
          {/* Main Chat Area */}
          <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
        <div className="py-4 space-y-4">
          {messages.length === 0 && (
            null
          )}

          {messages.map((message, messageIndex) => {
            return (
              <React.Fragment key={message.id}>
                <div
                  className={message.role === 'user' ? 'w-full' : 'flex gap-3 justify-start'}
                >
                  {message.role === 'user' ? (
                    // User message - editable textbox
                    <div className="w-full pl-0 pr-1">
                      {editingMessageId === message.id ? (
                        <div className="relative w-full">
                          <textarea
                            ref={editingTextareaRef}
                            value={editingMessageContent}
                            onChange={(e) => setEditingMessageContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleEditAndSend(message.id, editingMessageContent, message.timestamp);
                              }
                              if (e.key === 'Escape') {
                                setEditingMessageId(null);
                                setEditingMessageContent(message.content);
                              }
                            }}
                            className="w-full bg-muted/50 border border-border rounded-lg outline-none resize-none text-sm text-foreground py-3 px-4 pr-12 focus:border-stone-300 dark:focus:border-white/30 focus:ring-0 transition-all scrollbar-hide overflow-y-auto"
                            style={{
                              minHeight: '48px',
                              maxHeight: '85px',
                              lineHeight: '1.5',
                              scrollbarWidth: 'none',
                              msOverflowStyle: 'none'
                            }}
                            autoFocus
                          />
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAndSend(message.id, editingMessageContent, message.timestamp);
                            }}
                            size="icon"
                            variant="ghost"
                            className="absolute right-2 bottom-2 h-8 w-8 text-foreground hover:text-foreground hover:bg-transparent disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Send Message"
                            disabled={!editingMessageContent.trim() || isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div
                          ref={(el) => {
                            if (el) {
                              messageBoxRefs.current.set(message.id, el);
                            } else {
                              messageBoxRefs.current.delete(message.id);
                            }
                          }}
                          onClick={() => {
                            setEditingMessageId(message.id);
                            setEditingMessageContent(message.content);
                          }}
                          className="w-full bg-muted/50 border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl rounded-lg px-4 py-3 cursor-text transition-all duration-300 overflow-hidden relative"
                          style={{ 
                            maxHeight: '85px',
                            minHeight: '48px',
                            height: 'auto',
                            display: 'flex',
                            alignItems: 'flex-start',
                            paddingTop: '12px'
                          }}
                        >
                          <p 
                            className="text-sm text-foreground whitespace-pre-wrap overflow-hidden"
                            style={{
                              lineHeight: '1.5',
                              display: '-webkit-box',
                              WebkitLineClamp: 4,
                              WebkitBoxOrient: 'vertical',
                              textOverflow: 'ellipsis',
                              width: '100%',
                              marginTop: '0'
                            }}
                          >
                            {message.content}
                          </p>
                          {hasOverflow.get(message.id) && (
                            <div 
                              className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-lg bg-gradient-to-b from-transparent to-white dark:to-black"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // AI message - plain text with markdown bold support
                    <div className="max-w-[95%] rounded-lg px-4 py-2 bg-transparent text-foreground">
                      {message.content === 'Thinking...' ? (
                        <p 
                          className="text-sm whitespace-pre-wrap inline-block"
                          style={{
                            background: 'linear-gradient(90deg, hsl(var(--muted-foreground)) 0%, hsl(var(--muted-foreground) / 0.8) 25%, hsl(var(--muted-foreground) / 0.4) 50%, hsl(var(--muted-foreground) / 0.8) 75%, hsl(var(--muted-foreground)) 100%)',
                            backgroundSize: '200% 100%',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            animation: 'shimmer 2s ease-in-out infinite',
                          }}
                        >
                          {message.content}
                        </p>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content.split(/(\*\*.*?\*\*)/g).map((part, index) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              // Remove asterisks and make bold
                              const boldText = part.slice(2, -2);
                              return <strong key={index}>{boldText}</strong>;
                            }
                            return <span key={index}>{part}</span>;
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {/* Loading state is now handled by showing the streaming message */}

          {/* Workflow Generation Button - Only show if last message is from AI and mentions generating */}
          {workflowPrompt && !isGeneratingWorkflow && (() => {
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || lastMessage.role !== 'assistant') return false;
            
            const content = lastMessage.content.toLowerCase();
            const mentionsGenerate = content.includes('generate') || 
                                    content.includes('click') ||
                                    content.includes('ready') ||
                                    content.includes('would you like');
            
            return mentionsGenerate;
           })() && (
             <div className="flex justify-center py-2">
               <Button
                 onClick={generateWorkflow}
                 variant="outline"
                 className="gap-2 bg-background text-foreground border-border hover:bg-accent hover:text-foreground px-10"
                 size="lg"
               >
                 Generate Workflow
               </Button>
             </div>
           )}

          {isGeneratingWorkflow && (
            <div className="flex justify-center py-2">
              <Button 
                disabled 
                variant="outline"
                className="gap-2 bg-background text-foreground border-border px-10"
                size="lg"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Workflow...
              </Button>
            </div>
          )}
          
          {/* JSON Preview - Show below the generating button and persist after generation */}
          {workflowJson && (
            <div className="flex gap-3 justify-start mt-2 px-4">
              <div className="max-w-[95%] w-full">
                <button
                  onClick={() => setIsJsonExpanded(!isJsonExpanded)}
                  className="w-full text-left bg-muted/30 border border-border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Workflow JSON</span>
                      {isGeneratingWorkflow && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {isJsonExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className={`px-3 pb-2 overflow-hidden transition-all ${isJsonExpanded ? 'max-h-none' : 'max-h-[7.5rem]'}`}>
                    <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-words overflow-x-auto">
                      {isJsonExpanded ? workflowJson : (() => {
                        const lines = workflowJson.split('\n');
                        if (lines.length <= 5) {
                          return workflowJson;
                        }
                        // Show the last 5 lines
                        const last5Lines = lines.slice(-5).join('\n');
                        return `...\n${last5Lines}`;
                      })()}
                    </pre>
                  </div>
                </button>
              </div>
            </div>
          )}
          
          {/* Show "Waiting for JSON..." placeholder when generating but no JSON yet */}
          {isGeneratingWorkflow && !workflowJson && (
            <div className="flex gap-3 justify-start mt-2 px-4">
              <div className="max-w-[95%] w-full">
                <div className="w-full text-left bg-muted/30 border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Workflow JSON</span>
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                  <div className="px-3 pb-2">
                    <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-words overflow-x-auto">
                      <span className="text-muted-foreground italic">Waiting for JSON...</span>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex gap-2 items-start bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area - Positioned at bottom */}
      <div className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
        <div className="p-4">
          {/* Input Box */}
          <div className="relative">
            <div className="flex items-end gap-2 rounded-lg transition-all">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  className="w-full bg-transparent border border-border/50 rounded-lg outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/60 py-3 px-4 pr-12 focus:border-stone-300 dark:focus:border-white/30 focus:ring-0 transition-all scrollbar-hide disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto"
                  rows={1}
                  style={{
                    height: '75px',
                    lineHeight: '1.5',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                />
                
                {/* Send Button - Positioned inside textarea */}
                <Button
                  onClick={sendMessage}
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 bottom-2 h-8 w-8 text-foreground hover:text-foreground hover:bg-transparent disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Send Message"
                  disabled={!inputValue.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={cancelDelete}
          />
          
          {/* Modal */}
          <div className="relative z-10 w-full max-w-md mx-4 bg-background border border-border rounded-lg shadow-lg p-6">
            <div className="space-y-4">
              {/* Icon and Title */}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    Delete Conversation
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently removed.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={cancelDelete}
                  className="min-w-[80px]"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteConversation}
                  className="min-w-[80px] gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All History Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={cancelClearAllHistory}
          />
          {/* Modal */}
          <div className="relative z-10 w-full max-w-md mx-4 bg-background border border-border rounded-lg shadow-lg p-6">
            <div className="space-y-4">
              {/* Icon and Title */}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    Clear All History
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete all of your conversations and messages. This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={cancelClearAllHistory}
                  className="min-w-[80px]"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmClearAllHistory}
                  className="min-w-[80px] gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
