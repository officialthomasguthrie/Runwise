# Trial Eligibility Setup Guide

This guide explains how to set up the trial eligibility system that prevents users from using multiple free trials.

## Overview

The trial eligibility system tracks:
1. **User Accounts** - Prevents users from using multiple trials on the same account
2. **Email Addresses** - Prevents the same email from being used for multiple trials
3. **Credit Cards** - Prevents the same credit card from being used for multiple trials (via Stripe payment method fingerprint)
4. **Stripe Customers** - Prevents the same Stripe customer from using multiple trials

## What Was Implemented

### 1. Database Table
- Created `trial_usage` table to track all trial usage
- Stores: user_id, stripe_customer_id, payment_method_fingerprint, trial dates, subscription_id

### 2. API Changes
- **`/api/stripe/create-checkout-session`** - Now checks trial eligibility before applying a trial
- **`/api/stripe/webhook`** - Tracks trial usage when subscriptions are created/updated

### 3. Database Types
- Updated TypeScript types to include the `trial_usage` table

## Configuration Required

### Step 1: Run Database Migration

**CRITICAL**: You must run the database migration to create the `trial_usage` table.

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `database/migrations/create_trial_usage_table.sql`
5. Click **Run** (or press Ctrl+Enter)

The migration will:
- Create the `trial_usage` table
- Create indexes for fast lookups
- Add helpful comments to the table and columns

**Verify the table was created:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'trial_usage';
```

### Step 2: Verify Stripe Webhook Configuration

The system requires Stripe webhooks to track trial usage. Verify your webhook is configured:

1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Select your webhook endpoint (should be `https://yourdomain.com/api/stripe/webhook`)
3. Ensure these events are enabled:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `payment_method.attached`
   - ✅ `checkout.session.completed` (should already be enabled)

**How to add missing events:**
1. Click on your webhook in the Stripe Dashboard
2. Click **+ Add events**
3. Search for and select:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `payment_method.attached`
4. Click **Add events**
5. The webhook will automatically receive these events going forward

### Step 3: Verify Environment Variables

Make sure these environment variables are set in your `.env.local`:

```env
# Stripe Configuration (Required)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (Required)
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_PERSONAL=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_PERSONAL_YEARLY=price_...

# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Step 4: Test the System

#### Test 1: New User Trial
1. Create a new account or use an account that has never had a trial
2. Click "Start Free Trial" on the Professional plan
3. Complete checkout with Stripe test card: `4242 4242 4242 4242`
4. **Expected**: Trial should be applied (7 days free)

#### Test 2: Existing User Trial Block
1. Use the same account from Test 1
2. Try to start another free trial
3. **Expected**: Should receive error: "You have already used a free trial on this account"

#### Test 3: Same Email Trial Block
1. Use a different account but same email (or create a new account with the email used in Test 1)
2. Try to start a free trial
3. **Expected**: Should receive error: "This email has already been used for a free trial"

#### Test 4: Same Credit Card Trial Block
1. Use a different account and email, but same credit card (4242 4242 4242 4242)
2. Try to start a free trial
3. **Expected**: Should receive error (though this check happens via Stripe customer history)

## How It Works

### When User Clicks "Start Free Trial"

1. **Check User Account** (`checkTrialEligibility` function):
   - Queries `trial_usage` table for existing trial by `user_id`
   - Checks Stripe customer subscription history
   - Checks Stripe customer metadata

2. **Check Email Address**:
   - Searches Stripe for customers with the same email
   - Checks each customer's subscription history
   - Checks `trial_usage` table for matching customers

3. **If Eligible**:
   - Creates Stripe checkout session with `trial_period_days: 7`
   - User completes checkout

4. **If NOT Eligible**:
   - Returns error message explaining why
   - Prevents checkout from proceeding

### When Trial Starts (Webhook)

1. **Stripe Webhook** receives `customer.subscription.created` or `customer.subscription.updated`
2. **Check if Trial Exists**: Verifies subscription has `trial_start` and `trial_end`
3. **Record Trial Usage**:
   - Gets payment method fingerprint (unique card identifier)
   - Records in `trial_usage` table:
     - user_id (if available)
     - stripe_customer_id
     - payment_method_fingerprint
     - payment_method_last4
     - trial_started_at
     - trial_ended_at
     - subscription_id
     - plan
4. **Update Stripe Customer Metadata**:
   - Sets `used_trial: 'true'`
   - Sets `trial_used_at: timestamp`
   - Sets `trial_subscription_id: subscription_id`

### When Payment Method is Attached

1. **Stripe Webhook** receives `payment_method.attached`
2. **Check Fingerprint**: Looks up payment method fingerprint in `trial_usage` table
3. **If Found**: Updates Stripe customer metadata to indicate card was used for trial

## Troubleshooting

### Issue: "You are not eligible for a free trial" error appears incorrectly

**Solution**: Check the `trial_usage` table:
```sql
SELECT * FROM trial_usage WHERE user_id = 'user-id-here';
```

If you find incorrect records, you can delete them:
```sql
DELETE FROM trial_usage WHERE user_id = 'user-id-here';
```

### Issue: Webhooks not being received

**Solution**:
1. Check Stripe Dashboard → Webhooks → Your endpoint → Recent events
2. Verify webhook secret matches `STRIPE_WEBHOOK_SECRET`
3. Check your server logs for webhook errors
4. Test webhook endpoint manually using Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

### Issue: Trial not being tracked

**Solution**:
1. Check if `trial_usage` table exists: `SELECT * FROM trial_usage LIMIT 1;`
2. Verify webhook events are enabled in Stripe
3. Check server logs for errors in webhook handler
4. Verify subscription has `trial_start` and `trial_end` in Stripe

## Maintenance

### View All Trial Usage
```sql
SELECT 
  tu.id,
  u.email,
  tu.stripe_customer_id,
  tu.payment_method_last4,
  tu.plan,
  tu.trial_started_at,
  tu.trial_ended_at
FROM trial_usage tu
LEFT JOIN users u ON tu.user_id = u.id
ORDER BY tu.trial_started_at DESC;
```

### Find Users Who Used Trial
```sql
SELECT DISTINCT user_id, COUNT(*) as trial_count
FROM trial_usage
WHERE user_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(*) > 0;
```

### Clean Up Old Trial Records (Optional)
If you want to clean up very old trial records (older than 1 year):
```sql
DELETE FROM trial_usage 
WHERE trial_started_at < NOW() - INTERVAL '1 year';
```

## Important Notes

1. **Historical Data**: This system only tracks trials that occur AFTER the migration is run. Existing trials before the migration will not be blocked.

2. **Payment Method Fingerprints**: Stripe assigns a unique fingerprint to each card. This allows us to detect if the same physical card is used for multiple trials, even if the user changes accounts.

3. **Email Matching**: The system checks for customers with the same email address. This prevents users from creating multiple accounts with different emails but the same payment method.

4. **Stripe Metadata**: Customer metadata is updated to mark them as having used a trial. This provides a fast lookup without querying the database.

5. **Error Handling**: The system gracefully handles errors. If a database query fails, it logs the error but doesn't block the checkout (to avoid false positives). However, Stripe checks are still performed.

## Support

If you encounter any issues:
1. Check the server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure the database migration has been run
4. Verify Stripe webhook events are properly configured

