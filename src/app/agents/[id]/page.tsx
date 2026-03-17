import { redirect } from "next/navigation";

/**
 * Opening an agent from /agents now uses the new builder UI at /agents/new.
 * Redirect so we always show the same UI (Builder + Agent tabs) for both new and existing agents.
 */
export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/agents/new?agentId=${id}`);
}
