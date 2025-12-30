/**
 * PayPal Integration API Client
 */

import { getUserIntegration, getIntegrationCredential } from './service';

/**
 * Get PayPal access token (OAuth) or API credentials
 */
async function getPayPalToken(userId: string): Promise<string> {
  // Try OAuth token first
  const integration = await getUserIntegration(userId, 'paypal');
  if (integration?.access_token) {
    return integration.access_token;
  }
  
  // Fall back to API credentials (Client ID:Secret base64 encoded)
  const clientId = await getIntegrationCredential(userId, 'paypal', 'client_id');
  const clientSecret = await getIntegrationCredential(userId, 'paypal', 'client_secret');
  
  if (clientId && clientSecret) {
    // For API credentials, we need to get an access token
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch('https://api.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }
  }
  
  throw new Error('PayPal integration not connected. Please connect your PayPal account or add API credentials.');
}

/**
 * Get PayPal payment details
 */
export async function getPayPalPayment(
  userId: string,
  paymentId: string
): Promise<{
  id: string;
  status: string;
  amount: { value: string; currency: string };
  payer: any;
}> {
  const token = await getPayPalToken(userId);
  
  const response = await fetch(`https://api.paypal.com/v1/payments/payment/${paymentId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal API error: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    status: data.state,
    amount: data.transactions?.[0]?.amount || {},
    payer: data.payer
  };
}

/**
 * Create a PayPal payment
 */
export async function createPayPalPayment(
  userId: string,
  params: {
    amount: number;
    currency: string;
    description?: string;
    returnUrl: string;
    cancelUrl: string;
  }
): Promise<{
  id: string;
  links: Array<{ href: string; rel: string; method: string }>;
}> {
  const token = await getPayPalToken(userId);
  
  const response = await fetch('https://api.paypal.com/v1/payments/payment', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      transactions: [{
        amount: {
          total: params.amount.toFixed(2),
          currency: params.currency
        },
        description: params.description
      }],
      redirect_urls: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal API error: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    links: data.links || []
  };
}

