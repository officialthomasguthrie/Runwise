import { Edge, Node } from '@xyflow/react';

export interface TemplateData {
  nodes: Node[];
  edges: Edge[];
}

// Map template IDs to their node/edge configuration
export const TEMPLATES: Record<number, TemplateData> = {
  // 1. X Post Scheduler
  1: {
    nodes: [
      {
        id: 'trigger-1',
        type: 'workflow-node',
        position: { x: 100, y: 100 },
        data: { 
          nodeId: 'scheduled-time-trigger', 
          label: 'Schedule Trigger', // "Set time schedule trigger"
          config: { schedule: '0 9 * * *' } 
        }
      },
      {
        id: 'action-1',
        type: 'workflow-node',
        position: { x: 400, y: 100 },
        data: { 
          nodeId: 'generate-ai-content', 
          label: 'Generate Content', // "Generate AI content"
          config: { prompt: 'Generate a social media post about business operations' } 
        }
      },
      {
        id: 'action-2',
        type: 'workflow-node',
        position: { x: 700, y: 100 },
        data: { 
          nodeId: 'post-to-x', 
          label: 'Post to X', // "Post to X"
          config: { text: '{{input.content}}' } 
        }
      },
      {
        id: 'action-3',
        type: 'workflow-node',
        position: { x: 1000, y: 100 },
        data: { 
          nodeId: 'post-to-slack-channel', 
          label: 'Send Summary', // "Send summary to slack"
          config: { channel: '#social-media', message: 'Posted to X: {{input.content}}' } 
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'action-1', type: 'button-edge' },
      { id: 'e2-3', source: 'action-1', target: 'action-2', type: 'button-edge' },
      { id: 'e3-4', source: 'action-2', target: 'action-3', type: 'button-edge' }
    ]
  },
  // 2. Email Auto-Responder
  2: {
    nodes: [
      {
        id: 'trigger-1',
        type: 'workflow-node',
        position: { x: 100, y: 100 },
        data: {
          nodeId: 'new-email-received',
          label: 'Email Received',
          description: 'Triggers when a new email is received in Gmail inbox.',
          config: { inboxId: 'me' }
        }
      },
      {
        id: 'action-1',
        type: 'workflow-node',
        position: { x: 400, y: 100 },
        data: {
          nodeId: 'generate-summary-with-ai',
          label: 'Generate Summary with AI',
          description: 'Generates a summary of the received email using AI.',
          config: { maxLength: 100 }
        }
      },
      {
        id: 'action-2',
        type: 'workflow-node',
        position: { x: 700, y: 100 },
        data: {
          nodeId: 'generate-ai-content',
          label: 'Generate AI Reply',
          description: 'Generates an AI-powered reply based on the email content and summary.',
          config: { prompt: 'Generate a professional and helpful email reply based on the following email: {{input.data}}' }
        }
      },
      {
        id: 'action-3',
        type: 'workflow-node',
        position: { x: 1000, y: 100 },
        data: {
          nodeId: 'send-email',
          label: 'Send Email',
          description: 'Sends the generated reply email to the original sender.',
          config: { subject: 'Re: {{input.data.subject}}', body: '{{input.content}}' }
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'action-1', type: 'button-edge' },
      { id: 'e2-3', source: 'action-1', target: 'action-2', type: 'button-edge' },
      { id: 'e3-4', source: 'action-2', target: 'action-3', type: 'button-edge' }
    ]
  }
};
