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
  
  const bodyParams: Record<string, string> = {};
  if (params.email) bodyParams.email = params.email;
  if (params.name) bodyParams.name = params.name;
  if (params.metadata) {
    Object.entries(params.metadata).forEach(([k, v]) => {
      bodyParams[`metadata[${k}]`] = String(v);
    });
  }
  
  const response = await fetch('https://api.stripe.com/v1/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(bodyParams).toString()
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
  
  const bodyParams: Record<string, string> = {
    amount: params.amount.toString(),
    currency: params.currency
  };
  if (params.customer) bodyParams.customer = params.customer;
  if (params.source) bodyParams.source = params.source;
  if (params.description) bodyParams.description = params.description;
  if (params.metadata) {
    Object.entries(params.metadata).forEach(([k, v]) => {
      bodyParams[`metadata[${k}]`] = v;
    });
  }
  
  const formData = new URLSearchParams(bodyParams);
  
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

