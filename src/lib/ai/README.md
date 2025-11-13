# AI Integration System

Complete OpenAI integration for workflow generation and AI chat functionality.

## Features

- ✅ **Workflow Generation**: Generate complete workflows from natural language prompts
- ✅ **AI Chat**: Conversational AI assistant integrated with chat sidebar
- ✅ **Structured Output**: GPT-4o with JSON mode for reliable workflow structures
- ✅ **Node Library Integration**: Automatically uses available nodes from library
- ✅ **Type Safety**: Full TypeScript support throughout

## Structure

```
src/lib/ai/
├── types.ts              # TypeScript type definitions
├── workflow-generator.ts  # Core workflow generation logic
├── chat.ts               # Chat interaction logic
├── index.ts              # Central exports
└── README.md             # This file
```

## API Routes

### `POST /api/ai/chat`

Handles chat interactions with the AI assistant.

**Request:**
```typescript
{
  message: string;
  chatId: string;
  conversationHistory?: ChatMessage[];
  context?: {
    workflowId?: string;
    workflowName?: string;
  };
}
```

**Response:**
```typescript
{
  message: string;
  suggestions?: string[];
  shouldGenerateWorkflow?: boolean;
  workflowPrompt?: string;
}
```

### `POST /api/ai/generate-workflow`

Generates complete workflows from natural language prompts.

**Request:**
```typescript
{
  userPrompt: string;
  availableNodes?: Array<{
    id: string;
    name: string;
    type: 'trigger' | 'action' | 'transform';
    description: string;
    category: string;
    configSchema: Record<string, any>;
  }>;
  existingNodes?: Node[];
  existingEdges?: Edge[];
}
```

**Response:**
```typescript
{
  success: boolean;
  workflow: {
    nodes: Array<{
      id: string;
      type: 'workflow-node';
      position: { x: number; y: number };
      data: {
        nodeId: string;
        config: Record<string, any>;
      };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type: 'buttonedge';
      animated: boolean;
      style?: { stroke: string; strokeWidth: number };
    }>;
    reasoning: string;
    missingNodes?: string[];
    workflowName?: string;
  };
  error?: string;
}
```

## Usage Examples

### Generate a Workflow

```typescript
import { generateWorkflowFromPrompt, getSimplifiedNodeList } from '@/lib/ai';

const result = await generateWorkflowFromPrompt({
  userPrompt: "When someone fills out a Google Form, send them an email",
  availableNodes: getSimplifiedNodeList(),
});

if (result.success) {
  const { nodes, edges, workflowName } = result.workflow;
  // Use nodes and edges in React Flow
}
```

### Chat with AI

```typescript
import { generateChatResponse } from '@/lib/ai';

const response = await generateChatResponse({
  message: "How do I create a workflow?",
  chatId: "chat-123",
  conversationHistory: [],
});

console.log(response.message); // AI's response
console.log(response.shouldGenerateWorkflow); // true if workflow intent detected
```

### Detect Workflow Intent

```typescript
import { detectWorkflowIntent, extractWorkflowPrompt } from '@/lib/ai';

const message = "I want to create a workflow that sends an email when a form is submitted";

if (detectWorkflowIntent(message)) {
  const prompt = extractWorkflowPrompt(message);
  // Use prompt for workflow generation
}
```

## Environment Variables

Required in `.env.local`:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

## Models Used

- **GPT-4o**: Used for all AI interactions
  - Workflow generation: `temperature: 0.3` (more deterministic)
  - Chat responses: `temperature: 0.7` (more natural)
  - Structured JSON output enabled

## Workflow Generation Process

1. **User provides prompt**: "When someone fills out a Google Form, send them an email"

2. **AI analyzes request**:
   - Identifies trigger: Google Form submission
   - Identifies action: Send email
   - Maps to available nodes: `new-form-submission` + `send-email`

3. **AI generates workflow structure**:
   - Creates nodes with proper positions
   - Connects nodes with edges
   - Generates initial configurations
   - Provides reasoning

4. **System validates**:
   - Checks all node IDs exist in library
   - Validates edge connections
   - Ensures proper formatting

5. **Workflow rendered**:
   - Nodes placed on React Flow canvas
   - Edges connected
   - Ready for user configuration

## Error Handling

All functions include comprehensive error handling:

- Invalid API keys
- Network errors
- Invalid JSON responses
- Missing required fields
- Invalid node references

Errors are logged to console and returned in response objects.

## Integration with Chat Sidebar

The AI chat sidebar can:

1. Detect when users want to create workflows
2. Extract workflow requirements from conversation
3. Generate workflows on-demand
4. Display AI responses and suggestions

## Future Enhancements

Potential improvements:

- [ ] Support for modifying existing workflows
- [ ] Multi-step workflow refinement through conversation
- [ ] Custom node code generation
- [ ] Workflow validation and suggestions
- [ ] Support for multiple AI providers (Claude, Gemini)
- [ ] Streaming responses for better UX
- [ ] Workflow preview before generation
- [ ] Configuration assistance for complex nodes

## Testing

Test the API routes:

```bash
# Test chat endpoint
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how can you help me?",
    "chatId": "test-chat-1"
  }'

# Test workflow generation
curl -X POST http://localhost:3000/api/ai/generate-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "userPrompt": "When someone fills out a Google Form, send them an email"
  }'
```

## Security

- All endpoints require authentication via Supabase
- API keys stored in environment variables
- User data isolated via RLS policies
- Input validation on all endpoints
- Error messages don't expose sensitive information

