/**
 * Configuration Intent Detection
 * Detects when users want to configure nodes
 */

export function detectConfigIntent(message: string): boolean {
  const configKeywords = [
    'set',
    'configure',
    'fill in',
    'fill out',
    'enter',
    'put',
    'use',
    'api key',
    'api token',
    'password',
    'credential',
    'schedule',
    'time',
    'trigger',
    'prompt',
    'generate prompt',
    'make it',
    'change',
    'update',
    'modify',
  ];

  const lowerMessage = message.toLowerCase();
  return configKeywords.some((keyword) => lowerMessage.includes(keyword));
}

