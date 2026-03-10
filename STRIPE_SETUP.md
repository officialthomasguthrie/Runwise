# Stripe Agent Tools Setup

Stripe is fully integrated as an agent tool. Uses Secret Key (credential-based connection).

## 1. Connect Stripe

Users connect via **Integrations** → **Stripe** by entering their Stripe Secret Key.

- Get your key from [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
- Use `sk_test_...` for test mode or `sk_live_...` for production
- No app-level environment variables required — each user provides their own key

## 2. Agent Tools Implemented

| Tool | Description |
|------|-------------|
| `list_stripe_customers` | List customers. Params: limit (optional), email (optional filter). |
| `get_stripe_customer` | Get a single customer by ID. Params: customerId. |
| `create_stripe_invoice` | Create a draft invoice for a customer. Params: customerId, amount (cents), currency, description (optional), autoAdvance (optional, finalizes if true). |
| `get_stripe_subscription` | Get a subscription by ID. Params: subscriptionId. |
| `list_stripe_subscriptions` | List subscriptions for a customer. Params: customerId, status (active/past_due/canceled/all), limit (optional). |

## 3. Keyword Detection

The agent builder detects "stripe", "invoice", "subscription", "billing" and prompts users to connect Stripe when building agents that use it.
