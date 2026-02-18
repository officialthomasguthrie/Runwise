/**
 * Workflow Execution Error Normalization
 * Transforms raw provider errors into user-friendly, actionable messages
 */

export type ErrorSeverity = 'info' | 'warning' | 'error';

export interface ExecutionError {
  code: string;
  title: string;
  message: string;
  action?: string;
  provider?: string;
  severity: ErrorSeverity;
  raw: any; // Original error for technical details
}

/**
 * Normalize a raw error into an ExecutionError
 */
export function normalizeError(
  rawError: any,
  context?: {
    nodeName?: string;
    nodeType?: string;
    provider?: string;
  }
): ExecutionError {
  const errorMessage = typeof rawError === 'string' 
    ? rawError 
    : rawError?.message || rawError?.error || JSON.stringify(rawError);

  // Try to extract provider from error message or context
  const provider = detectProvider(errorMessage, context?.provider);

  // Try to find a specific error mapper
  const mapped = mapProviderError(errorMessage, provider, rawError);
  if (mapped) {
    return mapped;
  }

  // Generic normalization for common patterns
  return normalizeGenericError(errorMessage, rawError, context);
}

/**
 * Detect provider from error message or context
 */
function detectProvider(errorMessage: string, contextProvider?: string): string | undefined {
  if (contextProvider) return contextProvider;

  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes('sendgrid')) return 'sendgrid';
  if (lowerMessage.includes('twilio')) return 'twilio';
  if (lowerMessage.includes('openai') || lowerMessage.includes('gpt')) return 'openai';
  if (lowerMessage.includes('stripe')) return 'stripe';
  if (lowerMessage.includes('slack')) return 'slack';
  if (lowerMessage.includes('notion')) return 'notion';
  if (lowerMessage.includes('airtable')) return 'airtable';
  if (lowerMessage.includes('trello')) return 'trello';
  if (lowerMessage.includes('github')) return 'github';
  if (lowerMessage.includes('discord')) return 'discord';
  if (lowerMessage.includes('twitter') || lowerMessage.includes('x.com')) return 'twitter';
  if (lowerMessage.includes('paypal')) return 'paypal';
  if (lowerMessage.includes('shopify')) return 'shopify';
  if (lowerMessage.includes('hubspot')) return 'hubspot';
  if (lowerMessage.includes('asana')) return 'asana';
  if (lowerMessage.includes('jira')) return 'jira';

  return undefined;
}

/**
 * Map provider-specific errors to normalized format
 */
function mapProviderError(
  errorMessage: string,
  provider?: string,
  rawError?: any
): ExecutionError | null {
  if (!provider) return null;

  const lowerMessage = errorMessage.toLowerCase();
  const providerMappers: Record<string, (msg: string, raw: any) => ExecutionError | null> = {
    sendgrid: mapSendGridError,
    twilio: mapTwilioError,
    openai: mapOpenAIError,
    stripe: mapStripeError,
    slack: mapSlackError,
    notion: mapNotionError,
    airtable: mapAirtableError,
    trello: mapTrelloError,
    github: mapGitHubError,
    discord: mapDiscordError,
    twitter: mapTwitterError,
    paypal: mapPayPalError,
  };

  const mapper = providerMappers[provider.toLowerCase()];
  if (mapper) {
    return mapper(errorMessage, rawError);
  }

  return null;
}

/**
 * SendGrid Error Mapper
 */
function mapSendGridError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  // Maximum credits exceeded
  if (lower.includes('maximum credits exceeded') || lower.includes('credits exceeded')) {
    return {
      code: 'SENDGRID_CREDITS_EXCEEDED',
      title: 'Email provider credits exhausted',
      message: 'Email could not be sent because your SendGrid account has no remaining credits.',
      action: 'Upgrade your SendGrid plan or connect a different email provider.',
      provider: 'SendGrid',
      severity: 'error',
      raw,
    };
  }

  // Invalid API key
  if (lower.includes('unauthorized') || lower.includes('invalid api key') || lower.includes('forbidden')) {
    return {
      code: 'SENDGRID_AUTH_FAILED',
      title: 'SendGrid authentication failed',
      message: 'Your SendGrid API key is invalid or has been revoked.',
      action: 'Verify your API key in SendGrid settings and reconnect the integration.',
      provider: 'SendGrid',
      severity: 'error',
      raw,
    };
  }

  // Rate limit
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return {
      code: 'SENDGRID_RATE_LIMIT',
      title: 'SendGrid rate limit reached',
      message: 'You have exceeded the rate limit for sending emails.',
      action: 'Wait a few minutes before trying again, or upgrade your SendGrid plan.',
      provider: 'SendGrid',
      severity: 'warning',
      raw,
    };
  }

  // Invalid email address
  if (lower.includes('invalid email') || lower.includes('malformed email')) {
    return {
      code: 'SENDGRID_INVALID_EMAIL',
      title: 'Invalid email address',
      message: 'The recipient email address is invalid or malformed.',
      action: 'Check the email address format and try again.',
      provider: 'SendGrid',
      severity: 'error',
      raw,
    };
  }

  return null;
}

/**
 * Twilio Error Mapper
 */
function mapTwilioError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  if (lower.includes('insufficient funds') || lower.includes('account balance')) {
    return {
      code: 'TWILIO_INSUFFICIENT_FUNDS',
      title: 'Twilio account balance insufficient',
      message: 'Your Twilio account does not have sufficient funds to send the message.',
      action: 'Add funds to your Twilio account or connect a different SMS provider.',
      provider: 'Twilio',
      severity: 'error',
      raw,
    };
  }

  if (lower.includes('invalid phone number') || lower.includes('unsubscribed')) {
    return {
      code: 'TWILIO_INVALID_NUMBER',
      title: 'Invalid phone number',
      message: 'The phone number is invalid or the recipient has unsubscribed.',
      action: 'Verify the phone number format and ensure the recipient has opted in.',
      provider: 'Twilio',
      severity: 'error',
      raw,
    };
  }

  return null;
}

/**
 * OpenAI Error Mapper
 */
function mapOpenAIError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  if (lower.includes('insufficient quota') || lower.includes('billing') || lower.includes('payment')) {
    return {
      code: 'OPENAI_QUOTA_EXCEEDED',
      title: 'OpenAI quota exceeded',
      message: 'Your OpenAI account has insufficient credits or billing is not set up.',
      action: 'Add payment method to your OpenAI account or check your usage limits.',
      provider: 'OpenAI',
      severity: 'error',
      raw,
    };
  }

  if (lower.includes('invalid api key') || lower.includes('unauthorized')) {
    return {
      code: 'OPENAI_AUTH_FAILED',
      title: 'OpenAI authentication failed',
      message: 'Your OpenAI API key is invalid or has been revoked.',
      action: 'Verify your API key in OpenAI settings and reconnect the integration.',
      provider: 'OpenAI',
      severity: 'error',
      raw,
    };
  }

  if (lower.includes('rate limit')) {
    return {
      code: 'OPENAI_RATE_LIMIT',
      title: 'OpenAI rate limit reached',
      message: 'You have exceeded the rate limit for OpenAI API requests.',
      action: 'Wait a few minutes before trying again, or upgrade your OpenAI plan.',
      provider: 'OpenAI',
      severity: 'warning',
      raw,
    };
  }

  return null;
}

/**
 * Stripe Error Mapper
 */
function mapStripeError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  if (lower.includes('card declined') || lower.includes('insufficient funds')) {
    return {
      code: 'STRIPE_CARD_DECLINED',
      title: 'Payment card declined',
      message: 'The payment card was declined by the bank.',
      action: 'Ask the customer to use a different payment method or contact their bank.',
      provider: 'Stripe',
      severity: 'error',
      raw,
    };
  }

  if (lower.includes('invalid api key') || lower.includes('unauthorized')) {
    return {
      code: 'STRIPE_AUTH_FAILED',
      title: 'Stripe authentication failed',
      message: 'Your Stripe API key is invalid or has been revoked.',
      action: 'Verify your API key in Stripe settings and reconnect the integration.',
      provider: 'Stripe',
      severity: 'error',
      raw,
    };
  }

  return null;
}

/**
 * Slack Error Mapper
 */
function mapSlackError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  if (lower.includes('channel_not_found') || lower.includes('channel not found')) {
    return {
      code: 'SLACK_CHANNEL_NOT_FOUND',
      title: 'Slack channel not found',
      message: 'The specified Slack channel does not exist or the bot does not have access.',
      action: 'Verify the channel name or ID, and ensure the bot is added to the channel.',
      provider: 'Slack',
      severity: 'error',
      raw,
    };
  }

  if (lower.includes('invalid token') || lower.includes('not_authed')) {
    return {
      code: 'SLACK_AUTH_FAILED',
      title: 'Slack authentication failed',
      message: 'Your Slack token is invalid or has been revoked.',
      action: 'Reconnect your Slack integration in settings.',
      provider: 'Slack',
      severity: 'error',
      raw,
    };
  }

  return null;
}

/**
 * Notion Error Mapper
 */
function mapNotionError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  if (lower.includes('unauthorized') || lower.includes('invalid token')) {
    return {
      code: 'NOTION_AUTH_FAILED',
      title: 'Notion authentication failed',
      message: 'Your Notion integration token is invalid or has been revoked.',
      action: 'Reconnect your Notion integration in settings.',
      provider: 'Notion',
      severity: 'error',
      raw,
    };
  }

  if (lower.includes('object not found') || lower.includes('page not found')) {
    return {
      code: 'NOTION_PAGE_NOT_FOUND',
      title: 'Notion page not found',
      message: 'The specified Notion page or database does not exist or is not accessible.',
      action: 'Verify the page or database ID and ensure the integration has access.',
      provider: 'Notion',
      severity: 'error',
      raw,
    };
  }

  return null;
}

/**
 * Airtable Error Mapper
 */
function mapAirtableError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  if (lower.includes('unauthorized') || lower.includes('invalid api key')) {
    return {
      code: 'AIRTABLE_AUTH_FAILED',
      title: 'Airtable authentication failed',
      message: 'Your Airtable API key is invalid or has been revoked.',
      action: 'Verify your API key in Airtable settings and reconnect the integration.',
      provider: 'Airtable',
      severity: 'error',
      raw,
    };
  }

  return null;
}

/**
 * Trello Error Mapper
 */
function mapTrelloError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  if (lower.includes('unauthorized') || lower.includes('invalid token')) {
    return {
      code: 'TRELLO_AUTH_FAILED',
      title: 'Trello authentication failed',
      message: 'Your Trello API key or token is invalid.',
      action: 'Reconnect your Trello integration in settings.',
      provider: 'Trello',
      severity: 'error',
      raw,
    };
  }

  return null;
}

/**
 * GitHub Error Mapper
 */
function mapGitHubError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  if (lower.includes('bad credentials') || lower.includes('unauthorized')) {
    return {
      code: 'GITHUB_AUTH_FAILED',
      title: 'GitHub authentication failed',
      message: 'Your GitHub personal access token is invalid or has been revoked.',
      action: 'Generate a new token in GitHub settings and reconnect the integration.',
      provider: 'GitHub',
      severity: 'error',
      raw,
    };
  }

  if (lower.includes('not found') || lower.includes('repository not found')) {
    return {
      code: 'GITHUB_REPO_NOT_FOUND',
      title: 'GitHub repository not found',
      message: 'The specified repository does not exist or is not accessible.',
      action: 'Verify the repository name and ensure you have access permissions.',
      provider: 'GitHub',
      severity: 'error',
      raw,
    };
  }

  return null;
}

/**
 * Discord Error Mapper
 */
function mapDiscordError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  if (lower.includes('unauthorized') || lower.includes('invalid token')) {
    return {
      code: 'DISCORD_AUTH_FAILED',
      title: 'Discord authentication failed',
      message: 'Your Discord bot token is invalid or has been revoked.',
      action: 'Verify your bot token in Discord Developer Portal and reconnect the integration.',
      provider: 'Discord',
      severity: 'error',
      raw,
    };
  }

  if (lower.includes('channel not found') || lower.includes('missing access')) {
    return {
      code: 'DISCORD_CHANNEL_NOT_FOUND',
      title: 'Discord channel not found',
      message: 'The specified Discord channel does not exist or the bot does not have access.',
      action: 'Verify the channel ID and ensure the bot is in the server with proper permissions.',
      provider: 'Discord',
      severity: 'error',
      raw,
    };
  }

  return null;
}

/**
 * Twitter Error Mapper
 */
function mapTwitterError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  if (lower.includes('unauthorized') || lower.includes('invalid token')) {
    return {
      code: 'TWITTER_AUTH_FAILED',
      title: 'Twitter authentication failed',
      message: 'Your Twitter API credentials are invalid or have been revoked.',
      action: 'Reconnect your Twitter integration in settings.',
      provider: 'Twitter',
      severity: 'error',
      raw,
    };
  }

  return null;
}

/**
 * PayPal Error Mapper
 */
function mapPayPalError(message: string, raw: any): ExecutionError | null {
  const lower = message.toLowerCase();
  
  if (lower.includes('unauthorized') || lower.includes('invalid credentials')) {
    return {
      code: 'PAYPAL_AUTH_FAILED',
      title: 'PayPal authentication failed',
      message: 'Your PayPal API credentials are invalid or have been revoked.',
      action: 'Reconnect your PayPal integration in settings.',
      provider: 'PayPal',
      severity: 'error',
      raw,
    };
  }

  return null;
}

/**
 * Normalize generic errors (fallback)
 */
function normalizeGenericError(
  errorMessage: string,
  rawError: any,
  context?: { nodeName?: string; nodeType?: string; provider?: string }
): ExecutionError {
  const lower = errorMessage.toLowerCase();

  // Remove common technical prefixes
  let cleanMessage = errorMessage
    .replace(/^(library node execution failed|node execution failed|execution failed):\s*/i, '')
    .replace(/^(error|failed):\s*/i, '')
    .trim();

  // Extract JSON error objects
  let parsedError: any = null;
  try {
    if (cleanMessage.includes('{') && cleanMessage.includes('}')) {
      const jsonMatch = cleanMessage.match(/\{.*\}/);
      if (jsonMatch) {
        parsedError = JSON.parse(jsonMatch[0]);
        // Try to extract a meaningful message from JSON
        if (parsedError.errors && Array.isArray(parsedError.errors) && parsedError.errors.length > 0) {
          const firstError = parsedError.errors[0];
          cleanMessage = firstError.message || firstError.help || cleanMessage;
        } else if (parsedError.message) {
          cleanMessage = parsedError.message;
        } else if (parsedError.error) {
          cleanMessage = parsedError.error;
        }
      }
    }
  } catch {
    // Ignore JSON parsing errors
  }

  // Determine severity
  let severity: ErrorSeverity = 'error';
  if (lower.includes('warning') || lower.includes('rate limit') || lower.includes('retry')) {
    severity = 'warning';
  } else if (lower.includes('info') || lower.includes('notice')) {
    severity = 'info';
  }

  // Generate title
  let title = 'Execution failed';
  if (context?.nodeName) {
    title = `${context.nodeName} failed`;
  } else if (lower.includes('authentication') || lower.includes('unauthorized') || lower.includes('invalid api')) {
    title = 'Authentication failed';
  } else if (lower.includes('not found') || lower.includes('missing')) {
    title = 'Resource not found';
  } else if (lower.includes('rate limit') || lower.includes('too many requests')) {
    title = 'Rate limit reached';
  } else if (lower.includes('timeout') || lower.includes('timed out')) {
    title = 'Request timeout';
  } else if (lower.includes('network') || lower.includes('connection')) {
    title = 'Network error';
  }

  // Generate action suggestion
  let action: string | undefined;
  if (lower.includes('authentication') || lower.includes('unauthorized') || lower.includes('invalid api')) {
    action = 'Verify your API credentials and reconnect the integration.';
  } else if (lower.includes('not found') || lower.includes('missing')) {
    action = 'Verify the resource exists and you have access permissions.';
  } else if (lower.includes('rate limit') || lower.includes('too many requests')) {
    action = 'Wait a few minutes before trying again.';
  } else if (lower.includes('timeout') || lower.includes('timed out')) {
    action = 'The request took too long. Try again or check your network connection.';
  } else if (lower.includes('network') || lower.includes('connection')) {
    action = 'Check your internet connection and try again.';
  }

  return {
    code: generateErrorCode(cleanMessage, context),
    title,
    message: cleanMessage,
    action,
    provider: context?.provider,
    severity,
    raw: rawError,
  };
}

/**
 * Generate a consistent error code from message
 */
function generateErrorCode(message: string, context?: { nodeName?: string; nodeType?: string }): string {
  const parts: string[] = [];
  
  if (context?.nodeType) {
    parts.push(context.nodeType.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
  }
  
  const keyWords = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 3)
    .join('_')
    .toUpperCase();
  
  if (keyWords) {
    parts.push(keyWords);
  }
  
  return parts.length > 0 ? parts.join('_') : 'UNKNOWN_ERROR';
}

