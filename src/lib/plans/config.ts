export type PlanId = "personal" | "professional" | "advanced" | "custom";

export interface PlanLimits {
  executionsPerMonth: number | null;
  aiCreditsPerMonth: number | null;
  maxActiveWorkflows: number | null;
  maxStepsPerWorkflow: number | null;
}

export const PLAN_CONFIG: Record<PlanId, PlanLimits> = {
  personal: {
    aiCreditsPerMonth: 100,
    executionsPerMonth: 100, // "100+" interpreted as 100 minimum
    maxActiveWorkflows: 3,
    maxStepsPerWorkflow: 10, // 10 nodes max per workflow
  },
  professional: {
    aiCreditsPerMonth: 500,
    executionsPerMonth: 1000, // "1,000+" interpreted as 1000 minimum
    maxActiveWorkflows: 10,
    maxStepsPerWorkflow: null, // unlimited
  },
  advanced: {
    aiCreditsPerMonth: 5000,
    executionsPerMonth: 10000,
    maxActiveWorkflows: 50,
    maxStepsPerWorkflow: null, // unlimited
  },
  custom: {
    aiCreditsPerMonth: null,
    executionsPerMonth: null,
    maxActiveWorkflows: null,
    maxStepsPerWorkflow: null,
  },
};

export function getPlanLimits(planId: PlanId | null | undefined): PlanLimits {
  if (!planId) return PLAN_CONFIG.personal;
  return PLAN_CONFIG[planId] ?? PLAN_CONFIG.personal;
}


