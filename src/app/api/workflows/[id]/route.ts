/**
 * API Route: /api/workflows/[id]
 * Handles GET (single workflow), PUT (update), and DELETE operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { validateWorkflowData } from '@/lib/workflows/utils';
import type { UpdateWorkflowInput } from '@/lib/workflows/types';
import { getPlanLimits } from '@/lib/plans/config';

// GET /api/workflows/[id] - Get a single workflow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch workflow
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Workflow not found' },
          { status: 404 }
        );
      }
      
      console.error('Error fetching workflow:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflow', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Error in GET /api/workflows/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/workflows/[id] - Update a workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body: UpdateWorkflowInput = await request.json();
    
    // Validate workflow_data if provided
    if (body.workflow_data && !validateWorkflowData(body.workflow_data)) {
      return NextResponse.json(
        { error: 'Invalid workflow_data structure' },
        { status: 400 }
      );
    }
    
    // Check if workflow exists and belongs to user
    const { data: existingWorkflow, error: fetchError } = await supabase
      .from('workflows')
      .select('id, version')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    const workflowRecord = existingWorkflow as any;
    
    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.workflow_data !== undefined) updateData.workflow_data = body.workflow_data;
    if (body.ai_prompt !== undefined) updateData.ai_prompt = body.ai_prompt;
    if (body.status !== undefined) updateData.status = body.status;
    
    // If activating, enforce active workflow cap based on plan
    if (body.status === 'active') {
      // Fetch user's plan
      const { data: userRow } = await supabase
        .from('users')
        .select('plan_id')
        .eq('id', user.id)
        .single();
      const planId = (userRow as any)?.plan_id ?? 'personal';
      const limits = getPlanLimits(planId);
      
      if (limits.maxActiveWorkflows != null) {
        const { data: countRows, error: countErr } = await supabase
          .from('workflows')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active');
        if (countErr) {
          return NextResponse.json(
            { error: 'Failed to validate active workflows limit', details: countErr.message },
            { status: 500 }
          );
        }
        const activeCount = (countRows as any)?.length ?? (countRows as any)?.count ?? 0;
        if (activeCount >= limits.maxActiveWorkflows) {
          return NextResponse.json(
            { error: `Plan limit reached: Up to ${limits.maxActiveWorkflows} active workflows on your plan.` },
            { status: 403 }
          );
        }
      }
    }
    
    // Increment version if workflow_data is updated
    if (body.workflow_data) {
      updateData.version = (workflowRecord.version || 1) + 1;
    }
    
    // Update workflow
    const { data: workflow, error } = await (supabase as any)
      .from('workflows')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating workflow:', error);
      return NextResponse.json(
        { error: 'Failed to update workflow', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Error in PUT /api/workflows/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/[id] - Delete a workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if workflow exists and belongs to user
    const { data: existingWorkflow, error: fetchError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    // Delete workflow (cascade will handle related records)
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting workflow:', error);
      return NextResponse.json(
        { error: 'Failed to delete workflow', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'Workflow deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in DELETE /api/workflows/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

