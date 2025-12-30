/**
 * Twilio Integration API Client
 */

import { getIntegrationCredential } from './service';

export interface TwilioMessage {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  dateCreated: string;
}

/**
 * Get Twilio credentials
 */
async function getTwilioCredentials(userId: string): Promise<{ accountSid: string; authToken: string }> {
  const accountSid = await getIntegrationCredential(userId, 'twilio', 'account_sid');
  const authToken = await getIntegrationCredential(userId, 'twilio', 'auth_token');
  
  if (!accountSid || !authToken) {
    throw new Error('Twilio integration not connected. Please add your Account SID and Auth Token in the integration settings.');
  }
  
  return { accountSid, authToken };
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(
  userId: string,
  params: {
    to: string;
    from: string;
    body: string;
  }
): Promise<TwilioMessage> {
  const { accountSid, authToken } = await getTwilioCredentials(userId);
  
  // Twilio uses Basic Auth with Account SID as username and Auth Token as password
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  
  const formData = new URLSearchParams();
  formData.append('To', params.to);
  formData.append('From', params.from);
  formData.append('Body', params.body);
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    sid: data.sid,
    status: data.status,
    to: data.to,
    from: data.from,
    body: data.body,
    dateCreated: data.date_created
  };
}

/**
 * Make a phone call via Twilio
 */
export async function makeCall(
  userId: string,
  params: {
    to: string;
    from: string;
    url: string; // TwiML URL or TwiML content
  }
): Promise<{ callSid: string; status: string }> {
  const { accountSid, authToken } = await getTwilioCredentials(userId);
  
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  
  const formData = new URLSearchParams();
  formData.append('To', params.to);
  formData.append('From', params.from);
  formData.append('Url', params.url);
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    callSid: data.sid,
    status: data.status
  };
}

