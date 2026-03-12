import { resolveCustomerDisplayName } from '@/lib/customers/profile-derivations';

export type LifecyclePlaybookKind = 'welcome' | 'winback' | 'vip';

export interface LifecyclePlaybookDefinition {
    kind: LifecyclePlaybookKind;
    name: string;
    description: string;
    templateId: string;
}

export interface LifecycleMessagePreview {
    playbookKind: LifecyclePlaybookKind;
    emailSubject: string;
    emailPreview: string;
    smsBody: string;
    personalizationSignals: string[];
}

export interface CustomerLifecyclePlaybookStatus {
    playbookKind: LifecyclePlaybookKind;
    name: string;
    description: string;
    appliesNow: boolean;
    assignmentStatus: 'missing' | 'paused' | 'active';
    playbookId: string | null;
    lastCommunicationAt: Date | null;
    lastCommunicationChannel: string | null;
    nextScheduledAt: Date | null;
    nextScheduledSubject: string | null;
}

export const LIFECYCLE_PLAYBOOKS: readonly LifecyclePlaybookDefinition[] = [
    {
        kind: 'welcome',
        name: 'Welcome Email',
        description: 'Recurring welcome automation for new customers.',
        templateId: 'welcome_email_template',
    },
    {
        kind: 'winback',
        name: 'Win-Back',
        description: 'Recurring re-engagement automation for slipping and at-risk customers.',
        templateId: 'winback_campaign_template',
    },
    {
        kind: 'vip',
        name: 'VIP Appreciation',
        description: 'Recurring VIP appreciation automation for your highest-value customers.',
        templateId: 'vip_appreciation_template',
    },
] as const;

function normalizeValue(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeSubject(value: string | null | undefined): string {
    return normalizeValue(value).toLowerCase();
}

function getCategoryClause(category: string | null): string {
    return category ? ` around your ${category} favorites.` : '.';
}

function getWinbackCategoryClause(category: string | null): string {
    return category ? ` We saved some ${category} picks for you.` : '';
}

function getVipPreferenceClause(product: string | null, category: string | null): string {
    if (product) {
        return ` We kept ${product} in mind.`;
    }
    if (category) {
        return ` We leaned into your ${category} favorites.`;
    }
    return '';
}

function inferFromText(value: string): LifecyclePlaybookKind | null {
    if (!value) {
        return null;
    }

    if (value.includes('welcome')) {
        return 'welcome';
    }
    if (value.includes('winback') || value.includes('win-back') || value.includes('welcome you back') || value.includes('miss you')) {
        return 'winback';
    }
    if (value.includes('vip')) {
        return 'vip';
    }

    return null;
}

function getNormalizedCustomerName(input: {
    displayName?: string | null;
    firstName?: string | null;
    email?: string | null;
}): string {
    const firstName = normalizeValue(input.firstName);
    if (firstName) {
        return firstName;
    }

    const displayName = resolveCustomerDisplayName(input);
    const firstToken = displayName.split(/\s+/).find(Boolean)?.trim();
    return firstToken || 'there';
}

function getPreferredCategory(categories: string[] | null | undefined): string | null {
    return (categories ?? [])
        .map((value) => normalizeValue(value))
        .find((value) => value && value.toLowerCase() !== 'other') ?? null;
}

function getPreferredProduct(products: string[] | null | undefined): string | null {
    return (products ?? [])
        .map((value) => normalizeValue(value))
        .find(Boolean) ?? null;
}

export function customerMatchesLifecyclePlaybook(
    kind: LifecyclePlaybookKind,
    customer: { segment?: string | null },
): boolean {
    const segment = normalizeValue(customer.segment).toLowerCase();

    if (kind === 'welcome') {
        return segment === 'new';
    }

    if (kind === 'winback') {
        return segment === 'slipping' || segment === 'at_risk' || segment === 'churned';
    }

    return segment === 'vip';
}

export function inferLifecyclePlaybookKind(input: {
    segment?: string | null;
    playbookId?: string | null;
    subject?: string | null;
    metadata?: Record<string, unknown> | null;
}): LifecyclePlaybookKind | null {
    const playbookId = normalizeSubject(input.playbookId);
    const subject = normalizeSubject(input.subject);

    const metadata = input.metadata ?? null;
    const metadataKindValue = metadata && typeof metadata.playbookKind === 'string'
        ? normalizeSubject(metadata.playbookKind)
        : '';
    if (metadataKindValue === 'welcome' || metadataKindValue === 'winback' || metadataKindValue === 'vip') {
        return metadataKindValue as LifecyclePlaybookKind;
    }

    const metadataTemplateValue = metadata && typeof metadata.templateId === 'string'
        ? normalizeSubject(metadata.templateId)
        : '';
    const templateMatch = inferFromText(metadataTemplateValue);
    if (templateMatch) {
        return templateMatch;
    }

    const playbookMatch = inferFromText(playbookId);
    if (playbookMatch) {
        return playbookMatch;
    }

    const subjectMatch = inferFromText(subject);
    if (subjectMatch) {
        return subjectMatch;
    }

    const segment = normalizeSubject(input.segment);
    if (segment === 'new') {
        return 'welcome';
    }
    if (segment === 'vip') {
        return 'vip';
    }
    if (segment === 'slipping' || segment === 'at_risk' || segment === 'churned') {
        return 'winback';
    }

    return null;
}

export function buildLifecycleMessagePreview(input: {
    playbookKind: LifecyclePlaybookKind;
    customer: {
        displayName?: string | null;
        firstName?: string | null;
        email?: string | null;
        preferredCategories?: string[] | null;
        preferredProducts?: string[] | null;
    };
    orgName?: string | null;
}): LifecycleMessagePreview {
    const customerName = getNormalizedCustomerName(input.customer);
    const category = getPreferredCategory(input.customer.preferredCategories);
    const product = getPreferredProduct(input.customer.preferredProducts);
    const orgNameFallback = normalizeValue(input.orgName) || 'your dispensary';
    const personalizationSignals = [
        category ? `Favorite category: ${category}` : null,
        product ? `Favorite product: ${product}` : null,
    ].filter((value): value is string => Boolean(value));

    if (input.playbookKind === 'welcome') {
        return {
            playbookKind: 'welcome',
            emailSubject: `Welcome to ${orgNameFallback}, ${customerName}`,
            emailPreview: `Hi ${customerName}, thanks for joining ${orgNameFallback}. We will tailor future recommendations${category ? ` to your ${category} favorites` : ''} and keep your next picks easy to find.`,
            smsBody: `Hi ${customerName}, welcome to ${orgNameFallback}. We will tailor future picks${getCategoryClause(category)} Reply STOP to unsubscribe.`,
            personalizationSignals,
        };
    }

    if (input.playbookKind === 'winback') {
        return {
            playbookKind: 'winback',
            emailSubject: `${customerName}, we would love to welcome you back`,
            emailPreview: `Hi ${customerName}, it has been a while since your last visit to ${orgNameFallback}.${category ? ` We pulled together a win-back message built around your ${category} interests.` : ' We pulled together a win-back message to bring you back in.'}`,
            smsBody: `Hi ${customerName}, we miss you at ${orgNameFallback}.${getWinbackCategoryClause(category)} Reply STOP to unsubscribe.`,
            personalizationSignals,
        };
    }

    return {
        playbookKind: 'vip',
        emailSubject: `${customerName}, your VIP picks are ready`,
        emailPreview: `Hi ${customerName}, thanks for being one of the best customers at ${orgNameFallback}.${product ? ` This VIP note leans into ${product}.` : category ? ` This VIP note leans into your ${category} favorites.` : ' This VIP note is ready for your next visit.'}`,
        smsBody: `Hi ${customerName}, thanks for being VIP at ${orgNameFallback}.${getVipPreferenceClause(product, category)} Reply STOP to unsubscribe.`,
        personalizationSignals,
    };
}

export function buildLifecyclePlaybookStatuses(input: {
    customer: { segment?: string | null };
    playbooks: Array<{ id: string; templateId?: string | null }>;
    assignments: Array<{ playbookId: string; isActive?: boolean | null; status?: string | null }>;
    communications: Array<{
        sentAt: Date;
        channel?: string | null;
        subject?: string | null;
        playbookId?: string | null;
        metadata?: Record<string, unknown> | null;
        type?: string | null;
      }>;
    upcoming: Array<{
        scheduledFor: Date;
        subject?: string | null;
        playbookId?: string | null;
        metadata?: Record<string, unknown> | null;
    }>;
}): CustomerLifecyclePlaybookStatus[] {
    return LIFECYCLE_PLAYBOOKS.map((definition) => {
        const playbook = input.playbooks.find((candidate) => candidate.templateId === definition.templateId) ?? null;
        const assignment = playbook
            ? input.assignments.find((candidate) => candidate.playbookId === playbook.id) ?? null
            : null;

        const assignmentStatus: CustomerLifecyclePlaybookStatus['assignmentStatus'] = !playbook
            ? 'missing'
            : (assignment?.isActive === true || assignment?.status === 'active')
                ? 'active'
                : 'paused';

        const matchingCommunications = input.communications
            .filter((communication) => {
                const inferredKind = inferLifecyclePlaybookKind({
                    segment: input.customer.segment,
                    playbookId: communication.playbookId,
                    subject: communication.subject,
                    metadata: communication.metadata,
                }) ?? inferFromText(normalizeSubject(communication.type));
                return inferredKind === definition.kind;
            })
            .sort((left, right) => right.sentAt.getTime() - left.sentAt.getTime());

        const nextUpcoming = input.upcoming
            .filter((communication) => inferLifecyclePlaybookKind({
                segment: input.customer.segment,
                playbookId: communication.playbookId,
                subject: communication.subject,
                metadata: communication.metadata,
            }) === definition.kind)
            .sort((left, right) => left.scheduledFor.getTime() - right.scheduledFor.getTime())[0] ?? null;

        return {
            playbookKind: definition.kind,
            name: definition.name,
            description: definition.description,
            appliesNow: customerMatchesLifecyclePlaybook(definition.kind, input.customer),
            assignmentStatus,
            playbookId: playbook?.id ?? null,
            lastCommunicationAt: matchingCommunications[0]?.sentAt ?? null,
            lastCommunicationChannel: matchingCommunications[0]?.channel ?? null,
            nextScheduledAt: nextUpcoming?.scheduledFor ?? null,
            nextScheduledSubject: nextUpcoming?.subject ?? null,
        };
    });
}
