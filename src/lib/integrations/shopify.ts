/**
 * Shopify Integration API Client
 */

import { getUserIntegration } from './service';

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    sku?: string;
  }>;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  email?: string;
  total_price: string;
  financial_status: string;
  fulfillment_status?: string;
  created_at: string;
}

/**
 * Get authenticated Shopify access token
 * Supports multiple shops (shopify-{shop})
 */
async function getShopifyToken(userId: string, shop?: string): Promise<{ token: string; shop: string }> {
  // If shop is provided, try to get that specific shop's token
  if (shop) {
    const shopDomain = shop.replace('.myshopify.com', '').trim();
    const serviceName = `shopify-${shopDomain}`;
    const integration = await getUserIntegration(userId, serviceName);
    
    if (integration?.access_token) {
      return {
        token: integration.access_token,
        shop: shopDomain
      };
    }
  }
  
  // Otherwise, get the first available Shopify integration
  // This requires checking all user integrations
  // For now, we'll require shop parameter
  if (!shop) {
    throw new Error('Shop parameter is required. Please specify your Shopify shop domain.');
  }
  
  const shopDomain = shop.replace('.myshopify.com', '').trim();
  const serviceName = `shopify-${shopDomain}`;
  const integration = await getUserIntegration(userId, serviceName);
  
  if (!integration?.access_token) {
    throw new Error(`Shopify integration not connected for shop: ${shopDomain}. Please connect your Shopify store via OAuth.`);
  }
  
  return {
    token: integration.access_token,
    shop: shopDomain
  };
}

/**
 * Fetch products from Shopify store
 */
export async function getShopifyProducts(
  userId: string,
  shop: string,
  limit: number = 50
): Promise<ShopifyProduct[]> {
  const { token, shop: shopDomain } = await getShopifyToken(userId, shop);
  
  const response = await fetch(
    `https://${shopDomain}.myshopify.com/admin/api/2024-01/products.json?limit=${limit}`,
    {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch products: ${error}`);
  }
  
  const data = await response.json();
  
  return (data.products || []).map((product: any) => ({
    id: String(product.id),
    title: product.title,
    handle: product.handle,
    status: product.status,
    variants: (product.variants || []).map((variant: any) => ({
      id: String(variant.id),
      title: variant.title,
      price: variant.price,
      sku: variant.sku
    }))
  }));
}

/**
 * Fetch orders from Shopify store
 */
export async function getShopifyOrders(
  userId: string,
  shop: string,
  limit: number = 50
): Promise<ShopifyOrder[]> {
  const { token, shop: shopDomain } = await getShopifyToken(userId, shop);
  
  const response = await fetch(
    `https://${shopDomain}.myshopify.com/admin/api/2024-01/orders.json?limit=${limit}&status=any`,
    {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch orders: ${error}`);
  }
  
  const data = await response.json();
  
  return (data.orders || []).map((order: any) => ({
    id: String(order.id),
    name: order.name,
    email: order.email,
    total_price: order.total_price,
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status,
    created_at: order.created_at
  }));
}

/**
 * Create a product in Shopify store
 */
export async function createShopifyProduct(
  userId: string,
  shop: string,
  product: {
    title: string;
    body_html?: string;
    vendor?: string;
    product_type?: string;
    tags?: string[];
    variants?: Array<{
      price: string;
      sku?: string;
      inventory_quantity?: number;
    }>;
  }
): Promise<ShopifyProduct> {
  const { token, shop: shopDomain } = await getShopifyToken(userId, shop);
  
  const response = await fetch(
    `https://${shopDomain}.myshopify.com/admin/api/2024-01/products.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product: {
          title: product.title,
          body_html: product.body_html,
          vendor: product.vendor,
          product_type: product.product_type,
          tags: product.tags?.join(', '),
          variants: product.variants?.map(v => ({
            price: v.price,
            sku: v.sku,
            inventory_quantity: v.inventory_quantity
          }))
        }
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create product: ${error}`);
  }
  
  const data = await response.json();
  const createdProduct = data.product;
  
  return {
    id: String(createdProduct.id),
    title: createdProduct.title,
    handle: createdProduct.handle,
    status: createdProduct.status,
    variants: (createdProduct.variants || []).map((variant: any) => ({
      id: String(variant.id),
      title: variant.title,
      price: variant.price,
      sku: variant.sku
    }))
  };
}

