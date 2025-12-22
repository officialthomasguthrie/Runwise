/**
 * API Route: /api/workflows
 * Handles GET (list) and POST (create) operations for workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { validateWorkflowData } from '@/lib/workflows/utils';
import type { CreateWorkflowInput } from '@/lib/workflows/types';
import { assertStepsLimit } from '@/lib/usage';
import { getPlanLimits, subscriptionTierToPlanId } from '@/lib/plans/config';

// GET /api/workflows - List all workflows for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query
    let query = supabase
      .from('workflows')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: workflows, error } = await query;
    
    if (error) {
      console.error('Error fetching workflows:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflows', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      workflows: workflows || [],
      count: workflows?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in GET /api/workflows:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body: CreateWorkflowInput = await request.json();
    
    // Validate required fields
    if (!body.name || !body.workflow_data) {
      return NextResponse.json(
        { error: 'Missing required fields: name and workflow_data are required' },
        { status: 400 }
      );
    }
    
    // Validate workflow_data structure
    if (!validateWorkflowData(body.workflow_data)) {
      return NextResponse.json(
        { error: 'Invalid workflow_data structure' },
        { status: 400 }
      );
    }
    
    // Check step limit based on user's plan
    const adminSupabase = createAdminClient();
    const { data: userRow } = await (adminSupabase as any)
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const subscriptionTier = (userRow as any)?.subscription_tier || 'free';
    const planId = subscriptionTierToPlanId(subscriptionTier);
    
    // Count nodes in workflow (excluding placeholder nodes)
    const nodes = body.workflow_data?.nodes || [];
    const nodeCount = nodes.filter((node: any) => 
      node.type !== 'placeholder' && node.data?.nodeId !== 'placeholder'
    ).length;
    
    try {
      assertStepsLimit(planId, nodeCount);
    } catch (limitError: any) {
      return NextResponse.json(
        { error: limitError.message },
        { status: 403 }
      );
    }
    
    // Create workflow - always set status to 'draft' for newly created workflows
    const { data: workflow, error } = await (supabase as any)
      .from('workflows')
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
        workflow_data: body.workflow_data,
        ai_prompt: body.ai_prompt || null,
        ai_generated: body.ai_generated || false,
        status: 'draft', // Always set to 'draft' for newly created workflows
        version: 1,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating workflow:', error);
      return NextResponse.json(
        { error: 'Failed to create workflow', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { workflow },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/workflows:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

