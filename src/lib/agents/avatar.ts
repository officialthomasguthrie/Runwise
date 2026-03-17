/** Profile images for agents — same set used across list and detail views (must exist in public/) */
const PROFILE_IMAGES = [
  '/Profile2.jpg',
  '/Profile3.jpg',
  '/Profile4.jpg',
] as const;

/**
 * Returns a deterministic profile image path for an agent based on its ID.
 * Use agent.avatar_image when available (persisted at build time); otherwise use this.
 */
export function getAgentAvatarUrl(agentId: string): string {
  const hash = agentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PROFILE_IMAGES[Math.abs(hash) % PROFILE_IMAGES.length];
}
