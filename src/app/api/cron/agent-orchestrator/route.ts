import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { SlackService } from '@/server/services/communications/slack';
import { logger } from '@/lib/logger';
import type { AgentLock, AgentStatus } from '@/server/services/agent-coordination';

// Runs every 5 min via Cloud Scheduler — sweeps expired locks, detects conflicts,
// routes completions to unblocked agents, posts summary to #agent-coordination.
export async function GET() {
  return run();
}
export async function POST() {
  return run();
}

const COORD_CHANNEL = '#agent-coordination';
const AGENT_EMOJI: Record<string, string> = {
  claude: '🤖', codex: '💡', gemini: '✨', linus: '🖥️',
};

async function run() {
  const db = getAdminFirestore();
  const slack = new SlackService();
  const now = new Date();
  const results: string[] = [];

  // ── 1. Sweep expired locks ──────────────────────────────────────────────
  const allLocks = await db.collection('agent_locks').get();
  const expiredBatch = db.batch();
  const expired: AgentLock[] = [];

  for (const doc of allLocks.docs) {
    const lock = doc.data() as AgentLock;
    if (lock.expiresAt?.toDate && lock.expiresAt.toDate() < now) {
      expiredBatch.delete(doc.ref);
      expired.push(lock);
    }
  }

  if (expired.length > 0) {
    await expiredBatch.commit();
    const names = expired.map(l => `\`${l.file}\` (${l.agent})`).join(', ');
    results.push(`🧹 Swept ${expired.length} expired lock(s): ${names}`);
    logger.info('[ORCHESTRATOR] Swept expired locks', { count: expired.length });
  }

  // ── 2. Detect unclaimed conflicts ───────────────────────────────────────
  // Agents in 'in-progress' whose status.files overlap with existing locks held by others
  const statusSnaps = await db.collection('agent_status')
    .where('phase', '==', 'in-progress').get();
  const activeLocks = allLocks.docs
    .map(d => d.data() as AgentLock)
    .filter(l => !expired.find(e => e.file === l.file));

  for (const doc of statusSnaps.docs) {
    const status = doc.data() as AgentStatus;
    const conflictingFiles = (status.files ?? []).filter(f =>
      activeLocks.some(l => l.file === f && l.agent !== status.agent)
    );
    if (conflictingFiles.length > 0) {
      const holders = conflictingFiles.map(f => {
        const lock = activeLocks.find(l => l.file === f);
        return `\`${f}\` held by *${lock?.agent}*`;
      });
      const msg = `⚠️ *${status.agent}* is working on files locked by others: ${holders.join(', ')}\n> Run \`node scripts/agent-coord.mjs inbox --agent ${status.agent}\` for context`;
      results.push(msg);
      await slack.postMessage(COORD_CHANNEL, msg).catch(() => {/* non-fatal */});
    }
  }

  // ── 3. Unblock agents waiting on completed files ────────────────────────
  const doneSnaps = await db.collection('agent_status')
    .where('phase', '==', 'done').get();
  const blockedSnaps = await db.collection('agent_status')
    .where('phase', '==', 'blocked').get();

  for (const blockedDoc of blockedSnaps.docs) {
    const blocked = blockedDoc.data() as AgentStatus;
    const blockingAgents = doneSnaps.docs
      .map(d => d.data() as AgentStatus)
      .filter(done =>
        (blocked.files ?? []).some(f => (done.files ?? []).includes(f))
      );

    if (blockingAgents.length > 0) {
      const names = blockingAgents.map(a => `*${a.agent}*`).join(', ');
      const msg = `🟢 *${blocked.agent}* can unblock — ${names} finished work on shared files\n> Run \`node scripts/agent-coord.mjs inbox --agent ${blocked.agent}\``;
      results.push(msg);
      await db.collection('agent_status').doc(blocked.agent).update({
        phase: 'planning',
        updatedAt: FieldValue.serverTimestamp(),
      });
      await slack.postMessage(COORD_CHANNEL, msg).catch(() => {/* non-fatal */});
    }
  }

  // ── 4. Periodic board summary (post every ~30 min = every 6th 5-min run) ─
  const minute = now.getMinutes();
  if (minute % 30 < 5) {
    const activeStatuses = statusSnaps.docs.map(d => d.data() as AgentStatus);
    const activeLockCount = activeLocks.length;

    if (activeStatuses.length > 0 || activeLockCount > 0) {
      const lines = activeStatuses.map(s => {
        const icon = AGENT_EMOJI[s.agent] ?? '🔧';
        return `${icon} *${s.agent}* — ${s.phase}: ${s.task}`;
      });
      if (activeLockCount > 0) {
        lines.push(`🔒 ${activeLockCount} active file lock(s)`);
      }
      await slack.postMessage(
        COORD_CHANNEL,
        `*Agent Board — ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}*\n${lines.join('\n')}`
      ).catch(() => {/* non-fatal */});
    }
  }

  logger.info('[ORCHESTRATOR] Run complete', { swept: expired.length, results: results.length });
  return NextResponse.json({ ok: true, swept: expired.length, actions: results });
}
