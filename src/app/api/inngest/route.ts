import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { 
  helloWorld,
  testWorkflow,
  sendTestNotification,
  workflowExecutor,
  // scheduledWorkflowExecutor, // Disabled - was causing continuous execution issues
} from "../../../inngest/functions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serve Inngest functions - this returns an object with GET, POST, PUT, etc.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    testWorkflow,
    sendTestNotification,
    workflowExecutor,
    // scheduledWorkflowExecutor, // Disabled - was causing continuous execution issues
  ],
});
