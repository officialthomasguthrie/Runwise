/**
 * Stripe Integration API Client
 */

import { getIntegrationCredential } from './service';

export interface StripeCustomer {
  id: string;
  email?: string;
  name?: string;
  created: number;
}

export interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer?: string;
  created: number;
}

/**
 * Get Stripe API key
 */
async function getStripeApiKey(userId: string): Promise<string> {
  const apiKey = await getIntegrationCredential(userId, 'stripe', 'secret_key');
  
  if (!apiKey) {
    throw new Error('Stripe integration not connected. Please add your Secret Key in the integration settings.');
  }
  
  return apiKey;
}

/**
 * Create a Stripe customer
 */
export async function createCustomer(
  userId: string,
  params: {
    email?: string;
    name?: string;
    metadata?: Record<string, string>;
  }
): Promise<StripeCustomer> {
  const apiKey = await getStripeApiKey(userId);
  
  const response = await fetch('https://api.stripe.com/v1/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      ...(params.email && { email: params.email }),
      ...(params.name && { name: params.name }),
      ...(params.metadata && Object.entries(params.metadata).map(([k, v]) => [`metadata[${k}]`, v]))
    }).toString()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe API error: ${error.error?.message || JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    created: data.created
  };
}

/**
 * Create a Stripe charge
 */
export async function createCharge(
  userId: string,
  params: {
    amount: number; // in cents
    currency: string;
    customer?: string;
    source?: string; // card token
    description?: string;
    metadata?: Record<string, string>;
  }
): Promise<StripeCharge> {
  const apiKey = await getStripeApiKey(userId);
  
  const formData = new URLSearchParams({
    amount: params.amount.toString(),
    currency: params.currency,
    ...(params.customer && { customer: params.customer }),
    ...(params.source && { source: params.source }),
    ...(params.description && { description: params.description }),
    ...(params.metadata && Object.entries(params.metadata).map(([k, v]) => [`metadata[${k}]`, v]))
  });
  
  const response = await fetch('https://api.stripe.com/v1/charges', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe API error: ${error.error?.message || JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    customer: data.customer,
    created: data.created
  };
}

/**
 * Retrieve a Stripe customer
 */
export async function getCustomer(userId: string, customerId: string): Promise<StripeCustomer> {
  const apiKey = await getStripeApiKey(userId);
  
  const response = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe API error: ${error.error?.message || JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    created: data.created
  };
}

