# 🗄️ Database Schema Relationships Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     USERS       │    │     TEAMS       │    │  INTEGRATIONS   │
│                 │    │                 │    │                 │
│ • id (PK)       │    │ • id (PK)       │    │ • id (PK)       │
│ • email         │    │ • name          │    │ • name          │
│ • first_name    │    │ • slug          │    │ • category      │
│ • last_name     │    │ • subscription  │    │ • config_schema │
│ • subscription  │    │ • usage_limit   │    │ • is_active     │
│ • usage_limit   │    └─────────────────┘    └─────────────────┘
│ • usage_count   │             │                       │
└─────────────────┘             │                       │
         │                      │                       │
         │ 1:N                  │ 1:N                   │ 1:N
         │                      │                       │
         ▼                      ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WORKFLOWS      │    │ TEAM_MEMBERS     │    │USER_INTEGRATIONS│
│                 │    │                 │    │                 │
│ • id (PK)       │    │ • id (PK)       │    │ • id (PK)       │
│ • user_id (FK)  │    │ • team_id (FK)  │    │ • user_id (FK)  │
│ • name          │    │ • user_id (FK)  │    │ • integration_id│
│ • status        │    │ • role           │    │ • name          │
│ • is_public     │    │ • invited_at    │    │ • config        │
│ • ai_prompt     │    │ • joined_at     │    │ • is_active     │
│ • execution_cnt │    └─────────────────┘    └─────────────────┘
└─────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│ WORKFLOW_NODES  │    │WORKFLOW_CONNECTIONS│
│                 │    │                 │
│ • id (PK)       │    │ • id (PK)       │
│ • workflow_id   │    │ • workflow_id   │
│ • node_type     │    │ • source_node_id│
│ • name          │    │ • target_node_id│
│ • position_x    │    │ • connection_type│
│ • position_y    │    │ • condition_cfg │
│ • config        │    └─────────────────┘
│ • is_enabled    │
└─────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│WORKFLOW_EXECUTIONS│   │ NODE_EXECUTIONS │
│                 │    │                 │
│ • id (PK)       │    │ • id (PK)       │
│ • workflow_id   │    │ • execution_id  │
│ • user_id       │    │ • node_id       │
│ • status        │    │ • status        │
│ • trigger_type  │    │ • input_data    │
│ • input_data    │    │ • output_data   │
│ • output_data   │    │ • error_message │
│ • error_message │    │ • exec_time_ms  │
│ • exec_time_ms  │    └─────────────────┘
└─────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│WORKFLOW_TEMPLATES│   │ WORKFLOW_SHARES  │
│                 │    │                 │
│ • id (PK)       │    │ • id (PK)       │
│ • name          │    │ • workflow_id   │
│ • category      │    │ • shared_by     │
│ • template_data │    │ • shared_with   │
│ • is_official   │    │ • permission    │
│ • usage_count   │    │ • expires_at    │
└─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐
│   AI_MODELS      │    │ USER_ANALYTICS  │
│                 │    │                 │
│ • id (PK)       │    │ • id (PK)       │
│ • name          │    │ • user_id       │
│ • provider      │    │ • event_type    │
│ • model_type    │    │ • event_data    │
│ • config_schema │    │ • created_at    │
│ • is_active     │    └─────────────────┘
└─────────────────┘
```

## 🔗 Key Relationships

### **User-Centric Relationships**
- **Users** → **Workflows** (1:N) - Users can create multiple workflows
- **Users** → **User Integrations** (1:N) - Users can connect multiple integrations
- **Users** → **Team Members** (1:N) - Users can be members of multiple teams
- **Users** → **Workflow Executions** (1:N) - Users can execute workflows
- **Users** → **User Analytics** (1:N) - Users generate analytics events

### **Workflow-Centric Relationships**
- **Workflows** → **Workflow Nodes** (1:N) - Workflows contain multiple nodes
- **Workflows** → **Workflow Connections** (1:N) - Workflows have node connections
- **Workflows** → **Workflow Executions** (1:N) - Workflows can be executed multiple times
- **Workflows** → **Workflow Shares** (1:N) - Workflows can be shared with multiple users

### **Execution Relationships**
- **Workflow Executions** → **Node Executions** (1:N) - Each execution has multiple node executions
- **Workflow Nodes** → **Node Executions** (1:N) - Each node can be executed multiple times

### **Team Relationships**
- **Teams** → **Team Members** (1:N) - Teams have multiple members
- **Teams** → **Users** (N:M) - Many-to-many through team_members

### **Integration Relationships**
- **Integrations** → **User Integrations** (1:N) - Each integration can be used by multiple users
- **Users** → **User Integrations** (1:N) - Users can have multiple integration instances

## 📊 Data Flow

```
1. USER CREATION
   auth.users → users (via trigger)

2. WORKFLOW CREATION
   users → workflows → workflow_nodes → workflow_connections

3. WORKFLOW EXECUTION
   workflows → workflow_executions → node_executions

4. INTEGRATION SETUP
   integrations → user_integrations (per user)

5. TEAM COLLABORATION
   teams → team_members → users

6. WORKFLOW SHARING
   workflows → workflow_shares → users

7. ANALYTICS TRACKING
   users → user_analytics (events)
```

## 🔐 Security Model

### **Row Level Security (RLS)**
- **Users**: Can only access their own profile
- **Workflows**: Can access own workflows + public workflows
- **Teams**: Team members can access team data
- **Integrations**: Users can only access their own integrations
- **Executions**: Users can only access their own executions
- **Shares**: Users can access workflows shared with them

### **Data Isolation**
- **User Data**: Completely isolated per user
- **Team Data**: Shared among team members
- **Public Data**: Accessible to all users (templates, integrations)
- **Execution Data**: Private to workflow owner
