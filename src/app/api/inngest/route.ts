import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { 
  helloWorld,
  testWorkflow,
  sendTestNotification,
  workflowExecutor,
  scheduledWorkflowTrigger,
  // pollingWorkflowTrigger, // Removed - polling now handled by Cloudflare Worker
} from "../../../inngest/functions";
import { monthlyCreditReset } from "../../../inngest/functions-credits";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// Import all functions and validate they exist
const allFunctions = [
  helloWorld,
  testWorkflow,
  sendTestNotification,
  workflowExecutor,
  scheduledWorkflowTrigger,
  // pollingWorkflowTrigger, // Removed - polling now handled by Cloudflare Worker
  monthlyCreditReset,
];

// Log function IDs for debugging
if (typeof window === 'undefined') {
  try {
    const functionIds = allFunctions.map((f, i) => {
      try {
        // Functions have an id property
        const id = (f as any)?.id || (f as any)?.fn?.id || `function-${i}`;
        return id;
      } catch {
        return `error-${i}`;
      }
    });
    console.log('[Inngest] Registering', allFunctions.length, 'functions:', functionIds.join(', '));
    
    // Validate all functions are defined
    const undefinedFunctions = allFunctions
      .map((f, i) => ({ index: i, func: f }))
      .filter(({ func }) => !func);
    
    if (undefinedFunctions.length > 0) {
      console.error('[Inngest] ERROR: Some functions are undefined:', undefinedFunctions);
    }
    
    // Verify critical functions exist by checking function names/IDs
    const functionNames = functionIds.join(' ');
    const hasScheduled = functionNames.includes('scheduled-workflow-trigger');
    // Polling is now handled by Cloudflare Worker, not Inngest
    // const hasPolling = functionNames.includes('polling-workflow-trigger');
    
    if (!hasScheduled) {
      console.error('[Inngest] CRITICAL: scheduled-workflow-trigger function is missing!');
    }
    // Polling triggers are now handled by Cloudflare Worker (cron every 1 minute)
  } catch (error) {
    console.error('[Inngest] Error logging function info:', error);
  }
}

// Create serve handler with error handling
let serveHandler;
try {
  serveHandler = serve({
    client: inngest,
    functions: allFunctions,
  });
  console.log('[Inngest] Serve handler created successfully');
} catch (error: any) {
  console.error('[Inngest] CRITICAL: Failed to create serve handler:', error);
  throw error;
}

// Wrap handlers with error logging for production debugging
export const GET = async (req: NextRequest, context?: any) => {
  try {
    return await serveHandler.GET(req, context);
  } catch (error: any) {
    console.error('[Inngest GET Error]', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const POST = async (req: NextRequest, context?: any) => {
  try {
    return await serveHandler.POST(req, context);
  } catch (error: any) {
    console.error('[Inngest POST Error]', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const PUT = async (req: NextRequest, context?: any) => {
  try {
    return await serveHandler.PUT(req, context);
  } catch (error: any) {
    console.error('[Inngest PUT Error]', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};
