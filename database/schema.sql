-- =====================================================
-- AI Workflow Builder Database Schema
-- =====================================================
-- This schema supports a complete AI workflow builder platform
-- with user management, workflow creation, execution, and integrations

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- CORE USER MANAGEMENT
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due')),
    subscription_expires_at TIMESTAMPTZ,
    usage_limit INTEGER DEFAULT 100, -- Monthly workflow executions
    usage_count INTEGER DEFAULT 0, -- Current month usage
    usage_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WORKFLOW MANAGEMENT
-- =====================================================

-- Workflows table
CREATE TABLE public.workflows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    is_public BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    template_category TEXT, -- 'automation', 'data-processing', 'ai-analysis', etc.
    tags TEXT[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    ai_prompt TEXT, -- Original natural language prompt
    ai_generated BOOLEAN DEFAULT FALSE,
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow nodes (individual steps in a workflow)
CREATE TABLE public.workflow_nodes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
    node_type TEXT NOT NULL, -- 'trigger', 'action', 'condition', 'ai-process', 'data-transform', etc.
    name TEXT NOT NULL,
    description TEXT,
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    config JSONB DEFAULT '{}', -- Node-specific configuration
    is_enabled BOOLEAN DEFAULT TRUE,
    execution_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow connections (links between nodes)
CREATE TABLE public.workflow_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
    source_node_id UUID REFERENCES public.workflow_nodes(id) ON DELETE CASCADE NOT NULL,
    target_node_id UUID REFERENCES public.workflow_nodes(id) ON DELETE CASCADE NOT NULL,
    connection_type TEXT DEFAULT 'data' CHECK (connection_type IN ('data', 'control', 'conditional')),
    condition_config JSONB DEFAULT '{}', -- For conditional connections
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EXECUTION MANAGEMENT
-- =====================================================

-- Workflow executions
CREATE TABLE public.workflow_executions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    trigger_type TEXT NOT NULL, -- 'manual', 'scheduled', 'webhook', 'api'
    trigger_data JSONB DEFAULT '{}',
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    execution_time_ms INTEGER,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Node executions (individual node execution results)
CREATE TABLE public.node_executions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE NOT NULL,
    node_id UUID REFERENCES public.workflow_nodes(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    execution_time_ms INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INTEGRATIONS MANAGEMENT
-- =====================================================

-- Available integrations
CREATE TABLE public.integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'api', 'database', 'ai-service', 'communication', 'storage', etc.
    icon_url TEXT,
    documentation_url TEXT,
    config_schema JSONB DEFAULT '{}', -- JSON schema for configuration
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's connected integrations
CREATE TABLE public.user_integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- User's custom name for this integration
    config JSONB DEFAULT '{}', -- Encrypted configuration
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, integration_id, name)
);

-- =====================================================
-- TEAM MANAGEMENT
-- =====================================================

-- Teams/Organizations
CREATE TABLE public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due')),
    subscription_expires_at TIMESTAMPTZ,
    usage_limit INTEGER DEFAULT 1000,
    usage_count INTEGER DEFAULT 0,
    usage_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_by UUID REFERENCES public.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- =====================================================
-- TEMPLATES AND SHARING
-- =====================================================

-- Workflow templates
CREATE TABLE public.workflow_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    template_data JSONB NOT NULL, -- Complete workflow structure
    is_official BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow shares (for sharing workflows with specific users)
CREATE TABLE public.workflow_shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
    shared_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    shared_with UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'execute')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id, shared_with)
);

-- =====================================================
-- AI AND ANALYTICS
-- =====================================================

-- AI model configurations
CREATE TABLE public.ai_models (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google', 'custom'
    model_type TEXT NOT NULL, -- 'text-generation', 'embedding', 'image-generation', etc.
    config_schema JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User analytics and usage tracking
CREATE TABLE public.user_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL, -- 'workflow_created', 'workflow_executed', 'integration_connected', etc.
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_subscription_tier ON public.users(subscription_tier);
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- Workflows indexes
CREATE INDEX idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX idx_workflows_status ON public.workflows(status);
CREATE INDEX idx_workflows_is_public ON public.workflows(is_public);
CREATE INDEX idx_workflows_is_template ON public.workflows(is_template);
CREATE INDEX idx_workflows_tags ON public.workflows USING GIN(tags);
CREATE INDEX idx_workflows_created_at ON public.workflows(created_at);
CREATE INDEX idx_workflows_name_trgm ON public.workflows USING GIN(name gin_trgm_ops);

-- Workflow nodes indexes
CREATE INDEX idx_workflow_nodes_workflow_id ON public.workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_nodes_type ON public.workflow_nodes(node_type);
CREATE INDEX idx_workflow_nodes_position ON public.workflow_nodes(workflow_id, position_x, position_y);

-- Workflow connections indexes
CREATE INDEX idx_workflow_connections_workflow_id ON public.workflow_connections(workflow_id);
CREATE INDEX idx_workflow_connections_source ON public.workflow_connections(source_node_id);
CREATE INDEX idx_workflow_connections_target ON public.workflow_connections(target_node_id);

-- Executions indexes
CREATE INDEX idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON public.workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_executions_started_at ON public.workflow_executions(started_at);

-- Node executions indexes
CREATE INDEX idx_node_executions_execution_id ON public.node_executions(execution_id);
CREATE INDEX idx_node_executions_node_id ON public.node_executions(node_id);
CREATE INDEX idx_node_executions_status ON public.node_executions(status);

-- Integrations indexes
CREATE INDEX idx_integrations_category ON public.integrations(category);
CREATE INDEX idx_integrations_is_active ON public.integrations(is_active);
CREATE INDEX idx_user_integrations_user_id ON public.user_integrations(user_id);
CREATE INDEX idx_user_integrations_integration_id ON public.user_integrations(integration_id);

-- Team indexes
CREATE INDEX idx_teams_slug ON public.teams(slug);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

-- Templates indexes
CREATE INDEX idx_workflow_templates_category ON public.workflow_templates(category);
CREATE INDEX idx_workflow_templates_is_official ON public.workflow_templates(is_official);
CREATE INDEX idx_workflow_templates_is_featured ON public.workflow_templates(is_featured);
CREATE INDEX idx_workflow_templates_tags ON public.workflow_templates USING GIN(tags);

-- Shares indexes
CREATE INDEX idx_workflow_shares_workflow_id ON public.workflow_shares(workflow_id);
CREATE INDEX idx_workflow_shares_shared_with ON public.workflow_shares(shared_with);

-- Analytics indexes
CREATE INDEX idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX idx_user_analytics_event_type ON public.user_analytics(event_type);
CREATE INDEX idx_user_analytics_created_at ON public.user_analytics(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Workflows policies
CREATE POLICY "Users can view own workflows" ON public.workflows
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public workflows" ON public.workflows
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create workflows" ON public.workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows" ON public.workflows
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows" ON public.workflows
    FOR DELETE USING (auth.uid() = user_id);

-- Workflow nodes policies
CREATE POLICY "Users can manage nodes of own workflows" ON public.workflow_nodes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workflows 
            WHERE id = workflow_id AND user_id = auth.uid()
        )
    );

-- Workflow connections policies
CREATE POLICY "Users can manage connections of own workflows" ON public.workflow_connections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workflows 
            WHERE id = workflow_id AND user_id = auth.uid()
        )
    );

-- Workflow executions policies
CREATE POLICY "Users can view own executions" ON public.workflow_executions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create executions" ON public.workflow_executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Node executions policies
CREATE POLICY "Users can view own node executions" ON public.node_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workflow_executions 
            WHERE id = execution_id AND user_id = auth.uid()
        )
    );

-- Integrations policies
CREATE POLICY "Anyone can view active integrations" ON public.integrations
    FOR SELECT USING (is_active = true);

-- User integrations policies
CREATE POLICY "Users can manage own integrations" ON public.user_integrations
    FOR ALL USING (auth.uid() = user_id);

-- Teams policies
CREATE POLICY "Team members can view team" ON public.teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE team_id = id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Team owners can update team" ON public.teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE team_id = id AND user_id = auth.uid() AND role = 'owner'
        )
    );

-- Team members policies
CREATE POLICY "Team members can view team members" ON public.team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm2
            WHERE tm2.team_id = team_id AND tm2.user_id = auth.uid()
        )
    );

CREATE POLICY "Team admins can manage members" ON public.team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm2
            WHERE tm2.team_id = team_id AND tm2.user_id = auth.uid() 
            AND tm2.role IN ('owner', 'admin')
        )
    );

-- Workflow templates policies
CREATE POLICY "Anyone can view public templates" ON public.workflow_templates
    FOR SELECT USING (is_official = true);

-- Workflow shares policies
CREATE POLICY "Users can view shared workflows" ON public.workflow_shares
    FOR SELECT USING (auth.uid() = shared_with);

CREATE POLICY "Users can share workflows" ON public.workflow_shares
    FOR INSERT WITH CHECK (auth.uid() = shared_by);

-- AI models policies
CREATE POLICY "Anyone can view active AI models" ON public.ai_models
    FOR SELECT USING (is_active = true);

-- User analytics policies
CREATE POLICY "Users can view own analytics" ON public.user_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create analytics events" ON public.user_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_nodes_updated_at BEFORE UPDATE ON public.workflow_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON public.workflow_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_integrations_updated_at BEFORE UPDATE ON public.user_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to reset usage counters
CREATE OR REPLACE FUNCTION reset_usage_counters()
RETURNS void AS $$
BEGIN
    UPDATE public.users 
    SET usage_count = 0, usage_reset_at = NOW() + INTERVAL '1 month'
    WHERE usage_reset_at <= NOW();
    
    UPDATE public.teams 
    SET usage_count = 0, usage_reset_at = NOW() + INTERVAL '1 month'
    WHERE usage_reset_at <= NOW();
END;
$$ language 'plpgsql';

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default integrations
INSERT INTO public.integrations (name, display_name, description, category, is_active) VALUES
('webhook', 'Webhook', 'Send HTTP requests to external services', 'api', true),
('email', 'Email', 'Send emails via SMTP', 'communication', true),
('slack', 'Slack', 'Send messages to Slack channels', 'communication', true),
('discord', 'Discord', 'Send messages to Discord channels', 'communication', true),
('openai', 'OpenAI', 'Access OpenAI GPT models', 'ai-service', true),
('anthropic', 'Anthropic', 'Access Anthropic Claude models', 'ai-service', true),
('google-sheets', 'Google Sheets', 'Read and write Google Sheets data', 'storage', true),
('airtable', 'Airtable', 'Read and write Airtable records', 'storage', true),
('mysql', 'MySQL', 'Connect to MySQL databases', 'database', true),
('postgresql', 'PostgreSQL', 'Connect to PostgreSQL databases', 'database', true),
('mongodb', 'MongoDB', 'Connect to MongoDB databases', 'database', true),
('aws-s3', 'AWS S3', 'Upload and download files from S3', 'storage', true),
('google-drive', 'Google Drive', 'Access Google Drive files', 'storage', true),
('dropbox', 'Dropbox', 'Access Dropbox files', 'storage', true),
('github', 'GitHub', 'Access GitHub repositories and issues', 'api', true),
('jira', 'Jira', 'Access Jira issues and projects', 'api', true),
('trello', 'Trello', 'Access Trello boards and cards', 'api', true),
('salesforce', 'Salesforce', 'Access Salesforce CRM data', 'api', true),
('hubspot', 'HubSpot', 'Access HubSpot CRM data', 'api', true),
('zapier', 'Zapier', 'Connect to Zapier apps', 'api', true);

-- Insert default AI models
INSERT INTO public.ai_models (name, display_name, provider, model_type, is_active) VALUES
('gpt-4', 'GPT-4', 'openai', 'text-generation', true),
('gpt-4-turbo', 'GPT-4 Turbo', 'openai', 'text-generation', true),
('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 'text-generation', true),
('claude-3-opus', 'Claude 3 Opus', 'anthropic', 'text-generation', true),
('claude-3-sonnet', 'Claude 3 Sonnet', 'anthropic', 'text-generation', true),
('claude-3-haiku', 'Claude 3 Haiku', 'anthropic', 'text-generation', true),
('text-embedding-ada-002', 'Text Embedding Ada 002', 'openai', 'embedding', true),
('text-embedding-3-small', 'Text Embedding 3 Small', 'openai', 'embedding', true),
('text-embedding-3-large', 'Text Embedding 3 Large', 'openai', 'embedding', true);

-- Insert default workflow templates
INSERT INTO public.workflow_templates (name, description, category, template_data, is_official) VALUES
('Email Newsletter Automation', 'Automatically send personalized email newsletters based on user behavior', 'automation', '{"nodes": [], "connections": []}', true),
('Data Processing Pipeline', 'Process and transform data from multiple sources', 'data-processing', '{"nodes": [], "connections": []}', true),
('AI Content Generator', 'Generate content using AI and publish to multiple platforms', 'ai-analysis', '{"nodes": [], "connections": []}', true),
('Customer Support Automation', 'Automate customer support responses using AI', 'automation', '{"nodes": [], "connections": []}', true),
('Social Media Scheduler', 'Schedule and publish content across social media platforms', 'automation', '{"nodes": [], "connections": []}', true);

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.workflows IS 'AI workflows created by users';
COMMENT ON TABLE public.workflow_nodes IS 'Individual steps/nodes within workflows';
COMMENT ON TABLE public.workflow_connections IS 'Connections between workflow nodes';
COMMENT ON TABLE public.workflow_executions IS 'Execution history of workflows';
COMMENT ON TABLE public.node_executions IS 'Execution results of individual nodes';
COMMENT ON TABLE public.integrations IS 'Available third-party integrations';
COMMENT ON TABLE public.user_integrations IS 'User-specific integration configurations';
COMMENT ON TABLE public.teams IS 'Teams/organizations for collaborative workflows';
COMMENT ON TABLE public.team_members IS 'Team membership and roles';
COMMENT ON TABLE public.workflow_templates IS 'Pre-built workflow templates';
COMMENT ON TABLE public.workflow_shares IS 'Shared workflows between users';
COMMENT ON TABLE public.ai_models IS 'Available AI models and configurations';
COMMENT ON TABLE public.user_analytics IS 'User behavior and usage analytics';
