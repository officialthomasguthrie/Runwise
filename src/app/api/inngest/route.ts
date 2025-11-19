import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { 
  helloWorld,
  testWorkflow,
  sendTestNotification,
  workflowExecutor,
} from "../../../inngest/functions";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    testWorkflow,
    sendTestNotification,
    workflowExecutor,
  ],
});
