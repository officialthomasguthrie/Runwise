/**
 * Jira Integration API Client (3LO - 3-Legged OAuth)
 * Note: Jira tokens expire and need to be refreshed
 */

import { getUserIntegration } from './service';
import { getJiraOAuthConfig } from './oauth';

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    project: {
      key: string;
      name: string;
    };
    issuetype: {
      name: string;
    };
    [key: string]: any;
  };
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

/**
 * Get authenticated Jira access token
 * Handles token refresh if needed
 */
async function getJiraToken(userId: string): Promise<string> {
  const integration = await getUserIntegration(userId, 'jira');
  
  if (!integration?.access_token) {
    throw new Error('Jira integration not connected. Please connect your Jira account via OAuth.');
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
          await refreshJiraToken(userId, integration.refresh_token, integration.metadata?.audience);
          // Get the refreshed token
          const refreshedIntegration = await getUserIntegration(userId, 'jira');
          if (refreshedIntegration?.access_token) {
            return refreshedIntegration.access_token;
          }
        } catch (refreshError) {
          console.error('Error refreshing Jira token:', refreshError);
          throw new Error('Jira token expired and refresh failed. Please reconnect your Jira account.');
        }
      } else {
        throw new Error('Jira token expired and no refresh token available. Please reconnect your Jira account.');
      }
    }
  }
  
  return integration.access_token;
}

/**
 * Refresh Jira access token
 */
async function refreshJiraToken(userId: string, refreshToken: string, audience?: string): Promise<void> {
  const config = getJiraOAuthConfig();
  
  const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken
    })
  });
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to refresh Jira token: ${error}`);
  }
  
  const tokens = await tokenResponse.json();
  
  // Update stored integration with new tokens
  const { storeUserIntegration } = await import('./service');
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : undefined;
  
  await storeUserIntegration(
    userId,
    'jira',
    {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken, // Use new refresh token if provided
      expires_at: expiresAt
    },
    {
      scope: tokens.scope,
      token_type: tokens.token_type || 'Bearer',
      audience: audience || 'api.atlassian.com'
    }
  );
}

/**
 * Get Jira cloud ID (required for API calls)
 * This is obtained from the access token
 */
async function getJiraCloudId(userId: string): Promise<string> {
  const token = await getJiraToken(userId);
  
  const response = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Jira cloud ID: ${error}`);
  }
  
  const resources = await response.json();
  if (!resources || resources.length === 0) {
    throw new Error('No accessible Jira resources found. Please ensure your Jira account is connected.');
  }
  
  // Return the first resource's cloud ID (usually there's only one)
  return resources[0].id;
}

/**
 * Fetch issues from Jira
 */
export async function getJiraIssues(
  userId: string,
  jql?: string,
  limit: number = 50
): Promise<JiraIssue[]> {
  const token = await getJiraToken(userId);
  const cloudId = await getJiraCloudId(userId);
  
  let url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search?maxResults=${limit}`;
  if (jql) {
    url += `&jql=${encodeURIComponent(jql)}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Jira issues: ${error}`);
  }
  
  const data = await response.json();
  return data.issues || [];
}

/**
 * Create an issue in Jira
 */
export async function createJiraIssue(
  userId: string,
  issue: {
    project: {
      key: string;
    };
    summary: string;
    description?: string;
    issuetype: {
      name: string;
    };
    [key: string]: any;
  }
): Promise<JiraIssue> {
  const token = await getJiraToken(userId);
  const cloudId = await getJiraCloudId(userId);
  
  const issueData: any = {
    fields: {
      project: issue.project,
      summary: issue.summary,
      issuetype: issue.issuetype
    }
  };
  
  if (issue.description) {
    issueData.fields.description = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: issue.description
            }
          ]
        }
      ]
    };
  }
  
  // Add any additional fields
  Object.keys(issue).forEach(key => {
    if (!['project', 'summary', 'description', 'issuetype'].includes(key)) {
      issueData.fields[key] = issue[key];
    }
  });
  
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(issueData)
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Jira issue: ${error}`);
  }
  
  const data = await response.json();
  
  // Fetch the created issue to return full details
  return getJiraIssues(userId, `key=${data.key}`, 1).then(issues => issues[0]);
}

/**
 * Fetch projects from Jira
 */
export async function getJiraProjects(
  userId: string,
  limit: number = 50
): Promise<JiraProject[]> {
  const token = await getJiraToken(userId);
  const cloudId = await getJiraCloudId(userId);
  
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project?maxResults=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Jira projects: ${error}`);
  }
  
  const data = await response.json();
  return data || [];
}

