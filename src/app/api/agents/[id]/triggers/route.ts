/**
 * POST /api/agents/[id]/triggers
 *
 * Add a trigger/behaviour to an existing agent.
 * Body: { behaviour: AgentBehaviourPlan }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAgentBehaviours, deleteAgentBehaviour } from "@/lib/agents/behaviour-manager";
import type { AgentBehaviourPlan } from "@/lib/agents/types";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!agentId || agentId === "new") {
      return NextResponse.json(
        { error: "Agent ID is required." },
        { status: 400 }
      );
    }

    let body: { behaviourId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const behaviourId = body?.behaviourId;
    if (!behaviourId || typeof behaviourId !== "string") {
      return NextResponse.json(
        { error: "behaviourId is required" },
        { status: 400 }
      );
    }

    const { data: agent, error: fetchError } = await (supabase as any)
      .from("agents")
      .select("id, user_id")
      .eq("id", agentId)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteAgentBehaviour(agentId, user.id, behaviourId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/agents/[id]/triggers]", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!agentId || agentId === "new") {
      return NextResponse.json(
        { error: "Agent ID is required. Save your agent first." },
        { status: 400 }
      );
    }

    let body: { behaviour?: AgentBehaviourPlan };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const behaviour = body?.behaviour;
    if (!behaviour || !behaviour.behaviourType) {
      return NextResponse.json(
        { error: "behaviour is required with behaviourType" },
        { status: 400 }
      );
    }

    // Verify user owns the agent
    const { data: agent, error: fetchError } = await (supabase as any)
      .from("agents")
      .select("id, user_id")
      .eq("id", agentId)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const created = await createAgentBehaviours(agentId, user.id, [
      {
        behaviourType: behaviour.behaviourType,
        triggerType: behaviour.triggerType,
        scheduleCron: behaviour.scheduleCron,
        config: behaviour.config ?? {},
        description: behaviour.description ?? behaviour.behaviourType,
      },
    ]);

    if (created.length === 0) {
      return NextResponse.json(
        { error: "Failed to create trigger" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      behaviourId: created[0].id,
      behaviour: created[0],
    });
  } catch (err: any) {
    console.error("[POST /api/agents/[id]/triggers]", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
