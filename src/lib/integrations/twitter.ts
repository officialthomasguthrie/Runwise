/**
 * Twitter/X Integration API Client
 * Supports both OAuth 2.0 (preferred) and legacy Bearer Token credential.
 */

import { getUserIntegration, getIntegrationCredential } from './service';

/**
 * Get Twitter/X access token for API calls.
 * Prefers OAuth 2.0 access_token; falls back to legacy bearer_token credential.
 */
export async function getTwitterAccessToken(userId: string): Promise<string> {
  // 1. Try OAuth integration (user connected via OAuth flow)
  const oauth = await getUserIntegration(userId, 'twitter');
  if (oauth?.access_token) {
    return oauth.access_token;
  }

  // 2. Fall back to legacy Bearer Token credential
  const bearerToken = await getIntegrationCredential(userId, 'twitter', 'bearer_token');
  if (bearerToken) {
    return bearerToken;
  }

  throw new Error('Twitter/X is not connected. Please connect your account in Settings → Integrations.');
}

/**
 * Post a tweet
 */
export async function postTweet(
  userId: string,
  params: {
    text: string;
    replyTo?: string;
  }
): Promise<{ id: string; text: string; created_at: string }> {
  const token = await getTwitterAccessToken(userId);
  
  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: params.text,
      ...(params.replyTo && { reply: { in_reply_to_tweet_id: params.replyTo } })
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Twitter API error: ${error.detail || JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.data.id,
    text: data.data.text,
    created_at: data.data.created_at || new Date().toISOString()
  };
}

/**
 * Get user's Twitter profile
 */
export async function getTwitterProfile(userId: string): Promise<{
  id: string;
  name: string;
  username: string;
}> {
  const token = await getTwitterAccessToken(userId);
  
  const response = await fetch('https://api.twitter.com/2/users/me?user.fields=name,username', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Twitter API error: ${error.detail || JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.data.id,
    name: data.data.name,
    username: data.data.username
  };
}

/**
 * Search recent tweets (requires Elevated or Basic API access)
 */
export async function searchTweets(
  userId: string,
  params: {
    query: string;
    maxResults?: number;
    startTime?: string;
    endTime?: string;
  }
): Promise<{ tweets: Array<{ id: string; text: string; created_at?: string; author_id?: string }>; count: number }> {
  const token = await getTwitterAccessToken(userId);
  const maxResults = Math.min(params.maxResults ?? 10, 100);

  const searchParams = new URLSearchParams({
    query: params.query,
    max_results: String(maxResults),
    'tweet.fields': 'created_at,author_id',
    'user.fields': 'username,name'
  });
  if (params.startTime) searchParams.set('start_time', params.startTime);
  if (params.endTime) searchParams.set('end_time', params.endTime);

  const response = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?${searchParams}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Twitter API error: ${err.detail || JSON.stringify(err) || response.statusText}`);
  }

  const data = await response.json();
  const tweets = (data.data || []).map((t: any) => ({
    id: t.id,
    text: t.text,
    created_at: t.created_at,
    author_id: t.author_id
  }));

  return { tweets, count: tweets.length };
}

