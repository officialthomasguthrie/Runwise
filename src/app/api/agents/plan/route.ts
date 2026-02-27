/**
 * POST /api/agents/plan
 *
 * Runs the AI planner to generate a DeployAgentPlan from a plain-English description.
 * Does NOT create the agent — just returns the plan so the UI can show a preview.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { planAgent } from '@/lib/agents/planner';
import { getUserIntegrations } from '@/lib/integrations/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { description: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.description?.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }

    const integrations = await getUserIntegrations(user.id);
    const integrationNames = integrations.map((i) => i.service_name).filter(Boolean) as string[];

    const plan = await planAgent(body.description, integrationNames);

    return NextResponse.json({ plan, connectedIntegrations: integrationNames });
  } catch (err: any) {
    console.error('[POST /api/agents/plan]', err);
    return NextResponse.json(
      { error: 'Failed to generate plan', details: err?.message },
      { status: 500 }
    );
  }
}
