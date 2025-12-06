// src/app/dashboard/page.tsx
import AgentInterface from './components/agent-interface';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Agent-Centric Super Admin Interface (Chat-based)
  return <AgentInterface />;
}
