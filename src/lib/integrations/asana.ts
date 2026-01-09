/**
 * Asana Integration API Client
 * Note: Asana tokens can be refreshed if refresh_token is provided
 */

import { getUserIntegration } from './service';
import { getAsanaOAuthConfig } from './oauth';

export interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  completed: boolean;
  due_on?: string;
  assignee?: {
    gid: string;
    name: string;
  };
  projects?: Array<{
    gid: string;
    name: string;
  }>;
}

export interface AsanaProject {
  gid: string;
  name: string;
  notes?: string;
  color?: string;
  workspace: {
    gid: string;
    name: string;
  };
}

/**
 * Get authenticated Asana access token
 * Handles token refresh if needed
 */
async function getAsanaToken(userId: string): Promise<string> {
  const integration = await getUserIntegration(userId, 'asana');
  
  if (!integration?.access_token) {
    throw new Error('Asana integration not connected. Please connect your Asana account via OAuth.');
  }
  
  // Check if token is expired (if expires_at is provided)
  if (integration.expires_at) {
    const expiresAt = new Date(integration.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // If token expires in less than 5 minutes, refresh it
    if (timeUntilExpiry < 5 * 60 * 1000) {
      if (integration.refresh_token) {
        try {
          await refreshAsanaToken(userId, integration.refresh_token);
          // Get the refreshed token
          const refreshedIntegration = await getUserIntegration(userId, 'asana');
          if (refreshedIntegration?.access_token) {
            return refreshedIntegration.access_token;
          }
        } catch (refreshError) {
          console.error('Error refreshing Asana token:', refreshError);
          throw new Error('Asana token expired and refresh failed. Please reconnect your Asana account.');
        }
      } else {
        throw new Error('Asana token expired and no refresh token available. Please reconnect your Asana account.');
      }
    }
  }
  
  return integration.access_token;
}

/**
 * Refresh Asana access token
 */
async function refreshAsanaToken(userId: string, refreshToken: string): Promise<void> {
  const config = getAsanaOAuthConfig();
  
  const tokenResponse = await fetch('https://app.asana.com/-/oauth_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken
    })
  });
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to refresh Asana token: ${error}`);
  }
  
  const tokens = await tokenResponse.json();
  
  // Update stored integration with new tokens
  const { storeUserIntegration } = await import('./service');
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : undefined;
  
  await storeUserIntegration(
    userId,
    'asana',
    {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken, // Use new refresh token if provided
      expires_at: expiresAt
    },
    {
      token_type: tokens.token_type || 'Bearer',
      data: tokens.data
    }
  );
}

/**
 * Fetch tasks from Asana
 */
export async function getAsanaTasks(
  userId: string,
  projectGid?: string,
  limit: number = 100
): Promise<AsanaTask[]> {
  const token = await getAsanaToken(userId);
  
  let url = `https://app.asana.com/api/1.0/tasks?limit=${limit}&opt_fields=name,notes,completed,due_on,assignee,projects`;
  if (projectGid) {
    url += `&project=${projectGid}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Asana tasks: ${error}`);
  }
  
  const data = await response.json();
  return data.data || [];
}

/**
 * Create a task in Asana
 */
export async function createAsanaTask(
  userId: string,
  task: {
    name: string;
    notes?: string;
    due_on?: string;
    project?: string;
    assignee?: string;
    [key: string]: any;
  }
): Promise<AsanaTask> {
  const token = await getAsanaToken(userId);
  
  const taskData: any = {
    name: task.name
  };
  
  if (task.notes) taskData.notes = task.notes;
  if (task.due_on) taskData.due_on = task.due_on;
  if (task.project) taskData.projects = [task.project];
  if (task.assignee) taskData.assignee = task.assignee;
  
  // Add any additional properties
  Object.keys(task).forEach(key => {
    if (!['name', 'notes', 'due_on', 'project', 'assignee'].includes(key)) {
      taskData[key] = task[key];
    }
  });
  
  const response = await fetch(
    'https://app.asana.com/api/1.0/tasks',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: taskData
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Asana task: ${error}`);
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Fetch projects from Asana
 */
export async function getAsanaProjects(
  userId: string,
  workspaceGid?: string,
  limit: number = 100
): Promise<AsanaProject[]> {
  const token = await getAsanaToken(userId);
  
  let url = `https://app.asana.com/api/1.0/projects?limit=${limit}&opt_fields=name,notes,color,workspace`;
  if (workspaceGid) {
    url += `&workspace=${workspaceGid}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Asana projects: ${error}`);
  }
  
  const data = await response.json();
  return data.data || [];
}

/**
 * Create a project in Asana
 */
export async function createAsanaProject(
  userId: string,
  project: {
    name: string;
    notes?: string;
    workspace: string;
    color?: string;
    [key: string]: any;
  }
): Promise<AsanaProject> {
  const token = await getAsanaToken(userId);
  
  const projectData: any = {
    name: project.name,
    workspace: project.workspace
  };
  
  if (project.notes) projectData.notes = project.notes;
  if (project.color) projectData.color = project.color;
  
  // Add any additional properties
  Object.keys(project).forEach(key => {
    if (!['name', 'notes', 'workspace', 'color'].includes(key)) {
      projectData[key] = project[key];
    }
  });
  
  const response = await fetch(
    'https://app.asana.com/api/1.0/projects',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: projectData
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Asana project: ${error}`);
  }
  
  const data = await response.json();
  return data.data;
}

