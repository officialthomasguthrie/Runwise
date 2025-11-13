// =====================================================
// Database Types for AI Workflow Builder
// =====================================================
// Generated TypeScript types for Supabase database schema

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          timezone: string
          subscription_tier: 'free' | 'pro' | 'enterprise'
          subscription_status: 'active' | 'cancelled' | 'past_due'
          subscription_expires_at: string | null
          usage_limit: number
          usage_count: number
          usage_reset_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          timezone?: string
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_status?: 'active' | 'cancelled' | 'past_due'
          subscription_expires_at?: string | null
          usage_limit?: number
          usage_count?: number
          usage_reset_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          timezone?: string
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_status?: 'active' | 'cancelled' | 'past_due'
          subscription_expires_at?: string | null
          usage_limit?: number
          usage_count?: number
          usage_reset_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      workflows: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          status: 'draft' | 'active' | 'paused' | 'archived'
          workflow_data: Record<string, any> | null
          is_public: boolean
          is_template: boolean
          template_category: string | null
          tags: string[]
          version: number
          ai_prompt: string | null
          ai_generated: boolean
          execution_count: number
          last_executed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'archived'
          workflow_data?: Record<string, any> | null
          is_public?: boolean
          is_template?: boolean
          template_category?: string | null
          tags?: string[]
          version?: number
          ai_prompt?: string | null
          ai_generated?: boolean
          execution_count?: number
          last_executed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'archived'
          workflow_data?: Record<string, any> | null
          is_public?: boolean
          is_template?: boolean
          template_category?: string | null
          tags?: string[]
          version?: number
          ai_prompt?: string | null
          ai_generated?: boolean
          execution_count?: number
          last_executed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflow_nodes: {
        Row: {
          id: string
          workflow_id: string
          node_type: string
          name: string
          description: string | null
          position_x: number
          position_y: number
          config: Record<string, any>
          is_enabled: boolean
          execution_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          node_type: string
          name: string
          description?: string | null
          position_x?: number
          position_y?: number
          config?: Record<string, any>
          is_enabled?: boolean
          execution_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          node_type?: string
          name?: string
          description?: string | null
          position_x?: number
          position_y?: number
          config?: Record<string, any>
          is_enabled?: boolean
          execution_order?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      workflow_connections: {
        Row: {
          id: string
          workflow_id: string
          source_node_id: string
          target_node_id: string
          connection_type: 'data' | 'control' | 'conditional'
          condition_config: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          source_node_id: string
          target_node_id: string
          connection_type?: 'data' | 'control' | 'conditional'
          condition_config?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          source_node_id?: string
          target_node_id?: string
          connection_type?: 'data' | 'control' | 'conditional'
          condition_config?: Record<string, any>
          created_at?: string
        }
      }
      workflow_executions: {
        Row: {
          id: string
          workflow_id: string
          user_id: string
          status: 'running' | 'completed' | 'failed' | 'cancelled'
          trigger_type: string
          trigger_data: Record<string, any>
          input_data: Record<string, any>
          output_data: Record<string, any>
          error_message: string | null
          execution_time_ms: number | null
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          user_id: string
          status?: 'running' | 'completed' | 'failed' | 'cancelled'
          trigger_type: string
          trigger_data?: Record<string, any>
          input_data?: Record<string, any>
          output_data?: Record<string, any>
          error_message?: string | null
          execution_time_ms?: number | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          user_id?: string
          status?: 'running' | 'completed' | 'failed' | 'cancelled'
          trigger_type?: string
          trigger_data?: Record<string, any>
          input_data?: Record<string, any>
          output_data?: Record<string, any>
          error_message?: string | null
          execution_time_ms?: number | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      node_executions: {
        Row: {
          id: string
          execution_id: string
          node_id: string
          status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
          input_data: Record<string, any>
          output_data: Record<string, any>
          error_message: string | null
          execution_time_ms: number | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          execution_id: string
          node_id: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
          input_data?: Record<string, any>
          output_data?: Record<string, any>
          error_message?: string | null
          execution_time_ms?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          execution_id?: string
          node_id?: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
          input_data?: Record<string, any>
          output_data?: Record<string, any>
          error_message?: string | null
          execution_time_ms?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          category: string
          icon_url: string | null
          documentation_url: string | null
          config_schema: Record<string, any>
          is_active: boolean
          is_premium: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          category: string
          icon_url?: string | null
          documentation_url?: string | null
          config_schema?: Record<string, any>
          is_active?: boolean
          is_premium?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          category?: string
          icon_url?: string | null
          documentation_url?: string | null
          config_schema?: Record<string, any>
          is_active?: boolean
          is_premium?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_integrations: {
        Row: {
          id: string
          user_id: string
          integration_id: string
          name: string
          config: Record<string, any>
          is_active: boolean
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          integration_id: string
          name: string
          config?: Record<string, any>
          is_active?: boolean
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          integration_id?: string
          name?: string
          config?: Record<string, any>
          is_active?: boolean
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          slug: string
          subscription_tier: 'free' | 'pro' | 'enterprise'
          subscription_status: 'active' | 'cancelled' | 'past_due'
          subscription_expires_at: string | null
          usage_limit: number
          usage_count: number
          usage_reset_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          slug: string
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_status?: 'active' | 'cancelled' | 'past_due'
          subscription_expires_at?: string | null
          usage_limit?: number
          usage_count?: number
          usage_reset_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          slug?: string
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_status?: 'active' | 'cancelled' | 'past_due'
          subscription_expires_at?: string | null
          usage_limit?: number
          usage_count?: number
          usage_reset_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by: string | null
          invited_at: string
          joined_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
          created_at?: string
        }
      }
      workflow_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          tags: string[]
          template_data: Record<string, any>
          is_official: boolean
          is_featured: boolean
          usage_count: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          tags?: string[]
          template_data: Record<string, any>
          is_official?: boolean
          is_featured?: boolean
          usage_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          tags?: string[]
          template_data?: Record<string, any>
          is_official?: boolean
          is_featured?: boolean
          usage_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflow_shares: {
        Row: {
          id: string
          workflow_id: string
          shared_by: string
          shared_with: string
          permission: 'view' | 'edit' | 'execute'
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          shared_by: string
          shared_with: string
          permission?: 'view' | 'edit' | 'execute'
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          shared_by?: string
          shared_with?: string
          permission?: 'view' | 'edit' | 'execute'
          expires_at?: string | null
          created_at?: string
        }
      }
      ai_models: {
        Row: {
          id: string
          name: string
          display_name: string
          provider: string
          model_type: string
          config_schema: Record<string, any>
          is_active: boolean
          is_premium: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          provider: string
          model_type: string
          config_schema?: Record<string, any>
          is_active?: boolean
          is_premium?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          provider?: string
          model_type?: string
          config_schema?: Record<string, any>
          is_active?: boolean
          is_premium?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_analytics: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: Record<string, any>
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// =====================================================
// Convenience Types
// =====================================================

export type User = Database['public']['Tables']['users']['Row']
export type Workflow = Database['public']['Tables']['workflows']['Row']
export type WorkflowNode = Database['public']['Tables']['workflow_nodes']['Row']
export type WorkflowConnection = Database['public']['Tables']['workflow_connections']['Row']
export type WorkflowExecution = Database['public']['Tables']['workflow_executions']['Row']
export type NodeExecution = Database['public']['Tables']['node_executions']['Row']
export type Integration = Database['public']['Tables']['integrations']['Row']
export type UserIntegration = Database['public']['Tables']['user_integrations']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type WorkflowTemplate = Database['public']['Tables']['workflow_templates']['Row']
export type WorkflowShare = Database['public']['Tables']['workflow_shares']['Row']
export type AIModel = Database['public']['Tables']['ai_models']['Row']
export type UserAnalytics = Database['public']['Tables']['user_analytics']['Row']

// =====================================================
// Extended Types with Relations
// =====================================================

export interface WorkflowWithNodes extends Workflow {
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
}

export interface WorkflowExecutionWithNodes extends WorkflowExecution {
  node_executions: NodeExecution[]
}

export interface UserWithTeams extends User {
  teams: (TeamMember & { team: Team })[]
}

export interface TeamWithMembers extends Team {
  members: (TeamMember & { user: User })[]
}

// =====================================================
// Node Types and Configurations
// =====================================================

export type NodeType = 
  | 'trigger'
  | 'action'
  | 'condition'
  | 'ai-process'
  | 'data-transform'
  | 'webhook'
  | 'email'
  | 'slack'
  | 'discord'
  | 'openai'
  | 'anthropic'
  | 'google-sheets'
  | 'airtable'
  | 'mysql'
  | 'postgresql'
  | 'mongodb'
  | 'aws-s3'
  | 'google-drive'
  | 'dropbox'
  | 'github'
  | 'jira'
  | 'trello'
  | 'salesforce'
  | 'hubspot'
  | 'zapier'

export interface NodeConfig {
  [key: string]: any
}

export interface TriggerConfig extends NodeConfig {
  type: 'manual' | 'scheduled' | 'webhook' | 'api'
  schedule?: string // Cron expression
  webhook_path?: string
  api_key?: string
}

export interface ActionConfig extends NodeConfig {
  integration_id: string
  action_type: string
  parameters: Record<string, any>
}

export interface ConditionConfig extends NodeConfig {
  condition_type: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists'
  field_path: string
  value: any
  operator?: 'and' | 'or'
}

export interface AIProcessConfig extends NodeConfig {
  model_id: string
  prompt_template: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
}

export interface DataTransformConfig extends NodeConfig {
  transform_type: 'map' | 'filter' | 'reduce' | 'sort' | 'group'
  mapping?: Record<string, string>
  filter_conditions?: any[]
  reduce_function?: string
}

// =====================================================
// Execution Types
// =====================================================

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled'
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface ExecutionResult {
  success: boolean
  data?: any
  error?: string
  execution_time_ms?: number
}

export interface WorkflowExecutionContext {
  workflow_id: string
  execution_id: string
  user_id: string
  trigger_data: any
  variables: Record<string, any>
  node_results: Record<string, any>
}

// =====================================================
// Integration Types
// =====================================================

export type IntegrationCategory = 
  | 'api'
  | 'database'
  | 'ai-service'
  | 'communication'
  | 'storage'
  | 'automation'
  | 'analytics'

export interface IntegrationConfig {
  [key: string]: any
}

export interface APIIntegrationConfig extends IntegrationConfig {
  base_url: string
  api_key?: string
  headers?: Record<string, string>
  auth_type?: 'bearer' | 'basic' | 'api_key'
}

export interface DatabaseIntegrationConfig extends IntegrationConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
}

export interface AIServiceConfig extends IntegrationConfig {
  api_key: string
  model: string
  temperature?: number
  max_tokens?: number
}

// =====================================================
// Analytics Types
// =====================================================

export type AnalyticsEventType = 
  | 'workflow_created'
  | 'workflow_executed'
  | 'workflow_shared'
  | 'integration_connected'
  | 'template_used'
  | 'team_created'
  | 'subscription_upgraded'

export interface AnalyticsEvent {
  event_type: AnalyticsEventType
  event_data: Record<string, any>
  user_id: string
  timestamp: string
}

// =====================================================
// Template Types
// =====================================================

export type TemplateCategory = 
  | 'automation'
  | 'data-processing'
  | 'ai-analysis'
  | 'communication'
  | 'integration'
  | 'workflow'

export interface TemplateData {
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  metadata: {
    version: string
    description: string
    tags: string[]
  }
}
