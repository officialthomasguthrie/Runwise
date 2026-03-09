/**
 * GET /api/webhooks/sample/agent/[agentId]
 *
 * Returns the last captured webhook payload for an agent (when testing a webhook trigger).
 * Used by the Test Webhook UI in the trigger config sidebar.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!agentId || agentId === "new") {
    return NextResponse.json({ sample: null, fields: [] });
  }

  const admin = createAdminClient();
  const { data: agent, error } = await (admin as any)
    .from("agents")
    .select("id, user_id, last_webhook_sample")
    .eq("id", agentId)
    .single();

  if (error || !agent) {
    return NextResponse.json({ sample: null, fields: [] });
  }

  if (agent.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sampleObj = agent.last_webhook_sample as { payload?: Record<string, unknown>; receivedAt?: string } | null;
  const payload = sampleObj?.payload ?? null;
  const fields = payload && typeof payload === "object" && !Array.isArray(payload)
    ? Object.keys(payload).filter((k) => !k.startsWith("_"))
    : [];

  return NextResponse.json({ sample: payload ? { payload } : null, fields });
}
