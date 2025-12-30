/**
 * GitHub Integration API Client
 */

import { getUserIntegration, getIntegrationCredential } from './service';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  private: boolean;
  html_url: string;
}

/**
 * Get authenticated GitHub access token
 */
async function getGitHubToken(userId: string): Promise<string> {
  // Try OAuth token first
  const integration = await getUserIntegration(userId, 'github');
  
  if (integration && integration.access_token) {
    return integration.access_token;
  }
  
  // Fallback to stored API credential (Personal Access Token)
  const pat = await getIntegrationCredential(userId, 'github', 'personal_access_token');
  if (pat) {
    return pat;
  }
  
  throw new Error('GitHub integration not connected');
}

/**
 * Fetch user's GitHub repositories
 */
export async function getGitHubRepositories(userId: string): Promise<GitHubRepository[]> {
  const accessToken = await getGitHubToken(userId);
  
  const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Runwise'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch repositories: ${error}`);
  }
  
  const repos = await response.json();
  return repos.map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: {
      login: repo.owner.login
    },
    private: repo.private,
    html_url: repo.html_url
  }));
}


