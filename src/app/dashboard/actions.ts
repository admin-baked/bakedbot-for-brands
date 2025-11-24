
'use server';

import type { Playbook, PlaybookDraft } from '@/types/domain';

const DEMO_BRAND_ID = 'demo-brand';

// Simple feature flag: do we have admin creds or not?
const HAS_SERVICE_ACCOUNT =
  !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY &&
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY !== '';

type PlaybookDraftInput = {
  name: string;
  description: string;
  agents: string[];
  tags: string[];
};

// ----- Live / stubbed playbooks (unchanged) -----

export async function getPlaybooksForDashboard(): Promise<Playbook[]> {
  const brandId = DEMO_BRAND_ID;

  const demoPlaybooks: Playbook[] = [
    {
      id: 'abandon-browse-cart-saver',
      brandId,
      name: 'abandon-browse-cart-saver',
      description:
        'Recover abandoned carts via email/SMS and on-site prompts.',
      kind: 'signal',
      tags: ['retention', 'recovery', 'sms', 'email', 'on-site'],
      enabled: true,
    },
    {
      id: 'competitor-price-drop-watch',
      brandId,
      name: 'competitor-price-drop-watch',
      description:
        'Monitor competitor price drops and suggest experiments.',
      kind: 'signal',
      tags: ['competitive', 'pricing', 'experiments'],
      enabled: true,
    },
    {
      id: 'new-subscriber-welcome-series',
      brandId,
      name: 'new-subscriber-welcome-series',
      description:
        'Onboard new subscribers with a 5-part welcome flow.',
      kind: 'automation',
      tags: ['email', 'onboarding', 'engagement'],
      enabled: false,
    },
    {
      id: 'win-back-lapsed-customers',
      brandId,
      name: 'win-back-lapsed-customers',
      description:
        'Re-engage customers who have not ordered in 60+ days.',
      kind: 'signal',
      tags: ['retention', 'sms', 'discounts'],
      enabled: true,
    },
  ];

  return demoPlaybooks;
}

// ----- Draft persistence -----
// If HAS_SERVICE_ACCOUNT = false, these functions fall back to stubs
// so the UI keeps working in Studio without secrets.

export async function savePlaybookDraft(
  input: PlaybookDraftInput,
  brandId: string = DEMO_BRAND_ID,
) {
  if (!HAS_SERVICE_ACCOUNT) {
    console.warn(
      '[dashboard] FIREBASE_SERVICE_ACCOUNT_KEY not set; skipping Firestore write and returning stub id.',
    );
    return { ok: true as const, id: `local_${Date.now()}`, stub: true as const };
  }

  try {
    const { firestore } = await import('@/firebase/server-client');
    const now = new Date();

    const docRef = await firestore
      .collection('brands')
      .doc(brandId)
      .collection('playbookDrafts')
      .add({
        ...input,
        brandId,
        createdAt: now,
        updatedAt: now,
      });

    return { ok: true as const, id: docRef.id, stub: false as const };
  } catch (err) {
    console.error('Error saving playbook draft', err);
    throw err;
  }
}

export async function getPlaybookDraftsForDashboard(
  brandId: string = DEMO_BRAND_ID,
): Promise<PlaybookDraft[]> {
  if (!HAS_SERVICE_ACCOUNT) {
    console.warn(
      '[dashboard] FIREBASE_SERVICE_ACCOUNT_KEY not set; returning empty draft list.',
    );
    return [];
  }

  try {
    const { firestore } = await import('@/firebase/server-client');

    const snap = await firestore
      .collection('brands')
      .doc(brandId)
      .collection('playbookDrafts')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const drafts: PlaybookDraft[] = snap.docs.map((doc: any) => {
      const data = doc.data() as any;

      return {
        id: doc.id,
        brandId,
        name: data.name ?? 'untitled-playbook',
        description: data.description ?? '',
        agents: Array.isArray(data.agents) ? data.agents : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        createdAt:
          data.createdAt instanceof Date
            ? data.createdAt
            : data.createdAt?.toDate?.(),
        updatedAt:
          data.updatedAt instanceof Date
            ? data.updatedAt
            : data.updatedAt?.toDate?.(),
        type: data.type ?? 'automation',
        signals: data.signals ?? [],
        targets: data.targets ?? [],
        constraints: data.constraints ?? [],
      };
    });

    return drafts;
  } catch (err) {
    console.error('Failed to load playbook drafts for dashboard', err);
    return [];
  }
}
