# 🗄️ AI Workflow Builder Database Schema

## 📋 Overview

This comprehensive database schema supports a complete AI workflow builder platform with user management, workflow creation, execution, integrations, and team collaboration.

## 🏗️ Database Structure

### **Core Tables (14 tables)**

1. **`users`** - User profiles extending Supabase auth
2. **`workflows`** - AI workflows created by users
3. **`workflow_nodes`** - Individual steps/nodes in workflows
4. **`workflow_connections`** - Links between workflow nodes
5. **`workflow_executions`** - Execution history and results
6. **`node_executions`** - Individual node execution results
7. **`integrations`** - Available third-party integrations
8. **`user_integrations`** - User-specific integration configs
9. **`teams`** - Teams/organizations for collaboration
10. **`team_members`** - Team membership and roles
11. **`workflow_templates`** - Pre-built workflow templates
12. **`workflow_shares`** - Shared workflows between users
13. **`ai_models`** - Available AI models and configurations
14. **`user_analytics`** - User behavior and usage tracking

## 🚀 Setup Instructions

### **Step 1: Run the Migration Script**

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Execute the Schema**
   - Copy the entire contents of `database/schema.sql`
   - Paste into the SQL Editor
   - Click **Run** to execute

3. **Verify Tables Created**
   - Go to **Table Editor**
   - Confirm all 14 tables are created
   - Check that indexes and policies are applied

### **Step 2: Update Your Supabase Client**

1. **Install the Database Types**
   ```bash
   # The types are already created in src/types/database.ts
   ```

2. **Update Your Supabase Client Configuration**
   ```typescript
   // src/lib/supabase.ts
   import { createClient } from '@supabase/supabase-js'
   import type { Database } from '@/types/database'

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

   export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
   ```

### **Step 3: Test the Setup**

1. **Create a Test User**
   - Sign up through your app
   - Check that a user record is created in the `users` table

2. **Verify RLS Policies**
   - Try accessing data as different users
   - Confirm Row Level Security is working

## 🔐 Security Features

### **Row Level Security (RLS)**
- ✅ **Users can only access their own data**
- ✅ **Public workflows are viewable by all**
- ✅ **Team members can access team data**
- ✅ **Shared workflows respect permissions**
- ✅ **Integration configs are user-specific**

### **Data Protection**
- ✅ **Encrypted integration configurations**
- ✅ **Secure API key storage**
- ✅ **User data isolation**
- ✅ **Team-based access control**

## 📊 Key Features Supported

### **Workflow Management**
- ✅ **Drag-and-drop workflow builder**
- ✅ **Node-based workflow creation**
- ✅ **Conditional logic and branching**
- ✅ **Workflow versioning**
- ✅ **Template system**

### **Execution Engine**
- ✅ **Real-time execution tracking**
- ✅ **Node-level execution results**
- ✅ **Error handling and logging**
- ✅ **Performance monitoring**
- ✅ **Execution history**

### **Integrations**
- ✅ **20+ pre-configured integrations**
- ✅ **Custom integration support**
- ✅ **API key management**
- ✅ **Integration testing**
- ✅ **Usage tracking**

### **AI Capabilities**
- ✅ **Multiple AI model support**
- ✅ **Natural language to workflow**
- ✅ **AI-powered node suggestions**
- ✅ **Intelligent error handling**
- ✅ **AI model configuration**

### **Team Collaboration**
- ✅ **Team creation and management**
- ✅ **Role-based permissions**
- ✅ **Workflow sharing**
- ✅ **Team usage limits**
- ✅ **Collaborative editing**

### **Analytics & Monitoring**
- ✅ **User behavior tracking**
- ✅ **Usage analytics**
- ✅ **Performance metrics**
- ✅ **Subscription management**
- ✅ **Billing integration ready**

## 🔧 Database Relationships

```
users (1) ──→ (many) workflows
workflows (1) ──→ (many) workflow_nodes
workflows (1) ──→ (many) workflow_connections
workflows (1) ──→ (many) workflow_executions
workflow_executions (1) ──→ (many) node_executions
users (1) ──→ (many) user_integrations
integrations (1) ──→ (many) user_integrations
teams (1) ──→ (many) team_members
users (1) ──→ (many) team_members
workflows (1) ──→ (many) workflow_shares
```

## 📈 Performance Optimizations

### **Indexes Created**
- ✅ **Primary key indexes** on all tables
- ✅ **Foreign key indexes** for relationships
- ✅ **Search indexes** using GIN for text search
- ✅ **Composite indexes** for common queries
- ✅ **Performance indexes** for analytics

### **Query Optimization**
- ✅ **Efficient joins** with proper indexes
- ✅ **Pagination support** with LIMIT/OFFSET
- ✅ **Full-text search** capabilities
- ✅ **Real-time subscriptions** optimized
- ✅ **Batch operations** supported

## 🎯 Next Steps

### **Immediate Actions**
1. ✅ **Run the migration script** in Supabase
2. ✅ **Update your Supabase client** with types
3. ✅ **Test user creation** and RLS policies
4. ✅ **Verify all tables** are created correctly

### **Development Tasks**
1. **Build the workflow builder UI** (React Flow integration)
2. **Implement the execution engine** (Node.js/Edge Functions)
3. **Create integration connectors** (API wrappers)
4. **Add AI model integration** (OpenAI/Anthropic)
5. **Build the dashboard** (workflow management)

### **Production Considerations**
1. **Set up monitoring** (Supabase Analytics)
2. **Configure backups** (Point-in-time recovery)
3. **Set up alerts** (Error monitoring)
4. **Performance tuning** (Query optimization)
5. **Security auditing** (RLS policy review)

## 🛠️ Customization Options

### **Adding New Integrations**
```sql
INSERT INTO public.integrations (name, display_name, category, config_schema)
VALUES ('new-service', 'New Service', 'api', '{"api_key": "string", "base_url": "string"}');
```

### **Adding New AI Models**
```sql
INSERT INTO public.ai_models (name, display_name, provider, model_type)
VALUES ('new-model', 'New AI Model', 'custom', 'text-generation');
```

### **Creating Custom Templates**
```sql
INSERT INTO public.workflow_templates (name, description, category, template_data)
VALUES ('Custom Template', 'Description', 'automation', '{"nodes": [], "connections": []}');
```

## 📚 Additional Resources

- **Supabase Documentation**: https://supabase.com/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Row Level Security Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Database Types**: Generated in `src/types/database.ts`

## 🎉 You're Ready!

Your database schema is now complete and ready to support a full-featured AI workflow builder. The schema includes everything needed for:

- ✅ **User authentication and management**
- ✅ **Workflow creation and execution**
- ✅ **Third-party integrations**
- ✅ **Team collaboration**
- ✅ **AI model integration**
- ✅ **Analytics and monitoring**

**Next step**: Start building the workflow builder UI! 🚀
