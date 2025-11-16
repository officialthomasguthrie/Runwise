import { createAdminClient } from "@/lib/supabase-admin";
import type { PlanId } from "@/lib/plans/config";
import { getPlanLimits } from "@/lib/plans/config";

type Metric = "executions" | "credits";

export async function getOrCreateActivePeriod(userId: string, nowIso?: string) {
  const supabase = createAdminClient();
  const now = nowIso ? new Date(nowIso) : new Date();

  // Find active period that includes now
  const { data: periods, error } = await supabase
    .from("billing_periods")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw error;
  const found =
    periods?.find((p: any) => {
      const start = new Date(p.period_start);
      const end = new Date(p.period_end);
      return start <= now && now <= end;
    }) ?? null;
  if (found) return found;

  // Fallback: create a naive monthly period starting now if none exists.
  const start = now;
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const insert = {
    user_id: userId,
    period_start: start.toISOString(),
    period_end: end.toISOString(),
    status: "active",
  };
  const { data: created, error: insertErr } = await (supabase as any)
    .from("billing_periods")
    .insert(insert as any)
    .select("*")
    .single();
  if (insertErr) throw insertErr;
  return created;
}

export async function getUsageValue(userId: string, metric: Metric) {
  const supabase = createAdminClient();
  const period = await getOrCreateActivePeriod(userId);
  const { data, error } = await (supabase as any)
    .from("usage_counters")
    .select("value")
    .eq("user_id", userId)
    .eq("period_id", period.id)
    .eq("metric", metric)
    .single();
  if (error && error.code !== "PGRST116") {
    // not found is fine
    throw error;
  }
  return data?.value ?? 0;
}

export async function incrementUsage(
  userId: string,
  metric: Metric,
  amount = 1,
  opts?: { workflowId?: string; executionId?: string },
) {
  const supabase = createAdminClient();
  const period = await getOrCreateActivePeriod(userId);

  // Upsert counter
  const { data: existing, error: selErr } = await (supabase as any)
    .from("usage_counters")
    .select("id,value")
    .eq("user_id", userId)
    .eq("period_id", period.id)
    .eq("metric", metric)
    .single();
  if (selErr && selErr.code !== "PGRST116") throw selErr;

  const newValue = (existing?.value ?? 0) + amount;
  if ((existing as any)?.id) {
    const { error: updErr } = await (supabase as any)
      .from("usage_counters")
      .update({ value: newValue } as any)
      .eq("id", (existing as any).id);
    if (updErr) throw updErr;
  } else {
    const { error: insErr } = await (supabase as any).from("usage_counters").insert({
      user_id: userId,
      period_id: period.id,
      metric,
      value: newValue,
    } as any);
    if (insErr) throw insErr;
  }

  // Append event
  await (supabase as any).from("usage_events").insert({
    user_id: userId,
    period_id: period.id,
    event_type:
      metric === "executions" ? "execution_completed" : "credit_spent",
    workflow_id: opts?.workflowId ?? null,
    amount,
    ts: new Date().toISOString(),
    metadata: opts?.executionId ? { executionId: opts.executionId } : null,
  } as any);
}

export async function assertWithinLimit(
  userId: string,
  planId: PlanId | null | undefined,
  metric: Metric,
) {
  const limits = getPlanLimits(planId);
  const limit =
    metric === "executions"
      ? limits.executionsPerMonth
      : limits.aiCreditsPerMonth;
  if (limit == null) return; // unlimited

  const used = await getUsageValue(userId, metric);
  if (used >= limit) {
    const label = metric === "executions" ? "workflow executions" : "AI credits";
    throw new Error(
      `Plan limit reached: ${label} (${used}/${limit}) for this billing period.`,
    );
  }
}

export function assertStepsLimit(
  planId: PlanId | null | undefined,
  stepsCount: number,
) {
  const limits = getPlanLimits(planId);
  const max = limits.maxStepsPerWorkflow;
  if (max != null && stepsCount > max) {
    throw new Error(
      `Plan limit: workflows may include up to ${max} steps on your current plan.`,
    );
  }
}


