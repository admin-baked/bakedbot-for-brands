'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { getServerSessionUser } from '@/server/auth/session';
import { logger } from '@/lib/logger';
import {
  createInboxThreadId,
  getDefaultAgentForThreadType,
  getSupportingAgentsForThreadType,
} from '@/types/inbox';
import type { InboxThread } from '@/types/inbox';
import type { ChatMessage } from '@/lib/store/agent-chat-store';

const INBOX_THREADS_COLLECTION = 'inbox_threads';
const WELCOME_TAG = 'system:welcome';

function buildWelcomeMessage(orgName: string | null, role: string | null): ChatMessage {
  const name = orgName || 'your business';
  const isDispensary = role === 'dispensary' || role === 'dispensary_admin' || role === 'dispensary_staff';

  const steps = isDispensary
    ? [
        '1. **Build your Brand Guide** — Set your voice, colors, and assets so every agent stays on-brand. (Settings > Brand Guide)',
        '2. **Link your dispensary** — Confirm your retail location so check-in and reporting work correctly.',
        '3. **Connect your menu** — Import inventory so Smokey can recommend real products at check-in.',
        '4. **Set up Check-In** — Configure the check-in flow so customers can start checking in.',
      ]
    : [
        '1. **Build your Brand Guide** — Set your voice, colors, and assets so every agent stays on-brand. (Settings > Brand Guide)',
        '2. **Create your first social draft** — Use Creative Center to generate a post with your brand voice.',
        '3. **Launch Competitive Intelligence** — Turn on Ezal\'s daily reports to track your market.',
        '4. **Activate a Welcome Playbook** — Automate follow-up for new contacts.',
      ];

  const checkinNote = isDispensary
    ? [
        '',
        '**Two ways to check customers in:**',
        '- **Self-Service Tablet** — Put a tablet at your door. Customers enter their name, phone, and mood. Smokey recommends products from your real menu.',
        '- **Staff Check-In** — Open any laptop or computer at the register. Staff looks up the customer by name or phone — 30 seconds flat.',
        '',
        'Both modes work right away once you finish step 4. No special hardware needed — any tablet, laptop, or desktop works.',
      ]
    : [];

  const content = [
    `Welcome to BakedBot! I'm Marty, your AI strategist. I'll help ${name} get up and running.`,
    '',
    'Here\'s your setup roadmap — each step takes a few minutes and unlocks more of the platform:',
    '',
    ...steps,
    ...checkinNote,
    '',
    'The **setup checklist above** tracks your progress. Start with the Brand Guide — everything else builds on it.',
    '',
    'Ask me anything in this thread. I\'m here to help.',
  ].join('\n');

  return {
    id: `welcome-msg-${Date.now()}`,
    type: 'agent',
    content,
    timestamp: new Date(),
  };
}

export async function ensureWelcomeThread(): Promise<{ created: boolean; threadId?: string }> {
  try {
    const user = await getServerSessionUser();
    if (!user?.uid) return { created: false };

    const db = getAdminFirestore();

    const existing = await db
      .collection(INBOX_THREADS_COLLECTION)
      .where('userId', '==', user.uid)
      .where('tags', 'array-contains', WELCOME_TAG)
      .limit(1)
      .get();

    if (!existing.empty) {
      return { created: false, threadId: existing.docs[0].id };
    }

    const orgId = user.orgId || user.currentOrgId || user.uid;

    let orgName: string | null = null;
    try {
      const orgDoc = await db.collection('organizations').doc(orgId).get();
      const orgData = orgDoc.data();
      orgName = orgData?.name || orgData?.brandName || null;
    } catch {
      // Fall through with null orgName
    }

    const message = buildWelcomeMessage(orgName, user.role);
    const threadId = createInboxThreadId();
    const now = new Date();

    const thread: InboxThread = {
      id: threadId,
      orgId,
      userId: user.uid,
      type: 'general',
      status: 'active',
      title: 'Welcome to BakedBot — Start Here',
      preview: 'Your setup roadmap',
      primaryAgent: getDefaultAgentForThreadType('general'),
      assignedAgents: [
        getDefaultAgentForThreadType('general'),
        ...getSupportingAgentsForThreadType('general'),
      ],
      artifactIds: [],
      messages: [message],
      tags: [WELCOME_TAG],
      isPinned: true,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    await db.collection(INBOX_THREADS_COLLECTION).doc(threadId).set(thread);

    logger.info('Welcome thread created', { uid: user.uid, threadId });
    return { created: true, threadId };
  } catch (error) {
    logger.error('Failed to create welcome thread', { error });
    return { created: false };
  }
}
