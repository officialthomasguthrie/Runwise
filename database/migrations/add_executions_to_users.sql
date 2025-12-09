-- Migration: Add execution tracking columns to users table
-- Run this migration to add execution tracking to the users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS executions_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_executions INTEGER DEFAULT 0;

-- Initialize existing users' execution counts from usage_counters
-- This syncs the current month's executions
UPDATE public.users u
SET executions_used_this_month = COALESCE((
  SELECT uc.value
  FROM usage_counters uc
  JOIN billing_periods bp ON uc.period_id = bp.id
  WHERE uc.user_id = u.id
    AND uc.metric = 'executions'
    AND bp.status = 'active'
    AND NOW() BETWEEN bp.period_start AND bp.period_end
  LIMIT 1
), 0);

-- Initialize total_executions from workflow_executions count
UPDATE public.users u
SET total_executions = COALESCE((
  SELECT COUNT(*)
  FROM workflow_executions we
  WHERE we.user_id = u.id
), 0);

-- Create indexes for execution queries
CREATE INDEX IF NOT EXISTS idx_users_executions_used_this_month ON public.users(executions_used_this_month);
CREATE INDEX IF NOT EXISTS idx_users_total_executions ON public.users(total_executions);

-- Create function to update user execution counts
CREATE OR REPLACE FUNCTION update_user_execution_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update executions_used_this_month for the current billing period
  UPDATE public.users
  SET 
    executions_used_this_month = (
      SELECT COALESCE(uc.value, 0)
      FROM usage_counters uc
      JOIN billing_periods bp ON uc.period_id = bp.id
      WHERE uc.user_id = NEW.user_id
        AND uc.metric = 'executions'
        AND bp.status = 'active'
        AND NOW() BETWEEN bp.period_start AND bp.period_end
      LIMIT 1
    ),
    total_executions = (
      SELECT COUNT(*)
      FROM workflow_executions we
      WHERE we.user_id = NEW.user_id
    ),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update user execution counts when usage_counters change
DROP TRIGGER IF EXISTS trigger_update_user_execution_counts ON usage_counters;
CREATE TRIGGER trigger_update_user_execution_counts
  AFTER INSERT OR UPDATE ON usage_counters
  FOR EACH ROW
  WHEN (NEW.metric = 'executions')
  EXECUTE FUNCTION update_user_execution_counts();

-- Create trigger to update total_executions when workflow_executions are inserted
DROP TRIGGER IF EXISTS trigger_update_total_executions ON workflow_executions;
CREATE TRIGGER trigger_update_total_executions
  AFTER INSERT ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_execution_counts();


