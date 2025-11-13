/**
 * API Route: /api/ai/chat
 * Handles chat interactions with the AI assistant with streaming support
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { generateStreamingChatResponse } from '@/lib/ai/chat';
import type { ChatRequest } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    console.log('Chat API route called');
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured in environment variables');
      return new Response(
        JSON.stringify({ error: 'AI service is not configured. Please add OPENAI_API_KEY to .env.local file.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('OpenAI API key is present');

    // Parse request body with error handling
    let body: ChatRequest;
    try {
      const rawBody = await request.text();
      console.log('Raw request body length:', rawBody.length);
      
      if (!rawBody || rawBody.trim() === '') {
        console.error('Empty request body received');
        return new Response(
          JSON.stringify({ error: 'Request body is empty' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      body = JSON.parse(rawBody);
      console.log('Request body parsed:', { message: body.message, chatId: body.chatId });
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError.message);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!body.message || !body.chatId) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message and chatId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling generateStreamingChatResponse...');
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Generate streaming chat response
          await generateStreamingChatResponse({
            message: body.message,
            chatId: body.chatId,
            conversationHistory: body.conversationHistory || [],
            context: body.context,
            onChunk: (chunk: string, isComplete: boolean, metadata?: any) => {
              const data = JSON.stringify({
                type: 'chunk',
                content: chunk,
                isComplete,
                metadata,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            onComplete: (fullMessage: string, metadata?: any) => {
              const data = JSON.stringify({
                type: 'complete',
                message: fullMessage,
                metadata,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.close();
            },
            onError: (error: Error) => {
              const data = JSON.stringify({
                type: 'error',
                error: error.message,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.close();
            },
          });
        } catch (error: any) {
          console.error('Error in streaming:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message || 'Failed to generate chat response',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/ai/chat:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate chat response',
        details: error.message,
        type: error.name,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

