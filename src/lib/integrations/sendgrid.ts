/**
 * SendGrid Integration API Client
 */

import { getIntegrationCredential } from './service';

/**
 * Get authenticated SendGrid API key
 */
async function getSendGridApiKey(userId: string): Promise<string> {
  const credential = await getIntegrationCredential(userId, 'sendgrid', 'api_key');
  
  if (!credential) {
    throw new Error('SendGrid integration not connected. Please add your API key in the integration settings.');
  }
  
  return credential;
}

/**
 * Parse an RFC 5322 address string into { email, name? }.
 * Handles both bare "email@example.com" and "Name <email@example.com>" formats.
 */
function parseAddress(input: string): { email: string; name?: string } {
  if (!input) return { email: '' };
  const match = input.trim().match(/^"?([^"<]+?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return { email: match[2].trim(), name: match[1].trim() || undefined };
  }
  return { email: input.trim() };
}

/**
 * Send email via SendGrid
 */
export async function sendEmail(
  userId: string,
  params: {
    to: string;
    from: string;
    subject: string;
    text?: string;
    html?: string;
    cc?: string;
    bcc?: string;
  }
): Promise<{ messageId: string; status: string }> {
  const apiKey = await getSendGridApiKey(userId);
  
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{
        to: [parseAddress(params.to)],
        ...(params.cc && { cc: [parseAddress(params.cc)] }),
        ...(params.bcc && { bcc: [parseAddress(params.bcc)] }),
        subject: params.subject
      }],
      from: parseAddress(params.from),
      content: [
        ...(params.text ? [{ type: 'text/plain', value: params.text }] : []),
        ...(params.html ? [{ type: 'text/html', value: params.html }] : [])
      ]
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid API error: ${error}`);
  }
  
  const messageId = response.headers.get('x-message-id') || 'unknown';
  
  return {
    messageId,
    status: 'sent'
  };
}

