import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Gmail API configuration
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Gmail API instance
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

/**
 * Send a reply email via Gmail API
 */
export async function sendGmailReply(emailData: any, reply: string) {
  try {
    // Create the email message
    const message = [
      `To: ${emailData.sender}`,
      `From: ${process.env.GMAIL_ADDRESS}`,
      `Subject: Re: ${emailData.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      `<html><body><p>${reply.replace(/\n/g, '<br>')}</p></body></html>`
    ].join('\n');

    // Encode the message for Gmail API
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send the email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log('Email sent successfully:', result.data);
    return result.data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Get Gmail OAuth2 authorization URL
 */
export function getGmailAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

/**
 * Set OAuth2 credentials
 */
export function setGmailCredentials(tokens: any) {
  oauth2Client.setCredentials(tokens);
}

/**
 * Check if Gmail is authenticated
 */
export function isGmailAuthenticated() {
  return oauth2Client.credentials.access_token !== undefined;
}
