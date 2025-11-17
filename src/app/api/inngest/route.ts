/**
 * INNGEST ROUTE - TEMPORARILY DISABLED
 * 
 * This route has been disabled to stop infinite retry loops.
 * To re-enable:
 * 1. Uncomment the code below
 * 2. Ensure Inngest is properly configured
 * 3. Test thoroughly before enabling in production
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

// DISABLED: Inngest functionality temporarily removed
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Inngest functionality is currently disabled' },
    { status: 503 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Inngest functionality is currently disabled' },
    { status: 503 }
  );
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'Inngest functionality is currently disabled' },
    { status: 503 }
  );
}

/* ORIGINAL CODE - UNCOMMENT TO RE-ENABLE:
import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { 
  helloWorld,
  testWorkflow,
  sendTestNotification,
  workflowExecutor,
  scheduledWorkflowExecutor,
} from "../../../inngest/functions";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    testWorkflow,
    sendTestNotification,
    workflowExecutor,
    scheduledWorkflowExecutor,
  ],
});
*/
