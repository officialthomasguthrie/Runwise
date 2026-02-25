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
 * Throws if the resulting email address is clearly invalid.
 */
function parseAddress(input: string, fieldName = 'address'): { email: string; name?: string } {
  if (!input || !input.trim()) {
    throw new Error(`Send Email: "${fieldName}" is empty. Check your workflow configuration — make sure the field is filled in or the template variable resolves to a valid email address.`);
  }
  const trimmed = input.trim();
  const angleMatch = trimmed.match(/^"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (angleMatch) {
    const email = angleMatch[2].trim();
    const name = angleMatch[1].trim() || undefined;
    return { email, name };
  }
  // Basic sanity check: must contain @ and a dot after it
  if (!trimmed.includes('@') || !trimmed.split('@')[1]?.includes('.')) {
    throw new Error(`Send Email: "${fieldName}" resolved to "${trimmed}" which is not a valid email address. If you are using a template like {{inputData.email.from}}, make sure the trigger node ran successfully and the field exists.`);
  }
  return { email: trimmed };
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
        to: [parseAddress(params.to, 'to')],
        ...(params.cc && { cc: [parseAddress(params.cc, 'cc')] }),
        ...(params.bcc && { bcc: [parseAddress(params.bcc, 'bcc')] }),
        subject: params.subject
      }],
      from: parseAddress(params.from, 'from'),
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

