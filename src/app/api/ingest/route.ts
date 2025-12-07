/**
 * /api/ingest route - serves Inngest functions directly
 * This handles the typo where Inngest might be configured with /api/ingest instead of /api/inngest
 * We serve the functions directly here instead of redirecting, as redirects don't work
 * for Inngest's internal HTTP requests during step execution.
 */

import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { 
  helloWorld,
  testWorkflow,
  sendTestNotification,
  workflowExecutor,
  scheduledWorkflowTrigger,
  pollingWorkflowTrigger,
} from "../../../inngest/functions";

export const runtime = "nodejs";

const serveHandler = serve({
  client: inngest,
  functions: [
    helloWorld,
    testWorkflow,
    sendTestNotification,
    workflowExecutor,
    scheduledWorkflowTrigger,
    pollingWorkflowTrigger,
  ],
});

// Serve Inngest functions directly at /api/ingest
// This is identical to /api/inngest to handle the typo in Inngest configuration
// Wrap handlers with error logging for production debugging
export const GET = async (req: any, context?: any) => {
  try {
    return await serveHandler.GET(req, context);
  } catch (error: any) {
    console.error('[Inngest GET Error (ingest route)]', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const POST = async (req: any, context?: any) => {
  try {
    return await serveHandler.POST(req, context);
  } catch (error: any) {
    console.error('[Inngest POST Error (ingest route)]', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const PUT = async (req: any, context?: any) => {
  try {
    return await serveHandler.PUT(req, context);
  } catch (error: any) {
    console.error('[Inngest PUT Error (ingest route)]', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

