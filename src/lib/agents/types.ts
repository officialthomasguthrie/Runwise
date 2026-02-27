// ============================================================================
// CORE ENTITY TYPES (mirror Supabase tables)
// ============================================================================

export type AgentStatus = 'active' | 'paused' | 'deploying' | 'error';
export type AgentMemoryType = 'fact' | 'preference' | 'contact' | 'event' | 'instruction';
export type AgentActivityStatus = 'success' | 'error' | 'skipped';
export type AgentBehaviourType = 'polling' | 'schedule' | 'webhook' | 'heartbeat';

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  persona: string | null;
  instructions: string;
  status: AgentStatus;
  avatar_emoji: string;
  model: string;
  max_steps: number;
  created_at: string;
  updated_at: string;
}

export interface AgentBehaviour {
  id: string;
  agent_id: string;
  user_id: string;
  behaviour_type: AgentBehaviourType;
  trigger_type: string | null;
  schedule_cron: string | null;
  config: Record<string, any>;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
}

export interface AgentMemory {
  id: string;
  agent_id: string;
  user_id: string;
  memory_type: AgentMemoryType;
  content: string;
  source: 'agent' | 'user';
  importance: number;
  created_at: string;
  last_accessed_at: string;
}

export interface AgentActivityAction {
  tool: string;
  params: Record<string, any>;
  result: any;
  timestamp: string;
}

export interface AgentActivity {
  id: string;
  agent_id: string;
  user_id: string;
  run_id: string | null;
  behaviour_id: string | null;
  trigger_summary: string | null;
  actions_taken: AgentActivityAction[];
  memories_created: string[];
  status: AgentActivityStatus;
  error_message: string | null;
  tokens_used: number | null;
  created_at: string;
}

// ============================================================================
// GPT-4o FUNCTION CALLING TYPES
// ============================================================================

export interface AgentToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  items?: AgentToolParameter;
  properties?: Record<string, AgentToolParameter>;
  required?: string[];
}

export interface AgentTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, AgentToolParameter>;
      required?: string[];
    };
  };
}

// ============================================================================
// RUNTIME CONTEXT
// ============================================================================

export interface AgentRunContext {
  agentId: string;
  userId: string;
  behaviourId: string | null;
  triggerType: string;
  triggerData: {
    items?: any[];
    polledAt?: string;
    raw?: any;
  };
  runId?: string;
}

export interface AgentRunResult {
  success: boolean;
  actionsCount: number;
  memoriesCreated: number;
  tokensUsed: number;
  error?: string;
}

// ============================================================================
// DEPLOY / PLANNER TYPES
// ============================================================================

export interface DeployAgentRequest {
  description: string;
  name?: string;
  avatarEmoji?: string;
}

export interface AgentBehaviourPlan {
  behaviourType: AgentBehaviourType;
  triggerType?: string;
  scheduleCron?: string;
  config: Record<string, any>;
  description: string;
}

export interface DeployAgentPlan {
  name: string;
  persona: string;
  instructions: string;
  avatarEmoji: string;
  behaviours: AgentBehaviourPlan[];
  initialMemories: string[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface AgentWithStats extends Agent {
  behaviour_count: number;
  memory_count: number;
  activity_count: number;
  last_activity_at: string | null;
  last_trigger_summary: string | null;
}
