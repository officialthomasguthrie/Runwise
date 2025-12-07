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
import { monthlyCreditReset } from "../../../inngest/functions-credits";
import type { NextRequest } from "next/server";

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
    monthlyCreditReset,
  ],
});

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
