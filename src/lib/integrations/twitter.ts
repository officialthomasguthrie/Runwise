/**
 * Twitter/X Integration API Client
 */

import { getUserIntegration } from './service';

/**
 * Get Twitter/X access token
 */
async function getTwitterToken(userId: string): Promise<string> {
  const integration = await getUserIntegration(userId, 'twitter');
  
  if (!integration?.access_token) {
    throw new Error('Twitter/X integration not connected. Please connect your Twitter account.');
  }
  
  return integration.access_token;
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
  const token = await getTwitterToken(userId);
  
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
  const token = await getTwitterToken(userId);
  
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

