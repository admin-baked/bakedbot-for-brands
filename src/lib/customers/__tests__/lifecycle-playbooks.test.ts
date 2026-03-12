import {
    buildLifecycleMessagePreview,
    buildLifecyclePlaybookStatuses,
    customerMatchesLifecyclePlaybook,
} from '../lifecycle-playbooks';

describe('lifecycle-playbooks', () => {
    it('matches at-risk customers to the winback lifecycle playbook', () => {
        expect(customerMatchesLifecyclePlaybook('winback', { segment: 'at_risk' })).toBe(true);
    });

    it('builds deterministic VIP preview copy', () => {
        const preview = buildLifecycleMessagePreview({
            playbookKind: 'vip',
            customer: {
                firstName: 'Michael',
                preferredCategories: ['flower'],
                preferredProducts: ['Blue Dream'],
            },
            orgName: 'Allo',
        });

        expect(preview.emailSubject).toContain('VIP');
        expect(preview.smsBody).toContain('Michael');
    });

    it('always returns lifecycle statuses in welcome, winback, vip order', () => {
        const statuses = buildLifecyclePlaybookStatuses({
            customer: { segment: 'vip' },
            playbooks: [
                { id: 'playbook-welcome', templateId: 'welcome_email_template' },
                { id: 'playbook-winback', templateId: 'winback_campaign_template' },
                { id: 'playbook-vip', templateId: 'vip_appreciation_template' },
            ],
            assignments: [
                { playbookId: 'playbook-vip', status: 'active', isActive: true },
            ],
            communications: [],
            upcoming: [],
        });

        expect(statuses).toHaveLength(3);
        expect(statuses.map((status) => status.playbookKind)).toEqual(['welcome', 'winback', 'vip']);
    });
});
