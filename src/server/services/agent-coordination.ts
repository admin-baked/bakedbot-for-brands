import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

// Builder agents that write code in this repo
export type BuilderAgent = 'claude' | 'codex' | 'gemini' | 'linus' | string;
export type AgentPhase = 'planning' | 'in-progress' | 'done' | 'blocked';

export interface AgentLock {
  agent: string;
  file: string;
  intent: string;
  claimedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp; // 2h TTL
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string; // agent id or 'all'
  re: string; // file or topic
  body: string;
  ts: FirebaseFirestore.Timestamp;
  read: boolean;
}

export interface AgentStatus {
  agent: string;
  task: string;
  files: string[];
  phase: AgentPhase;
  startedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

const LOCK_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function db() {
  return getAdminFirestore();
}

function lockId(file: string) {
  return file.replace(/[/\\:.]/g, '_');
}

/**
 * Claim exclusive intent on a file before modifying it.
 * Returns { claimed: true } if successful, { claimed: false, lock } if already held.
 */
export async function claimFile(
  agent: string,
  file: string,
  intent: string
): Promise<{ claimed: true } | { claimed: false; lock: AgentLock }> {
  const ref = db().collection('agent_locks').doc(lockId(file));
  const now = Date.now();

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const existing = snap.data() as AgentLock;
      // Expired lock — overwrite it
      if (existing.expiresAt.toMillis() < now) {
        logger.info('[AGENT_COORD] Overwriting expired lock', { file, expiredAgent: existing.agent, newAgent: agent });
      } else if (existing.agent !== agent) {
        return { claimed: false as const, lock: existing };
      }
    }
    tx.set(ref, {
      agent,
      file,
      intent,
      claimedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(now + LOCK_TTL_MS),
    });
    return { claimed: true as const };
  });
}

/**
 * Release a file lock when done.
 */
export async function releaseFile(agent: string, file: string): Promise<void> {
  const ref = db().collection('agent_locks').doc(lockId(file));
  const snap = await ref.get();
  if (snap.exists && (snap.data() as AgentLock).agent === agent) {
    await ref.delete();
  }
}

/**
 * Get all active (non-expired) file locks.
 */
export async function getActiveLocks(): Promise<AgentLock[]> {
  const now = new Date();
  const snaps = await db().collection('agent_locks').get();
  return snaps.docs
    .map((d) => d.data() as AgentLock)
    .filter((l) => l.expiresAt.toDate() > now);
}

/**
 * Send a message to another agent (or 'all').
 */
export async function sendMessage(
  from: string,
  to: string,
  re: string,
  body: string
): Promise<string> {
  const ref = await db().collection('agent_messages').add({
    from,
    to,
    re,
    body,
    ts: FieldValue.serverTimestamp(),
    read: false,
  });
  logger.info('[AGENT_COORD] Message sent', { from, to, re });
  return ref.id;
}

/**
 * Get unread messages for an agent (includes 'all' broadcasts).
 */
export async function getInbox(agent: string): Promise<AgentMessage[]> {
  const [direct, broadcast] = await Promise.all([
    db().collection('agent_messages').where('to', '==', agent).where('read', '==', false).orderBy('ts', 'desc').limit(20).get(),
    db().collection('agent_messages').where('to', '==', 'all').where('read', '==', false).orderBy('ts', 'desc').limit(20).get(),
  ]);
  const seen = new Set<string>();
  return [...direct.docs, ...broadcast.docs]
    .filter((d) => { if (seen.has(d.id)) return false; seen.add(d.id); return true; })
    .map((d) => ({ id: d.id, ...d.data() } as AgentMessage))
    .sort((a, b) => b.ts.toMillis() - a.ts.toMillis());
}

/**
 * Mark messages as read.
 */
export async function markRead(messageIds: string[]): Promise<void> {
  const batch = db().batch();
  for (const id of messageIds) {
    batch.update(db().collection('agent_messages').doc(id), { read: true });
  }
  await batch.commit();
}

/**
 * Update the current agent's working status.
 */
export async function updateStatus(
  agent: string,
  task: string,
  files: string[],
  phase: AgentPhase
): Promise<void> {
  await db().collection('agent_status').doc(agent).set({
    agent,
    task,
    files,
    phase,
    updatedAt: FieldValue.serverTimestamp(),
    ...(phase === 'planning' || phase === 'in-progress' ? { startedAt: FieldValue.serverTimestamp() } : {}),
  }, { merge: true });
}

/**
 * Get all agent statuses (for startup board).
 */
export async function getAgentStatuses(): Promise<AgentStatus[]> {
  const snaps = await db().collection('agent_status').get();
  return snaps.docs.map((d) => d.data() as AgentStatus);
}
