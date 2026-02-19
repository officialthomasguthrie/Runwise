"use client";

import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
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
  ChevronUp,
  ArrowUp,
  CheckCircle2,
  XCircle
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
import type { ChatMessage, ClarificationQuestion, ClarificationAnalysis, QuestionnaireAnswer } from '@/lib/ai/types';
import { buildEnrichedPrompt } from '@/lib/ai/clarification';
import { detectWorkflowIntent } from '@/lib/ai/workflow-generator';
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
import { UpgradeRequiredModal } from '@/components/ui/upgrade-required-modal';
import { WorkflowQuestionnaire } from '@/components/ui/workflow-questionnaire';

interface AIChatSidebarProps {
  onWorkflowGenerated?: (workflow: { nodes: any[]; edges: any[]; workflowName?: string }) => void;
  onNodesConfigured?: (configurations: Array<{ nodeId: string; config: Record<string, any> }>) => void;
  initialPrompt?: string | null;
  getCurrentWorkflow?: () => { nodes: any[]; edges: any[] };
  externalMessage?: string | null;
  externalContext?: { fieldName?: string; nodeType?: string; nodeId?: string; workflowName?: string } | null;
  onExternalMessageSent?: () => void;
}

/**
 * Extract workflow prompt from AI response
 * Looks for workflow descriptions or falls back to user's original message
 */
function extractWorkflowPromptFromResponse(aiResponse: string): string | null {
  // Try to extract workflow description from AI response
  // Look for patterns like "I'll create a workflow that..." or "This workflow will..."
  const lowerResponse = aiResponse.toLowerCase();
  
  // If response mentions workflow creation, try to extract the description
  if (lowerResponse.includes('workflow')) {
    // Look for sentences that describe what the workflow does
    const sentences = aiResponse.split(/[.!?]\s+/);
    const workflowSentences = sentences.filter(s => 
      s.toLowerCase().includes('workflow') || 
      s.toLowerCase().includes('trigger') || 
      s.toLowerCase().includes('action')
    );
    
    if (workflowSentences.length > 0) {
      return workflowSentences.join('. ').trim();
    }
  }
  
  return null;
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
export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ 
  onWorkflowGenerated,
  onNodesConfigured,
  initialPrompt, 
  getCurrentWorkflow,
  externalMessage,
  externalContext,
  onExternalMessageSent
}) => {
  const { user, subscriptionTier } = useAuth();
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string>(() => `chat_${Date.now()}`);
  const [workflowPrompt, setWorkflowPrompt] = useState<string | null>(null);
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);
  const [workflowJson, setWorkflowJson] = useState<string | null>(null);
  const [isJsonExpanded, setIsJsonExpanded] = useState(false);
  
  // Pipeline step progress tracking
  type StepStatus = 'pending' | 'in-progress' | 'completed' | 'failed';
  interface StepProgress {
    status: StepStatus;
    error?: string;
  }
  const [stepProgress, setStepProgress] = useState<Record<string, StepProgress>>({
    'intent': { status: 'pending' },
    'node-matching': { status: 'pending' },
    'workflow-generation': { status: 'pending' },
    'node-configuration': { status: 'pending' },
    'code-generation': { status: 'pending' },
    'validation': { status: 'pending' },
  });
  const stepProgressMessageIdRef = useRef<string | null>(null);
  
  // Clarification questionnaire state
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [isAnalyzingClarification, setIsAnalyzingClarification] = useState(false);
  const [questionnaireOriginalPrompt, setQuestionnaireOriginalPrompt] = useState<string | null>(null);
  
  // Speculative pre-fetch: start clarification API call in parallel with AI chat response
  const pendingClarificationRef = useRef<{
    prompt: string;
    promise: Promise<ClarificationAnalysis | null>;
  } | null>(null);
  
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

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hasReachedFreeLimit, setHasReachedFreeLimit] = useState(false);
  const isFreePlan = !subscriptionTier || subscriptionTier === 'free';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Auto-scroll to bottom when questionnaire or loading state appears
  useEffect(() => {
    if (workflowPrompt || clarificationQuestions.length > 0 || isAnalyzingClarification) {
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          }
        }
      }, 100);
    }
  }, [workflowPrompt, clarificationQuestions, isAnalyzingClarification]);

  // Auto-resize editing textarea based on content (max 85px)
  useEffect(() => {
    if (editingTextareaRef.current && editingMessageId) {
      editingTextareaRef.current.style.height = 'auto';
      const scrollHeight = editingTextareaRef.current.scrollHeight;
      const maxHeight = 85; // Same as bottom textbox
      editingTextareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [editingMessageContent, editingMessageId]);

  // Auto-resize main input textarea based on content (max 2.5x default height)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const defaultHeight = 75; // Default height in pixels
      const maxHeight = defaultHeight * 2.5; // 2.5x max height
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);

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

  // Check if free user has reached workflow limit
  useEffect(() => {
    const checkFreeLimit = async () => {
      if (!user || !isFreePlan) {
        setHasReachedFreeLimit(false);
        return;
      }

      try {
        const response = await fetch('/api/workflows/check-free-limit');
        if (response.ok) {
          const data = await response.json();
          setHasReachedFreeLimit(data.hasReachedLimit || false);
        }
      } catch (error) {
        console.error('Error checking free limit:', error);
      }
    };

    checkFreeLimit();
  }, [user, isFreePlan]);

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

  // Auto-send initial prompt from dashboard (allowed for free users until they hit limit)
  useEffect(() => {
    if (isFreePlan && hasReachedFreeLimit) {
      // Don't auto-send for free users who have reached limit
      return;
    }
    if (initialPrompt && user && !hasProcessedInitialPrompt.current && !isLoading) {
      console.log('🚀 Auto-sending initial prompt:', initialPrompt);
      hasProcessedInitialPrompt.current = true;
      
      // Set input value and trigger send after a short delay to ensure component is ready
      setInputValue(initialPrompt);
      setTimeout(() => {
        // Manually trigger the send
        const sendInitialPrompt = async () => {
          if (!user || !ensureCanUseAI()) return;

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

          // Speculatively pre-fetch clarification if this looks like a workflow request
          if (detectWorkflowIntent(userMessage.content)) {
            startSpeculativeClarification(userMessage.content);
          }

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
                      // Filter out field-filling questions
                      console.log('🔍 Complete event received:', {
                        hasMetadata: !!data.metadata,
                        shouldGenerateWorkflow: data.metadata?.shouldGenerateWorkflow,
                        workflowPrompt: data.metadata?.workflowPrompt,
                        fullMetadata: data.metadata
                      });
                      
                      // Set workflowPrompt if:
                      // 1. API metadata indicates workflow generation, OR
                      // 2. AI response content suggests proposing a workflow (fallback detection)
                      const responseContent = fullMessage.toLowerCase();
                      const isFieldFillingQuestion = 
                        responseContent.includes('help me fill out') ||
                        responseContent.includes('help me with') ||
                        responseContent.includes('fill out the');
                      
                      // Check if AI is explicitly proposing a workflow (strict detection)
                      // Look for explicit proposal language, especially near the end of the message
                      const messageLength = fullMessage.length;
                      const lastThird = responseContent.slice(Math.floor(messageLength * 0.7)); // Last 30% of message
                      
                      const hasStrongProposalIndicator = !isFieldFillingQuestion && (
                        // Direct button mentions (most reliable)
                        (lastThird.includes('generate workflow') && lastThird.includes('button')) ||
                        (lastThird.includes('click') && lastThird.includes('generate') && lastThird.includes('button')) ||
                        (lastThird.includes('generate workflow') && (lastThird.includes('below') || lastThird.includes('button')))
                      );
                      
                      // Only trust metadata for workflow proposals (API has better detection)
                      // Only use content analysis if metadata is missing but we have strong indicators
                      const isProposingWorkflow = 
                        (data.metadata?.shouldGenerateWorkflow && data.metadata?.workflowPrompt) ||
                        (hasStrongProposalIndicator && !data.metadata?.shouldGenerateWorkflow); // Only use as fallback if metadata doesn't indicate it
                      
                      if (isProposingWorkflow && !isFieldFillingQuestion) {
                        // Use workflowPrompt from metadata if available, otherwise extract from message or use original user message
                        const promptToUse = data.metadata?.workflowPrompt || 
                                          extractWorkflowPromptFromResponse(fullMessage) || 
                                          (messages.length > 1 ? messages[messages.length - 2]?.content : '');
                        console.log('🎯 Workflow intent detected (initial prompt). Triggering clarification with:', promptToUse);
                        triggerClarification(promptToUse);
                      } else {
                        if (isFieldFillingQuestion) {
                          console.log('🚫 Not showing workflow button - this is a field-filling question');
                        } else {
                          console.log('❌ No workflow intent detected (initial prompt):', {
                            shouldGenerateWorkflow: data.metadata?.shouldGenerateWorkflow,
                            hasWorkflowPrompt: !!data.metadata?.workflowPrompt,
                            responsePreview: fullMessage.substring(0, 100)
                          });
                        }
                        setWorkflowPrompt(null);
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
  }, [initialPrompt, user, isLoading, isFreePlan]);

  // Handle external messages from Ask AI button (disabled only if free user has reached limit)
  const hasProcessedExternalMessage = useRef<string | null>(null);
  useEffect(() => {
    // Reset ref when external message is cleared
    if (!externalMessage) {
      hasProcessedExternalMessage.current = null;
      return;
    }
    
    if (isFreePlan && hasReachedFreeLimit) {
      // For free users who have reached limit, just show the upgrade modal when Ask AI is triggered
      setShowUpgradeModal(true);
      return;
    }
    
    if (externalMessage && user && !isLoading && hasProcessedExternalMessage.current !== externalMessage) {
      hasProcessedExternalMessage.current = externalMessage;
      
      // Build the message with context
      let messageContent = externalMessage;
      if (externalContext) {
        const contextParts: string[] = [];
        if (externalContext.fieldName) {
          contextParts.push(`Field: ${externalContext.fieldName}`);
        }
        if (externalContext.nodeType) {
          contextParts.push(`Node Type: ${externalContext.nodeType}`);
        }
        if (externalContext.workflowName) {
          contextParts.push(`Workflow: ${externalContext.workflowName}`);
        }
        if (contextParts.length > 0) {
          messageContent += `\n\nContext: ${contextParts.join(', ')}`;
        }
      }

      // Get or create conversation ID
      let conversationId = activeConversationId;
      const isFirstMessage = isNewConversation.current;
      
      if (isFirstMessage) {
        // Create a new conversation ID
        conversationId = `chat_${Date.now()}`;
        setActiveConversationId(conversationId);
        setMessages([]);
        setWorkflowPrompt(null);
        setError(null);
        setHasUnsavedMessages(false);
        isNewConversation.current = true;
        titleGeneratedRef.current = false;
        shortTitleGeneratedRef.current = false;
        setShowChatHistory(false);

        // Open a new tab for this conversation immediately
        const newTab: ChatConversation = {
          id: conversationId,
          title: 'New Chat',
          user_id: user?.id ?? '',
          created_at: new Date().toISOString(),
        } as ChatConversation;
        setOpenTabs((prev) => {
          const withoutDup = prev.filter(t => t.id !== conversationId);
          const updated = [...withoutDup, newTab];
          return updated.slice(-5);
        });
      }

      // Set input value and send after a short delay
      setInputValue(messageContent);
      setTimeout(() => {
        const sendExternalMsg = async () => {
          if (!user || !ensureCanUseAI()) return;

          const userMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: messageContent.trim(),
            timestamp: new Date().toISOString(),
          };

          // Add user message
          setMessages((prev) => [...prev, userMessage]);
          setInputValue('');
          setIsLoading(true);
          setError(null);

          // Ensure the conversation exists before saving the first message
          if (isFirstMessage) {
            const conversationTitle = 'New Chat';
            const { success, error } = await saveConversation(
              conversationId,
              conversationTitle,
              user.id
            );

            if (!success) {
              console.error('Failed to create conversation before external message:', error);
              setIsLoading(false);
              setError(error || 'Failed to create conversation');
              return;
            }

            isNewConversation.current = false;
            loadUserConversations();
          }

          // Save user message to database
          await saveMessage(userMessage, conversationId);

          // Generate title from first user message for new chats
          if (isFirstMessage) {
            shortTitleGeneratedRef.current = true;
            generateShortTitle(userMessage.content).then((shortTitle) => {
              if (shortTitle) {
                updateConversationTitle(conversationId, shortTitle);
                setConversationTitleEverywhere(conversationId, shortTitle);
              }
            }).catch((err) => {
              console.error('Error generating short title:', err);
            });
          }

          // Create streaming AI message placeholder
          const aiMessageId = `msg_${Date.now()}`;
          const aiMessage: ChatMessage = {
            id: aiMessageId,
            role: 'assistant',
            content: 'Thinking...',
            timestamp: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, aiMessage]);

          try {
            // Build enhanced message with context for AI
            let enhancedMessage = externalMessage;
            if (externalContext) {
              const contextInfo: string[] = [];
              if (externalContext.fieldName) {
                contextInfo.push(`The user is asking about the "${externalContext.fieldName}" field`);
              }
              if (externalContext.nodeType) {
                contextInfo.push(`in a "${externalContext.nodeType}" node`);
              }
              if (externalContext.workflowName) {
                contextInfo.push(`within the "${externalContext.workflowName}" workflow`);
              }
              if (contextInfo.length > 0) {
                enhancedMessage += `. ${contextInfo.join(', ')}.`;
              }
            }

            // Call AI chat API with streaming and context
            const response = await fetch('/api/ai/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: enhancedMessage,
                chatId: conversationId,
                conversationHistory: messages,
                context: externalContext ? {
                  fieldName: externalContext.fieldName,
                  nodeType: externalContext.nodeType,
                  nodeId: externalContext.nodeId,
                  workflowName: externalContext.workflowName,
                } : undefined,
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
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6).trim();
                  if (!jsonStr || jsonStr.length === 0) continue;
                  
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
                      await saveMessage(completeAiMessage, conversationId);

                      if (!titleGeneratedRef.current && !shortTitleGeneratedRef.current) {
                        titleGeneratedRef.current = true;
                        const source = messages.length > 0 ? messages[0].content : fullMessage;
                        const aiTitle = await requestAiTitle(source);
                        const finalTitle = aiTitle || generateConversationTitle(source);
                        await updateConversationTitle(conversationId, finalTitle);
                        setConversationTitleEverywhere(conversationId, finalTitle);
                      }

                      // Set workflowPrompt if AI detects workflow intent
                      // Filter out field-filling questions (Ask AI button)
                      console.log('🔍 Complete event received (sendMessage):', {
                        hasMetadata: !!data.metadata,
                        shouldGenerateWorkflow: data.metadata?.shouldGenerateWorkflow,
                        workflowPrompt: data.metadata?.workflowPrompt,
                        fullMetadata: data.metadata
                      });
                      
                      // Set workflowPrompt if:
                      // 1. API metadata indicates workflow generation (most reliable)
                      // Only use content analysis as fallback if metadata is not available
                      const responseContent = fullMessage.toLowerCase();
                      // Don't show for field-filling questions (Ask AI button)
                      const isFieldFillingQuestion = 
                        responseContent.includes('help me fill out') ||
                        responseContent.includes('help me with') ||
                        responseContent.includes('fill out the') ||
                        (externalMessage && (
                          responseContent.includes('api key') ||
                          responseContent.includes('field') ||
                          responseContent.includes('configuration')
                        ));
                      
                      // Check if AI is explicitly proposing a workflow (strict detection)
                      // Look for explicit proposal language, especially near the end of the message
                      const messageLength = fullMessage.length;
                      const lastThird = responseContent.slice(Math.floor(messageLength * 0.7)); // Last 30% of message
                      
                      const hasStrongProposalIndicator = !isFieldFillingQuestion && (
                        // Direct button mentions (most reliable)
                        (lastThird.includes('generate workflow') && lastThird.includes('button')) ||
                        (lastThird.includes('click') && lastThird.includes('generate') && lastThird.includes('button')) ||
                        (lastThird.includes('generate workflow') && (lastThird.includes('below') || lastThird.includes('button')))
                      );
                      
                      // Only trust metadata for workflow proposals (API has better detection)
                      // Only use content analysis if metadata is missing but we have strong indicators
                      const isProposingWorkflow = 
                        (data.metadata?.shouldGenerateWorkflow && data.metadata?.workflowPrompt) ||
                        (hasStrongProposalIndicator && !data.metadata?.shouldGenerateWorkflow); // Only use as fallback if metadata doesn't indicate it
                      
                      if (isProposingWorkflow && !isFieldFillingQuestion) {
                        // Use workflowPrompt from metadata if available, otherwise extract from message or use original user message
                        const promptToUse = data.metadata?.workflowPrompt || 
                                          extractWorkflowPromptFromResponse(fullMessage) || 
                                          (messages.length > 1 ? messages[messages.length - 2]?.content : '');
                        console.log('🎯 Workflow intent detected (sendMessage). Triggering clarification with:', promptToUse);
                        triggerClarification(promptToUse);
                      } else {
                        if (isFieldFillingQuestion) {
                          console.log('🚫 Not showing workflow button - this is a field-filling question');
                        } else {
                          console.log('❌ No workflow intent detected (sendMessage):', {
                            shouldGenerateWorkflow: data.metadata?.shouldGenerateWorkflow,
                            hasWorkflowPrompt: !!data.metadata?.workflowPrompt,
                            responsePreview: fullMessage.substring(0, 100)
                          });
                        }
                        setWorkflowPrompt(null);
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

            // Notify that message was sent
            if (onExternalMessageSent) {
              onExternalMessageSent();
            }
          } catch (err: any) {
            console.error('Error sending external message:', err);
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

        sendExternalMsg();
      }, 100);
    }
  }, [externalMessage, externalContext, user, isLoading, onExternalMessageSent]);

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
    setClarificationQuestions([]);
    setQuestionnaireOriginalPrompt(null);
    pendingClarificationRef.current = null;
    setError(null);
    setHasUnsavedMessages(false);
    isNewConversation.current = true;
    titleGeneratedRef.current = false;
    shortTitleGeneratedRef.current = false;
    setShowChatHistory(false);
    // Reset pipeline step progress for new conversation
    setStepProgress({
      'intent': { status: 'pending' },
      'node-matching': { status: 'pending' },
      'workflow-generation': { status: 'pending' },
      'node-configuration': { status: 'pending' },
      'code-generation': { status: 'pending' },
      'validation': { status: 'pending' },
    });
    stepProgressMessageIdRef.current = null;

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
    
    // Reset step progress state before loading new conversation
    setStepProgress({
      'intent': { status: 'pending' },
      'node-matching': { status: 'pending' },
      'workflow-generation': { status: 'pending' },
      'node-configuration': { status: 'pending' },
      'code-generation': { status: 'pending' },
      'validation': { status: 'pending' },
    });
    stepProgressMessageIdRef.current = null;

    try {
      const { messages: loadedMessages } = await loadMessages(conversationId);
      
      // Deduplicate step progress messages: keep only the LAST one (has the final state)
      const stepProgressMessages = loadedMessages.filter((msg) => (msg as any).isStepProgress);
      let deduplicatedMessages = loadedMessages;
      
      if (stepProgressMessages.length > 1) {
        // Keep only the last step progress message, remove all earlier ones
        const lastStepMsg = stepProgressMessages[stepProgressMessages.length - 1];
        deduplicatedMessages = loadedMessages.filter(
          (msg) => !(msg as any).isStepProgress || msg.id === lastStepMsg.id
        );
      }
      
      // Restore step progress from the last step progress message
      const lastStepProgressMsg = stepProgressMessages[stepProgressMessages.length - 1];
      if (lastStepProgressMsg && lastStepProgressMsg.content) {
        try {
          const restoredStepProgress = JSON.parse(lastStepProgressMsg.content);
          // Convert any "in-progress" steps to "completed" since the pipeline
          // is no longer running when restoring from a saved conversation
          const finalizedProgress: Record<string, { status: string; error?: string }> = {};
          for (const [key, value] of Object.entries(restoredStepProgress)) {
            const step = value as { status: string; error?: string };
            if (step.status === 'in-progress') {
              finalizedProgress[key] = { status: 'completed' };
            } else {
              finalizedProgress[key] = step;
            }
          }
          setStepProgress(finalizedProgress as any);
          stepProgressMessageIdRef.current = lastStepProgressMsg.id;
          
          // Also update the message content with the finalized progress
          // so the next save persists the corrected state
          const msgIndex = deduplicatedMessages.findIndex(m => m.id === lastStepProgressMsg.id);
          if (msgIndex >= 0) {
            deduplicatedMessages[msgIndex] = {
              ...deduplicatedMessages[msgIndex],
              content: JSON.stringify(finalizedProgress),
            };
          }
        } catch (e) {
          console.error('Error parsing step progress from message:', e);
        }
      }
      
      setMessages(deduplicatedMessages);
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

  const ensureCanUseAI = () => {
    if (!user) {
      return false;
    }
    // Only block if free user has reached their workflow limit
    if (isFreePlan && hasReachedFreeLimit) {
      // Don't show modal here, paywall message is already shown in chat
      return false;
    }
    // Allow free users to chat (they just can't generate workflows after limit)
    return true;
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    if (!user) return;
    
    // Only block if free user has reached their workflow limit
    if (isFreePlan && hasReachedFreeLimit) {
      // Paywall is active, don't allow sending messages
      return;
    }
    
    if (!ensureCanUseAI()) return;

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
    
    // Clear workflow prompt and questionnaire when user sends a new message
    setWorkflowPrompt(null);
    setClarificationQuestions([]);
    setQuestionnaireOriginalPrompt(null);
    pendingClarificationRef.current = null;
          
          // Clear workflow prompt for external messages (Ask AI)
          if (externalMessage) {
            setWorkflowPrompt(null);
          }

    // Track if this is a new conversation
    const isFirstMessage = isNewConversation.current;

    // Ensure the conversation exists before saving the first message (RLS requires it)
    if (isFirstMessage && user) {
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

    // Speculatively pre-fetch clarification if this looks like a workflow request
    if (detectWorkflowIntent(userMessage.content)) {
      startSpeculativeClarification(userMessage.content);
    }

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

                // ═══════════════════════════════════════════════════════════
                // WORKFLOW INTENT DETECTION — runs FIRST, before any async ops
                // This MUST run before saveMessage/requestAiTitle which are slow async calls
                // ═══════════════════════════════════════════════════════════
                console.log('━━━━━━ COMPLETE EVENT (regular send) ━━━━━━');
                console.log('📨 Server metadata:', {
                  shouldGenerateWorkflow: data.metadata?.shouldGenerateWorkflow,
                  workflowPrompt: data.metadata?.workflowPrompt?.substring(0, 80),
                  hasMetadata: !!data.metadata,
                });
                console.log('📝 AI response (last 200 chars):', fullMessage.substring(Math.max(0, fullMessage.length - 200)));

                // Check for configuration intent
                const userMessage = messages.length >= 2 ? messages[messages.length - 2]?.content : '';
                const userMessageLower = userMessage.toLowerCase();
                const fullMessageLower = fullMessage.toLowerCase();
                
                const hasConfigurationKeywords = userMessageLower.includes('set') ||
                  userMessageLower.includes('configure') ||
                  userMessageLower.includes('fill in') ||
                  userMessageLower.includes('fill out') ||
                  userMessageLower.includes('api key') ||
                  userMessageLower.includes('make it') ||
                  userMessageLower.includes('change') ||
                  userMessageLower.includes('update') ||
                  userMessageLower.includes('put') ||
                  userMessageLower.includes('use') ||
                  userMessageLower.includes('enter') ||
                  userMessageLower.includes('add');
                
                const hasValues = userMessageLower.match(/(?:is|to|as|:|=)\s*['"]?[\w\s@.-]+['"]?/i) ||
                  userMessageLower.includes('sk-') ||
                  userMessageLower.includes('@') ||
                  userMessageLower.match(/\d{1,2}:\d{2}/) ||
                  userMessageLower.match(/\d{4}-\d{2}-\d{2}/);
                
                const aiSuggestsConfig = fullMessageLower.includes('configure') ||
                  fullMessageLower.includes('setting') ||
                  fullMessageLower.includes('updated') ||
                  fullMessageLower.includes('filled') ||
                  fullMessageLower.includes("i'll set") ||
                  fullMessageLower.includes("i'll configure") ||
                  fullMessageLower.includes("i'll update") ||
                  fullMessageLower.includes("i'll fill") ||
                  fullMessageLower.includes("i will set") ||
                  fullMessageLower.includes("i will configure") ||
                  fullMessageLower.includes("i will update") ||
                  fullMessageLower.includes("i will fill") ||
                  (fullMessageLower.includes('setting') && fullMessageLower.includes('to')) ||
                  (fullMessageLower.includes('configuring') && fullMessageLower.includes('with'));
                
                const shouldConfigure = userMessage && hasConfigurationKeywords && (hasValues || aiSuggestsConfig);

                const currentWorkflow = getCurrentWorkflow ? getCurrentWorkflow() : { nodes: [], edges: [] };
                const hasExistingWorkflow = currentWorkflow.nodes.length > 0;
                const isWorkflowModification = data.metadata?.shouldGenerateWorkflow && 
                  data.metadata?.workflowPrompt &&
                  hasExistingWorkflow;
                
                const isInstructionOnly = fullMessageLower.includes('help me fill out') ||
                  (fullMessageLower.includes('help me with') && !hasValues) ||
                  (fullMessageLower.includes('fill out the') && !hasValues && !aiSuggestsConfig) ||
                  (fullMessageLower.includes('here\'s how') && !hasValues) ||
                  (fullMessageLower.includes('you can') && !hasValues);

                console.log('🧭 Decision variables:', {
                  shouldConfigure: !!shouldConfigure,
                  hasExistingWorkflow,
                  isWorkflowModification: !!isWorkflowModification,
                  isInstructionOnly,
                  serverSaysGenerate: data.metadata?.shouldGenerateWorkflow,
                  serverWorkflowPrompt: !!data.metadata?.workflowPrompt,
                });
                
                if (isWorkflowModification && !isInstructionOnly) {
                  console.log('🚀 → Branch: AUTO-MODIFY existing workflow');
                  setWorkflowPrompt(data.metadata.workflowPrompt);
                  setTimeout(() => {
                    generateWorkflow(data.metadata.workflowPrompt);
                  }, 100);
                } else if (shouldConfigure && getCurrentWorkflow && onNodesConfigured && !isWorkflowModification && !isInstructionOnly) {
                  console.log('🔧 → Branch: AUTO-CONFIGURE nodes');
                  handleNodeConfiguration(userMessage, fullMessage);
                } else if (data.metadata?.shouldGenerateWorkflow && data.metadata?.workflowPrompt) {
                  console.log('🎯 → Branch: NEW WORKFLOW — triggering clarification');
                  triggerClarification(data.metadata.workflowPrompt);
                } else {
                  console.log('❌ → Branch: NO WORKFLOW INTENT');
                  setWorkflowPrompt(null);
                }
                console.log('━━━━━━ END DECISION ━━━━━━');

                // ═══════════════════════════════════════════════════════════
                // PERSISTENCE — runs AFTER workflow detection (non-blocking)
                // Wrapped in try/catch so errors don't break anything
                // ═══════════════════════════════════════════════════════════
                try {
                  const completeAiMessage: ChatMessage = {
                    id: aiMessageId,
                    role: 'assistant',
                    content: fullMessage,
                    timestamp: new Date().toISOString(),
                  };
                  await saveMessage(completeAiMessage, activeConversationId);

                  if (!titleGeneratedRef.current && !shortTitleGeneratedRef.current) {
                    titleGeneratedRef.current = true;
                    const source = messages.length > 0 ? messages[0].content : fullMessage;
                    const aiTitle = await requestAiTitle(source);
                    const finalTitle = aiTitle || generateConversationTitle(source);
                    await updateConversationTitle(activeConversationId, finalTitle);
                    setConversationTitleEverywhere(activeConversationId, finalTitle);
                  }
                } catch (persistError) {
                  console.error('Non-critical error saving message/title:', persistError);
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
    if (!newContent.trim() || isLoading) return;
    if (!ensureCanUseAI()) return;
    
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

        // Speculatively pre-fetch clarification if edited message looks like a workflow request
        if (detectWorkflowIntent(newContent.trim())) {
          startSpeculativeClarification(newContent.trim());
        }
        
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

                  // ═══════════════════════════════════════════════════════════
                  // WORKFLOW INTENT DETECTION — runs FIRST (edit path)
                  // ═══════════════════════════════════════════════════════════
                  console.log('━━━━━━ COMPLETE EVENT (edit) ━━━━━━');
                  console.log('📨 Server metadata:', {
                    shouldGenerateWorkflow: data.metadata?.shouldGenerateWorkflow,
                    workflowPrompt: data.metadata?.workflowPrompt?.substring(0, 80),
                  });

                  const userMessage = messages.length >= 2 ? messages[messages.length - 2]?.content : '';
                  const userMessageLower = userMessage.toLowerCase();
                  const fullMessageLower = fullMessage.toLowerCase();
                  
                  const hasConfigurationKeywords = userMessageLower.includes('set') ||
                    userMessageLower.includes('configure') ||
                    userMessageLower.includes('fill in') ||
                    userMessageLower.includes('fill out') ||
                    userMessageLower.includes('api key') ||
                    userMessageLower.includes('make it') ||
                    userMessageLower.includes('change') ||
                    userMessageLower.includes('update') ||
                    userMessageLower.includes('put') ||
                    userMessageLower.includes('use') ||
                    userMessageLower.includes('enter') ||
                    userMessageLower.includes('add');
                  
                  const hasValues = userMessageLower.match(/(?:is|to|as|:|=)\s*['"]?[\w\s@.-]+['"]?/i) ||
                    userMessageLower.includes('sk-') ||
                    userMessageLower.includes('@') ||
                    userMessageLower.match(/\d{1,2}:\d{2}/) ||
                    userMessageLower.match(/\d{4}-\d{2}-\d{2}/);
                  
                  const aiSuggestsConfig = fullMessageLower.includes('configure') ||
                    fullMessageLower.includes('setting') ||
                    fullMessageLower.includes('updated') ||
                    fullMessageLower.includes('filled');
                  
                  const shouldConfigure = userMessage && hasConfigurationKeywords && (hasValues || aiSuggestsConfig);

                  const currentWorkflow = getCurrentWorkflow ? getCurrentWorkflow() : { nodes: [], edges: [] };
                  const hasExistingWorkflow = currentWorkflow.nodes.length > 0;
                  const isWorkflowModification = data.metadata?.shouldGenerateWorkflow && 
                    data.metadata?.workflowPrompt &&
                    hasExistingWorkflow;
                  
                  const isInstructionOnly = fullMessageLower.includes('help me fill out') ||
                    (fullMessageLower.includes('help me with') && !hasValues) ||
                    (fullMessageLower.includes('fill out the') && !hasValues && !aiSuggestsConfig) ||
                    (fullMessageLower.includes('here\'s how') && !hasValues) ||
                    (fullMessageLower.includes('you can') && !hasValues);
                  
                  if (isWorkflowModification && !isInstructionOnly) {
                    console.log('🚀 → Branch: AUTO-MODIFY (edit)');
                    setWorkflowPrompt(data.metadata.workflowPrompt);
                    setTimeout(() => {
                      generateWorkflow(data.metadata.workflowPrompt);
                    }, 100);
                  } else if (shouldConfigure && getCurrentWorkflow && onNodesConfigured && !isWorkflowModification && !isInstructionOnly) {
                    console.log('🔧 → Branch: AUTO-CONFIGURE (edit)');
                    handleNodeConfiguration(userMessage, fullMessage);
                  } else if (data.metadata?.shouldGenerateWorkflow && data.metadata?.workflowPrompt) {
                    console.log('🎯 → Branch: NEW WORKFLOW (edit) — triggering clarification');
                    triggerClarification(data.metadata.workflowPrompt);
                  } else {
                    console.log('❌ → Branch: NO WORKFLOW INTENT (edit)');
                    setWorkflowPrompt(null);
                  }
                  console.log('━━━━━━ END DECISION (edit) ━━━━━━');

                  // Persistence (non-blocking)
                  try {
                    const completeAiMessage: ChatMessage = {
                      id: aiMessageId,
                      role: 'assistant',
                      content: fullMessage,
                      timestamp: new Date().toISOString(),
                    };
                    await saveMessage(completeAiMessage, activeConversationId);
                  } catch (persistError) {
                    console.error('Non-critical error saving message:', persistError);
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

  const handleNodeConfiguration = async (userMessage: string, aiResponse: string) => {
    console.log('🔧 handleNodeConfiguration called with:', { userMessage, hasGetCurrentWorkflow: !!getCurrentWorkflow, hasOnNodesConfigured: !!onNodesConfigured });
    
    if (!getCurrentWorkflow || !onNodesConfigured) {
      console.error('❌ Missing getCurrentWorkflow or onNodesConfigured');
      return;
    }

    // Initialize configuration step progress
    setStepProgress({
      'workflow-configuration': { status: 'in-progress' },
    });
    
    // Create or get step progress message ID
    const configStepProgressId = `config-step-progress_${Date.now()}`;
    stepProgressMessageIdRef.current = configStepProgressId;
    
    // Create step progress message
    const stepProgressMsg = {
      id: configStepProgressId,
      role: 'assistant' as const,
      content: JSON.stringify({ 'workflow-configuration': { status: 'in-progress' } }),
      timestamp: new Date().toISOString(),
      isStepProgress: true,
    } as ChatMessage & { isStepProgress: boolean };
    
    setMessages((prev) => {
      const existingIndex = prev.findIndex((msg: any) => msg.id === configStepProgressId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = stepProgressMsg;
        return updated;
      }
      return [...prev, stepProgressMsg];
    });

    try {
      const currentWorkflow = getCurrentWorkflow();
      console.log('🔧 Current workflow has', currentWorkflow.nodes.length, 'nodes');
      console.log('🔧 Nodes:', currentWorkflow.nodes.map(n => ({ id: n.id, nodeId: (n.data as any)?.nodeId, label: (n.data as any)?.label })));
      
      const response = await fetch('/api/ai/configure-nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage,
          currentWorkflow,
          conversationHistory: messages.slice(-5).map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to configure nodes:', response.status, errorText);
        
        // Mark step as failed
        setStepProgress({
          'workflow-configuration': { status: 'failed', error: errorText },
        });
        
        const failedStepProgressMsg = {
          id: configStepProgressId,
          role: 'assistant' as const,
          content: JSON.stringify({ 'workflow-configuration': { status: 'failed', error: errorText } }),
          timestamp: new Date().toISOString(),
          isStepProgress: true,
        } as ChatMessage & { isStepProgress: boolean };
        
        setMessages((prev) => {
          const existingIndex = prev.findIndex((msg: any) => msg.id === configStepProgressId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = failedStepProgressMsg;
            return updated;
          }
          return [...prev, failedStepProgressMsg];
        });
        
        return;
      }

      const result = await response.json();
      console.log('🔧 API response:', result);
      
      // Apply configurations if they exist, even if needsInput is true
      // (needsInput might be true because other fields still need to be filled)
      if (result.configurations && result.configurations.length > 0) {
        console.log('✅ Applying', result.configurations.length, 'configurations:', result.configurations);
        // Apply configurations
        onNodesConfigured(result.configurations);
        
        // Mark step as completed
        setStepProgress({
          'workflow-configuration': { status: 'completed' },
        });
        
        const completedStepProgressMsg = {
          id: configStepProgressId,
          role: 'assistant' as const,
          content: JSON.stringify({ 'workflow-configuration': { status: 'completed' } }),
          timestamp: new Date().toISOString(),
          isStepProgress: true,
        } as ChatMessage & { isStepProgress: boolean };
        
        setMessages((prev) => {
          const existingIndex = prev.findIndex((msg: any) => msg.id === configStepProgressId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = completedStepProgressMsg;
            return updated;
          }
          return [...prev, completedStepProgressMsg];
        });
        
        // Add a summary message showing what was configured
        const configSummary = result.summary || result.message || 'Workflow configured successfully';
        setMessages((prev) => [
          ...prev,
          {
            id: `config_${Date.now()}`,
            role: 'assistant',
            content: configSummary,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else if (result.needsInput) {
        console.log('⚠️ AI needs more input and no configurations to apply');
        // Mark step as failed (needs input)
        setStepProgress({
          'workflow-configuration': { status: 'failed', error: 'More information needed' },
        });
        
        const failedStepProgressMsg = {
          id: configStepProgressId,
          role: 'assistant' as const,
          content: JSON.stringify({ 'workflow-configuration': { status: 'failed', error: 'More information needed' } }),
          timestamp: new Date().toISOString(),
          isStepProgress: true,
        } as ChatMessage & { isStepProgress: boolean };
        
        setMessages((prev) => {
          const existingIndex = prev.findIndex((msg: any) => msg.id === configStepProgressId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = failedStepProgressMsg;
            return updated;
          }
          return [...prev, failedStepProgressMsg];
        });
        
        // AI needs more information - it will ask in the response
        // Don't return early - let the AI response be shown
      } else {
        console.warn('⚠️ No configurations in API response');
        // Mark step as failed
        setStepProgress({
          'workflow-configuration': { status: 'failed', error: 'No configurations returned' },
        });
      }
    } catch (error: any) {
      console.error('❌ Error configuring nodes:', error);
      
      // Mark step as failed
      setStepProgress({
        'workflow-configuration': { status: 'failed', error: error.message || 'Configuration failed' },
      });
      
      const failedStepProgressMsg = {
        id: configStepProgressId,
        role: 'assistant' as const,
        content: JSON.stringify({ 'workflow-configuration': { status: 'failed', error: error.message || 'Configuration failed' } }),
        timestamp: new Date().toISOString(),
        isStepProgress: true,
      } as ChatMessage & { isStepProgress: boolean };
      
      setMessages((prev) => {
        const existingIndex = prev.findIndex((msg: any) => msg.id === configStepProgressId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = failedStepProgressMsg;
          return updated;
        }
        return [...prev, failedStepProgressMsg];
      });
    }
  };

  /**
   * Speculatively start clarification API call in the background.
   * Called as soon as a user sends a message that looks like a workflow request,
   * so the result is ready by the time the AI chat response completes.
   */
  const startSpeculativeClarification = (prompt: string) => {
    console.log('[Clarification] 🚀 Starting speculative pre-fetch for:', prompt.substring(0, 80));
    
    const promise = fetch('/api/ai/clarification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        conversationHistory: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          console.error('[Clarification] Pre-fetch API error:', response.status);
          return null;
        }
        const analysis: ClarificationAnalysis = await response.json();
        console.log('[Clarification] ✅ Pre-fetch complete:', {
          needsClarification: analysis.needsClarification,
          questionCount: analysis.questions?.length ?? 0,
        });
        return analysis;
      })
      .catch((err) => {
        console.error('[Clarification] Pre-fetch error:', err);
        return null;
      });
    
    pendingClarificationRef.current = { prompt, promise };
  };

  /**
   * Trigger clarification analysis after workflow intent is confirmed by the AI.
   * Uses the pre-fetched result if available, otherwise makes a fresh call.
   */
  const triggerClarification = async (prompt: string) => {
    console.log('━━━ CLARIFICATION START ━━━');
    setQuestionnaireOriginalPrompt(prompt);
    
    // Check if we already have a pre-fetched result for this prompt
    let analysis: ClarificationAnalysis | null = null;
    const pending = pendingClarificationRef.current;
    
    if (pending) {
      console.log('[Clarification] Using pre-fetched result...');
      setIsAnalyzingClarification(true);
      analysis = await pending.promise;
      pendingClarificationRef.current = null;
    }
    
    // If pre-fetch failed or wasn't available, make a fresh call
    if (!analysis) {
      console.log('[Clarification] No pre-fetch available, calling API...');
      setIsAnalyzingClarification(true);
      try {
        const response = await fetch('/api/ai/clarification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            conversationHistory: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          }),
        });
        
        if (!response.ok) {
          console.error('[Clarification] API error:', response.status);
          setWorkflowPrompt(prompt);
          setTimeout(() => generateWorkflow(prompt), 100);
          setIsAnalyzingClarification(false);
          return;
        }
        
        analysis = await response.json();
      } catch (err) {
        console.error('[Clarification] EXCEPTION:', err);
        setWorkflowPrompt(prompt);
        setTimeout(() => generateWorkflow(prompt), 100);
        setIsAnalyzingClarification(false);
        return;
      }
    }
    
    // Apply the result (analysis is guaranteed non-null here due to early returns above)
    if (analysis!.needsClarification && analysis!.questions?.length > 0) {
      console.log('[Clarification] ✅ SHOWING QUESTIONNAIRE with', analysis!.questions.length, 'questions');
      setClarificationQuestions(analysis!.questions);
    } else {
      console.log('[Clarification] ⚡ No clarification needed, auto-generating...');
      setWorkflowPrompt(prompt);
      setTimeout(() => generateWorkflow(prompt), 100);
    }
    
    setIsAnalyzingClarification(false);
    console.log('━━━ CLARIFICATION END ━━━');
  };

  /**
   * Called when the user completes the questionnaire.
   * Merges answers with the original prompt and triggers workflow generation.
   */
  const handleQuestionnaireComplete = (answers: QuestionnaireAnswer[]) => {
    if (!questionnaireOriginalPrompt) return;
    
    const enrichedPrompt = buildEnrichedPrompt(questionnaireOriginalPrompt, answers);
    console.log('[Questionnaire] Complete. Enriched prompt:', enrichedPrompt.substring(0, 150));
    
    // Clear questionnaire state
    setClarificationQuestions([]);
    setQuestionnaireOriginalPrompt(null);
    pendingClarificationRef.current = null;
    
    // Set the enriched prompt and auto-generate (pass directly to avoid stale closure)
    setWorkflowPrompt(enrichedPrompt);
    setTimeout(() => generateWorkflow(enrichedPrompt), 100);
  };

  const generateWorkflow = async (directPrompt?: string) => {
    if (!user) return;
    
    // Prevent multiple simultaneous workflow generations
    if (isGeneratingWorkflow) {
      console.log('[Workflow Generation] Already generating workflow, skipping duplicate call');
      return;
    }
    
    // Check if free user has reached limit before generating
    if (isFreePlan) {
      try {
        const limitResponse = await fetch('/api/workflows/check-free-limit');
        if (limitResponse.ok) {
          const limitData = await limitResponse.json();
          if (limitData.hasReachedLimit) {
            // Already reached limit, don't allow generation
            return;
          }
        }
      } catch (limitError) {
        console.error('Error checking limit before generation:', limitError);
      }
    }
    
    // Get workflow prompt - prefer direct parameter (avoids stale closure),
    // then state, then extract from last message
    let promptToUse = directPrompt || workflowPrompt;
    if (!promptToUse) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.content) {
        promptToUse = extractWorkflowPromptFromResponse(lastMessage.content) || 
                     (messages.length > 1 ? messages[messages.length - 2]?.content : '');
      }
    }
    
    if (!promptToUse) {
      setError('Unable to determine workflow prompt. Please try again.');
      return;
    }

    setIsGeneratingWorkflow(true);
    setError(null);
    setWorkflowJson('');
    setIsJsonExpanded(false);
    
    // Reset step progress
    setStepProgress({
      'intent': { status: 'pending' },
      'node-matching': { status: 'pending' },
      'workflow-generation': { status: 'pending' },
      'code-generation': { status: 'pending' },
      'validation': { status: 'pending' },
    });
    stepProgressMessageIdRef.current = null;

    // Add "Thinking..." message immediately to show during initial delay
    const thinkingMessageId = `thinking_${Date.now()}`;
    const thinkingMessage: ChatMessage = {
      id: thinkingMessageId,
      role: 'assistant',
      content: 'Thinking...',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    try {
      // Get current workflow state if available
      const currentWorkflow = getCurrentWorkflow ? getCurrentWorkflow() : { nodes: [], edges: [] };
      
      // Call workflow generation API with streaming
      let response: Response;
      try {
        response = await fetch('/api/ai/generate-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: promptToUse,
          availableNodes: [], // API will fetch all available nodes
          currentWorkflow: currentWorkflow, // Send current workflow context
        }),
      });
      } catch (fetchError: any) {
        // Catch network errors (CORS, network failure, etc.)
        throw new Error(
          fetchError.message === 'Failed to fetch' 
            ? 'Network error: Could not reach the server. Please check your internet connection and try again.'
            : `Network error: ${fetchError.message || 'Unknown network error'}`
        );
      }

      if (!response.ok) {
        const errorData = await safeParseJSON(response);
        throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
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
              let data: any;
              // Try parsing - might be double-encoded if step-progress
              try {
                data = JSON.parse(jsonStr);
                // If it's a string, it might be double-encoded
                if (typeof data === 'string') {
                  data = JSON.parse(data);
                }
              } catch (e) {
                // If parsing fails, log and skip
                console.error('[Workflow Generation] Failed to parse JSON:', jsonStr.substring(0, 100));
                continue;
              }
              
              if (data.type === 'step-progress') {
                // Remove "Thinking..." message when first step progress arrives (only the one we added for workflow generation)
                setMessages((prev) => prev.filter((msg) => !(msg.content === 'Thinking...' && msg.id.startsWith('thinking_'))));
                
                // Handle step progress updates
                const stepName = data.step;
                setStepProgress((prev) => {
                  const updated = { ...prev };
                  
                  // Mark current step as in-progress (always, even if not initialized)
                  updated[stepName] = { status: 'in-progress' };
                  
                  // Mark previous step as completed (infer from step order)
                  const stepOrder = ['intent', 'node-matching', 'workflow-generation', 'node-configuration', 'code-generation', 'validation'];
                  const currentIndex = stepOrder.indexOf(stepName);
                  if (currentIndex > 0) {
                    const previousStep = stepOrder[currentIndex - 1];
                    // Always mark previous step as completed when next step starts (even if it wasn't explicitly marked as in-progress)
                    if (updated[previousStep]) {
                      updated[previousStep] = { status: 'completed' };
                    }
                  }
                  
                  // If validation starts and code-generation is still pending, it was skipped/not needed
                  // Don't mark it as completed - keep it as pending so UI can hide it
                  // (The UI will hide pending code-generation steps)
                  
                  // Create or update step progress message with step progress state stored as JSON
                  if (!stepProgressMessageIdRef.current) {
                    stepProgressMessageIdRef.current = `step-progress_${Date.now()}`;
                  }
                  const stepProgressId = stepProgressMessageIdRef.current;
                  
                  // Store step progress state as JSON in message content for persistence
                  const stepProgressMsg = {
                    id: stepProgressId,
                    role: 'assistant' as const,
                    content: JSON.stringify(updated), // Store step progress state as JSON
                    timestamp: new Date().toISOString(),
                    workflowGenerated: true,
                    isStepProgress: true, // Mark as step progress message
                  } as ChatMessage & { isStepProgress: boolean };
                  
                  // Update messages with step progress message
                  setMessages((prevMessages) => {
                    // Check if step progress message already exists
                    const existingIndex = prevMessages.findIndex((msg) => (msg as any).isStepProgress);
                    if (existingIndex >= 0) {
                      // Update existing message (keep it in place) and save to database
                      const updatedMessages = prevMessages.map((msg, idx) => 
                        idx === existingIndex ? stepProgressMsg : msg
                      );
                      // Save updated message to database
                      saveMessage(stepProgressMsg, activeConversationId).catch(err => 
                        console.error('Error saving step progress message:', err)
                      );
                      return updatedMessages;
                    } else {
                      // Find the last assistant message (confirmation) and insert step progress after it
                      const lastAssistantIndex = prevMessages.findLastIndex((msg) => msg.role === 'assistant' && !(msg as any).isStepProgress);
                      const newMessages = [...prevMessages];
                      if (lastAssistantIndex >= 0) {
                        newMessages.splice(lastAssistantIndex + 1, 0, stepProgressMsg);
                      } else {
                        // No assistant message yet, add at end
                        newMessages.push(stepProgressMsg);
                      }
                      // Save new message to database
                      saveMessage(stepProgressMsg, activeConversationId).catch(err => 
                        console.error('Error saving step progress message:', err)
                      );
                      return newMessages;
                    }
                  });
                  
                  return updated;
                });
              } else if (data.type === 'json-chunk') {
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
                // Final workflow received - mark validation as completed
                setStepProgress((prev) => {
                  const updated = {
                    ...prev,
                    'validation': { status: 'completed' as const },
                  };
                  
                  // Update step progress message with final state
                  const stepProgressId = stepProgressMessageIdRef.current || `step-progress_${Date.now()}`;
                  const stepProgressMsg = {
                    id: stepProgressId,
                    role: 'assistant' as const,
                    content: JSON.stringify(updated),
                    timestamp: new Date().toISOString(),
                    workflowGenerated: true,
                    isStepProgress: true,
                  } as ChatMessage & { isStepProgress: boolean };
                  
                  setMessages((prevMessages) => {
                    const existingIndex = prevMessages.findIndex((msg) => (msg as any).isStepProgress);
                    if (existingIndex >= 0) {
                      const updatedMessages = prevMessages.map((msg, idx) => 
                        idx === existingIndex ? stepProgressMsg : msg
                      );
                      // Save updated message to database
                      saveMessage(stepProgressMsg, activeConversationId).catch(err => 
                        console.error('Error saving step progress message:', err)
                      );
                      return updatedMessages;
                    }
                    return prevMessages;
                  });
                  
                  return updated;
                });
                
                finalWorkflow = data.workflow;
                const workflowData = {
                  nodes: data.workflow.nodes,
                  edges: data.workflow.edges,
                  workflowName: data.workflow.workflowName,
                };
                setWorkflowJson(JSON.stringify(workflowData, null, 2));
              } else if (data.type === 'error') {
                // Mark current step as failed
                setStepProgress((prev) => {
                  const stepOrder = ['intent', 'node-matching', 'workflow-generation', 'code-generation', 'validation'];
                  // Find the last in-progress step
                  let failedStep = 'validation'; // Default to validation if we can't determine
                  for (let i = stepOrder.length - 1; i >= 0; i--) {
                    if (prev[stepOrder[i]]?.status === 'in-progress') {
                      failedStep = stepOrder[i];
                      break;
                    }
                  }
                  return {
                    ...prev,
                    [failedStep]: { 
                      status: 'failed', 
                      error: data.error || 'Unknown error' 
                    },
                  };
                });
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

      // Keep isGeneratingWorkflow true so step progress stays visible
      // It will be set to false after explanation streaming completes
      
      // Generate AI explanation via streaming chat API immediately after validation completes
      // Check if explanation message already exists
      const existingExplanationMsg = messages.find(
        (msg) => msg.role === 'assistant' && 
                 (msg.content.includes("I've generated the") || msg.content.includes("I've generated")) &&
                 msg.content.includes("workflow and added it to your canvas") &&
                 (msg as any).workflowGenerated &&
                 !(msg as any).workflowGeneratedSuccess
      );
      
      if (!existingExplanationMsg) {
        // Get current messages state
        const currentMessages = [...messages];
        
        // Create a prompt for the AI to explain the workflow
        const workflowSummary = finalWorkflow.reasoning || '';
          const triggerNodes = finalWorkflow.nodes.filter((n: any) => 
            n.data?.nodeId?.includes('trigger') || n.type === 'trigger'
          );
          const actionNodes = finalWorkflow.nodes.filter((n: any) => 
            n.data?.nodeId?.includes('action') || n.type === 'action'
          );
          
        // Build context about the workflow for the AI
        let workflowContext = `I've just generated a workflow named "${finalWorkflow.workflowName}" with ${finalWorkflow.nodes.length} node(s) and ${finalWorkflow.edges.length} connection(s). `;
          if (triggerNodes.length > 0) {
          workflowContext += `It starts with ${triggerNodes.length} trigger${triggerNodes.length > 1 ? 's' : ''}. `;
          }
          if (actionNodes.length > 0) {
          workflowContext += `It includes ${actionNodes.length} action${actionNodes.length > 1 ? 's' : ''}. `;
        }
        if (workflowSummary) {
          workflowContext += `The workflow reasoning: ${workflowSummary} `;
        }
        workflowContext += `Please provide a friendly explanation of what this workflow does and offer to help set it up. Keep it concise and conversational.`;
        
        // Create streaming AI message placeholder with "Thinking..." initially
        const explanationMessageId = `msg_${Date.now() + 1}`;
        const explanationMessage: ChatMessage = {
          id: explanationMessageId,
            role: 'assistant',
          content: 'Thinking...',
            timestamp: new Date().toISOString(),
            workflowGenerated: true,
          };
          
        // Add "Thinking..." message that will be updated incrementally when text arrives
        setMessages((prev) => [...prev, explanationMessage]);
        
        try {
          // Call AI chat API with streaming to generate the explanation
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: workflowContext,
              chatId: activeConversationId,
              conversationHistory: currentMessages, // Include conversation history with success message
            }),
          });

          if (!response.ok) {
            const errorData = await safeParseJSON(response);
            throw new Error(errorData.error || 'Failed to get AI explanation');
          }

          if (!response.body) {
            throw new Error('Response body is null');
          }

          // Read the stream
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let fullExplanation = '';

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
                    fullExplanation += data.content;
                    // Update the message incrementally, replacing "Thinking..." with actual content
                    // Use flushSync to force immediate React update so streaming is visible
                    flushSync(() => {
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === explanationMessageId
                            ? { ...msg, content: fullExplanation }
                            : msg
                        )
                      );
                    });
                  } else if (data.type === 'complete') {
                    fullExplanation = data.message;
                    // Final update with complete message
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === explanationMessageId
                          ? { ...msg, content: fullExplanation }
                          : msg
                      )
                    );

                    // Save complete AI explanation message to database
                    const completeExplanationMsg: ChatMessage = {
                      id: explanationMessageId,
                      role: 'assistant',
                      content: fullExplanation,
                      timestamp: new Date().toISOString(),
                      workflowGenerated: true,
                    };
                    await saveMessage(completeExplanationMsg, activeConversationId);
                    
                    // Clear workflow prompt and stop showing step progress AFTER explanation is complete
                    setWorkflowPrompt(null);
                    setIsGeneratingWorkflow(false);
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
        } catch (explanationError: any) {
          console.error('Error generating workflow explanation:', explanationError);
          // Update the message to show error or fallback
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === explanationMessageId
                ? { 
                    ...msg, 
                    content: `I've generated the "${finalWorkflow.workflowName}" workflow and added it to your canvas. Would you like me to help you set it up?`
                  }
                : msg
            )
          );
          // Clear workflow prompt and stop showing step progress even if explanation generation fails
          setWorkflowPrompt(null);
          setIsGeneratingWorkflow(false);
        }
      } else {
        // Explanation already exists, just clear the workflow prompt and stop showing step progress
        setWorkflowPrompt(null);
        setIsGeneratingWorkflow(false);
      }

      // Check if free user has now reached the limit after generating workflow
      if (isFreePlan) {
        try {
          const limitResponse = await fetch('/api/workflows/check-free-limit');
          if (limitResponse.ok) {
            const limitData = await limitResponse.json();
            if (limitData.hasReachedLimit) {
              setHasReachedFreeLimit(true);
              
              // Add paywall message
              const paywallMsg: ChatMessage = {
                id: `msg_${Date.now() + 2}`,
                role: 'assistant',
                content: 'Your workflow is ready. Upgrade to continue.',
                timestamp: new Date().toISOString(),
                isPaywallMessage: true,
              };
              
              setMessages((prev) => [...prev, paywallMsg]);
              
              // Save paywall message
              try {
                await saveMessage(paywallMsg, activeConversationId);
              } catch (saveError) {
                console.error('Error saving paywall message:', saveError);
              }
            }
          }
        } catch (limitError) {
          console.error('Error checking limit after workflow generation:', limitError);
        }
      }
    } catch (err: any) {
      console.error('Error generating workflow:', err);
      // Handle both Error objects and string errors
      const errorMessage = err?.message || err?.toString() || 'Failed to generate workflow';
      setError(errorMessage);
      setWorkflowJson(null);
      
      // Remove "Thinking..." message if it exists
      setMessages((prev) => prev.filter(msg => !msg.id?.startsWith('thinking_')));
      
      // Mark the current in-progress step as failed
      setStepProgress((prev) => {
        const stepOrder = ['intent', 'node-matching', 'workflow-generation', 'node-configuration', 'code-generation', 'validation'];
        // Find the last in-progress step
        let failedStep = 'validation'; // Default to validation if we can't determine
        for (let i = stepOrder.length - 1; i >= 0; i--) {
          if (prev[stepOrder[i]]?.status === 'in-progress') {
            failedStep = stepOrder[i];
            break;
          }
        }
        return {
          ...prev,
          [failedStep]: { 
            status: 'failed', 
            error: errorMessage
          },
        };
      });
      
      // Add error message
      setMessages((prev) => [
        ...prev,
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I couldn't generate the workflow: ${errorMessage}`,
            timestamp: new Date().toISOString(),
          },
      ]);
    } finally {
      // Ensure generating state is cleared (handles error cases)
      // Note: In success case, isGeneratingWorkflow is already set to false 
      // immediately after workflow is generated (before explanation streaming)
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
    <div className="h-full w-full max-w-full flex flex-col bg-transparent overflow-x-hidden min-w-0">
      {/* Top Bar - Action Icons */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-200 dark:border-white/10 bg-background/50">
        {/* Header / Tabs */}
        {showChatHistory ? (
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">Recent Chats</h2>
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
                  className={`group relative inline-flex items-center px-3 py-1.5 rounded-md text-xs transition-colors ${
                    tab.id === activeConversationId
                      ? 'backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] text-foreground'
                      : 'text-muted-foreground border-transparent hover:bg-white/20 dark:hover:bg-zinc-900/20'
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
        <div className="flex items-center gap-1 md:gap-1 pr-10 md:pr-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-white/20 dark:hover:bg-zinc-900/20 focus:ring-0 focus-visible:ring-0 active:bg-transparent"
            title="New Chat"
            onClick={createNewConversation}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 transition-all duration-300 focus:ring-0 focus-visible:ring-0 active:bg-transparent hover:bg-transparent ${
              showChatHistory
                ? 'text-foreground'
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
                className="h-8 w-8 text-muted-foreground hover:bg-white/20 dark:hover:bg-zinc-900/20 focus:ring-0 focus-visible:ring-0 active:bg-transparent"
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
        <div className="flex-1 min-h-0 min-w-0 w-full flex flex-col bg-transparent overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {isLoadingConversations ? (
                <div className="flex h-full min-h-[320px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : allConversations.length === 0 ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center space-y-2 px-4">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
                  <div>
                    <p className="text-sm font-medium text-foreground">No chats yet</p>
                    <p className="text-xs text-muted-foreground">Start a new conversation to see it here.</p>
                  </div>
                </div>
              ) : (
                allConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => switchToConversation(conversation.id)}
                      className={`group relative w-full text-left px-3 py-2 rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl transition-all duration-300 text-foreground overflow-hidden ${
                        conversation.id === activeConversationId
                          ? 'shadow-sm ring-1 ring-stone-300 dark:ring-white/30'
                          : 'hover:shadow-sm hover:border-stone-300 dark:hover:border-white/30'
                      }`}
                    >
                      <span className="pr-8 text-sm font-medium leading-tight block truncate relative">
                        {conversation.title}
                        <span className={`absolute right-0 top-0 bottom-0 w-12 pointer-events-none ${
                          conversation.id === activeConversationId
                            ? 'bg-gradient-to-r from-transparent via-stone-100/80 to-stone-100 dark:via-zinc-900/80 dark:to-zinc-900/90'
                            : 'bg-gradient-to-r from-transparent via-stone-100/60 to-stone-100 dark:via-zinc-900/60 dark:to-zinc-900/90'
                        }`} />
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
                ))
              )}
          </div>
        </div>
      ) : (
        <>
          {/* Main Chat Area */}
          <ScrollArea className="flex-1 px-4 bg-transparent" ref={scrollAreaRef}>
        <div className="py-4 space-y-4 bg-transparent">
          {messages.length === 0 && (
            null
          )}

          {messages.map((message, messageIndex) => {
            // Render step progress message — only render the FIRST one found
            // (deduplication on load should ensure there's at most one, but be defensive)
            if ((message as any).isStepProgress) {
              const isFirstStepProgress = messages.findIndex((m) => (m as any).isStepProgress) === messageIndex;
              if (!isFirstStepProgress) return null;
              return (
                <React.Fragment key={message.id}>
                  <div className="flex gap-3 justify-start">
                    <div className="max-w-[95%] rounded-lg px-4 py-2 bg-transparent text-foreground">
                      <div className="flex flex-col gap-2">
                        {(() => {
                          // Check if this is a workflow-configuration step progress (separate from generation pipeline)
                          const configProgress = stepProgress['workflow-configuration'];
                          if (configProgress && configProgress.status !== 'pending') {
                            // Render workflow-configuration step
                            const isInProgress = configProgress.status === 'in-progress';
                            const isCompleted = configProgress.status === 'completed';
                            const isFailed = configProgress.status === 'failed';
                            
                            return (
                              <div className="flex items-center gap-2">
                                {isInProgress && (
                                  <Loader2 className="h-3.5 w-3.5 text-foreground animate-spin flex-shrink-0" />
                                )}
                                {isCompleted && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                )}
                                {isFailed && (
                                  <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  {isInProgress && (
                                    <span className="text-sm text-foreground inline-block relative overflow-hidden">
                                      <span className="relative z-10">Configuring Workflow</span>
                                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slide" style={{
                                        animation: 'shimmer 2s infinite',
                                        backgroundSize: '200% 100%',
                                        backgroundPosition: '-200% 0',
                                      }} />
                                    </span>
                                  )}
                                  {isCompleted && (
                                    <span className="text-sm text-muted-foreground">Workflow Configured</span>
                                  )}
                                  {isFailed && (
                                    <span className="text-sm text-red-500">
                                      Configuring Workflow - Failed
                                      {configProgress.error && `: ${configProgress.error}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          // Render generation pipeline steps
                          const stepConfig = [
                            { key: 'intent', label: 'Understanding your request', completedLabel: 'Intent Analysed' },
                            { key: 'node-matching', label: 'Selecting the right integrations', completedLabel: 'Nodes Matched' },
                            { key: 'workflow-generation', label: 'Designing execution logic', completedLabel: 'Workflow Structure Generated' },
                            { key: 'node-configuration', label: 'Configuring nodes', completedLabel: 'Nodes Configured' },
                            { key: 'code-generation', label: 'Generating custom code', completedLabel: 'Custom Code Generated', optional: true },
                            { key: 'validation', label: 'Validating', completedLabel: 'Workflow Validated' },
                          ];
                          
                          return stepConfig.map((step) => {
                            const progress = stepProgress[step.key] || { status: 'pending' };
                            const isInProgress = progress.status === 'in-progress';
                            const isCompleted = progress.status === 'completed';
                            const isFailed = progress.status === 'failed';
                            
                            // Hide code-generation step if it's not needed (always pending, never went in-progress)
                            // Only show code-generation if it actually ran (in-progress, completed, or failed)
                            if (step.key === 'code-generation' && progress.status === 'pending') {
                              return null;
                            }
                            
                            // Only show steps that have started (in-progress, completed, or failed)
                            if (progress.status === 'pending') {
                              return null;
                            }
                            
                            return (
                              <div key={step.key} className="flex items-center gap-2">
                                {isInProgress && (
                                  <Loader2 className="h-3.5 w-3.5 text-foreground animate-spin flex-shrink-0" />
                                )}
                                {isCompleted && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500/70 dark:text-green-400/70 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  {isInProgress ? (
                                    <p 
                                      className="text-sm whitespace-pre-wrap inline-block"
                                      style={{
                                        background: 'linear-gradient(90deg, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.8) 25%, hsl(var(--foreground) / 0.4) 50%, hsl(var(--foreground) / 0.8) 75%, hsl(var(--foreground)) 100%)',
                                        backgroundSize: '200% 100%',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        animation: 'shimmer 2s ease-in-out infinite',
                                      }}
                                    >
                                      {step.label}
                                    </p>
                                  ) : isCompleted ? (
                                    <p className="text-sm text-muted-foreground">
                                      {step.completedLabel}
                                    </p>
                                  ) : isFailed ? (
                                    <div className="flex flex-col gap-1">
                                      <p className="text-sm text-red-600 dark:text-red-400">
                                        {step.label} - Failed
                                      </p>
                                      {progress.error && (
                                        <p className="text-xs text-red-500 dark:text-red-500/80">
                                          {progress.error}
                                        </p>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            }
            
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
                            onBlur={(e) => {
                              // Don't close if clicking the submit button (it's inside the same container)
                              if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest?.('button[title="Send Message"]')) {
                                return;
                              }
                              // Close edit mode and keep the edited text in the message bubble
                              const editedText = editingMessageContent.trim();
                              if (editedText && editedText !== message.content) {
                                setMessages((prev) =>
                                  prev.map((m) =>
                                    m.id === message.id ? { ...m, content: editedText } : m
                                  )
                                );
                              }
                              setEditingMessageId(null);
                            }}
                            className="w-full bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-lg outline-none resize-none text-sm text-foreground py-3 px-4 pr-14 focus:border-white/80 dark:focus:border-white/20 focus:ring-0 transition-all scrollbar-hide overflow-y-auto"
                            style={{
                              minHeight: '48px',
                              maxHeight: '85px',
                              lineHeight: '1.5',
                              scrollbarWidth: 'none',
                              msOverflowStyle: 'none'
                            }}
                            autoFocus
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAndSend(message.id, editingMessageContent, message.timestamp);
                            }}
                            disabled={!editingMessageContent.trim() || isLoading || (isFreePlan && hasReachedFreeLimit)}
                            className={`absolute right-2 bottom-3 flex items-center justify-center w-7 h-7 rounded-full border transition-all ${
                              !editingMessageContent.trim() || isLoading
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer hover:scale-110 active:scale-95'
                            } bg-[#bd28b3ba] border-[#ffffff1a]`}
                            title="Send Message"
                          >
                            {isLoading ? (
                              <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                            ) : (
                              <ArrowUp className="h-3.5 w-3.5 text-white" />
                            )}
                          </button>
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
                          className="w-full bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-lg px-4 py-3 cursor-text transition-all duration-300 overflow-hidden relative hover:bg-white/80 dark:hover:bg-white/5 active:bg-white/80 dark:active:bg-white/5"
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
                      ) : (message as any).workflowGeneratedSuccess ? (
                        <p className="text-xs text-muted-foreground/70 italic whitespace-pre-wrap">
                          {message.content}
                        </p>
                      ) : (message as any).isPaywallMessage ? (
                        <div className="space-y-3">
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => router.push('/settings?tab=billing')}
                              className="w-full rounded-lg border border-[#ffffff1a] bg-[#bd28b3ba] py-2 px-4 cursor-pointer flex items-center justify-center gap-2 hover:bg-[#bd28b3da] transition-all"
                            >
                              <span className="text-xs text-white font-medium">See Plans</span>
                              <img src="/assets/icons/arrow-top.svg" className="w-3 h-3 brightness-0 invert" alt="arrow" />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch('/api/stripe/create-checkout-session', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      plan: 'pro-monthly',
                                      skipTrial: false,
                                      cancelUrl: window.location.href,
                                      source: 'ai-prompt',
                                    }),
                                  });
                                  if (response.ok) {
                                    const data = await response.json();
                                    if (data.url) {
                                      window.location.href = data.url;
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error starting checkout:', error);
                                }
                              }}
                              className="w-full rounded-lg border border-white/20 bg-white/10 dark:bg-white/5 py-2 px-4 cursor-pointer flex items-center justify-center hover:bg-white/20 dark:hover:bg-white/10 transition-all"
                            >
                              <span className="text-xs text-foreground font-medium">Upgrade</span>
                            </button>
                          </div>
                        </div>
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

          {/* Clarification Analysis Loading State */}
          {isAnalyzingClarification && (
            <div className="flex gap-3 justify-start">
              <div className="max-w-[95%] rounded-lg px-4 py-2 bg-transparent text-foreground">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 text-foreground animate-spin flex-shrink-0" />
                    <div className="flex-1">
                      <p
                        className="text-sm whitespace-pre-wrap inline-block"
                        style={{
                          background: 'linear-gradient(90deg, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.8) 25%, hsl(var(--foreground) / 0.4) 50%, hsl(var(--foreground) / 0.8) 75%, hsl(var(--foreground)) 100%)',
                          backgroundSize: '200% 100%',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          animation: 'shimmer 2s ease-in-out infinite',
                        }}
                      >
                        Analysing your request
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clarification Questionnaire */}
          {clarificationQuestions.length > 0 && !isGeneratingWorkflow && (
            <WorkflowQuestionnaire
              questions={clarificationQuestions}
              onComplete={handleQuestionnaireComplete}
              isGenerating={isGeneratingWorkflow}
            />
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

      {/* Input Area - Positioned at bottom - Fully transparent container */}
      <div className="p-4 bg-transparent">
        {/* Input Box - Matches chat bubble styling */}
          <div className="relative">
            <div className="flex items-end gap-2 rounded-lg transition-all">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  // Auto-resize textarea
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    const scrollHeight = textareaRef.current.scrollHeight;
                    const defaultHeight = 75; // Default height in pixels
                    const maxHeight = defaultHeight * 2.5; // 2.5x max height
                    textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
                  }
                }}
                  onKeyDown={handleKeyDown}
                placeholder={hasReachedFreeLimit ? "Upgrade to continue chatting..." : "Ask me anything..."}
                disabled={isLoading || hasReachedFreeLimit}
                className="w-full bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-lg outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/60 py-3 px-4 pr-14 focus:border-white/80 dark:focus:border-white/20 focus:ring-0 transition-all scrollbar-hide disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto"
                  rows={1}
                  style={{
                  minHeight: '75px',
                  maxHeight: '187.5px', // 2.5x default height
                    lineHeight: '1.5',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                />
                
              {/* Send Button - Circular arrow button styled like homepage purple buttons - Evenly spaced from corners */}
              <button
                  onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading || hasReachedFreeLimit}
                className={`absolute right-2 bottom-3 flex items-center justify-center w-7 h-7 rounded-full border transition-all ${
                  !inputValue.trim() || isLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:scale-110 active:scale-95'
                } bg-[#bd28b3ba] border-[#ffffff1a]`}
                  title="Send Message"
                >
                  {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                  ) : (
                  <ArrowUp className="h-3.5 w-3.5 text-white" />
                  )}
              </button>
              </div>
            </div>

      <UpgradeRequiredModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        source="ai-prompt"
      />
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
          <div className="relative z-10 w-full max-w-md mx-4 bg-background border border-stone-200 dark:border-white/10 rounded-lg shadow-lg p-6">
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
          <div className="relative z-10 w-full max-w-md mx-4 bg-background border border-stone-200 dark:border-white/10 rounded-lg shadow-lg p-6">
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
