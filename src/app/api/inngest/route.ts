import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { 
  helloWorld,
  testWorkflow,
  sendTestNotification,
  workflowExecutor,
  // scheduledWorkflowExecutor, // REMOVED: Was causing infinite retry loops
} from "../../../inngest/functions";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    testWorkflow,
    sendTestNotification,
    workflowExecutor,
    // scheduledWorkflowExecutor, // REMOVED: Was causing infinite retry loops
  ],
});
