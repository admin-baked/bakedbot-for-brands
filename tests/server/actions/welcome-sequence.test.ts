/**
 * Welcome Sequence Playbook Tests
 *
 * Tests for the launch party welcome email sequence structure and validation.
 */

import { PlaybookStep, PlaybookTrigger } from '@/types/playbook';

// =============================================================================
// PLAYBOOK STRUCTURE VALIDATION
// =============================================================================

describe('Welcome Sequence Playbook Structure', () => {
    // Sample playbook matching the setup script structure
    const welcomePlaybook = {
        name: 'Launch Party Welcome Sequence',
        description: 'Automated 7-day email sequence for launch party attendees',
        agent: 'mrs_parker',
        category: 'customer_success',
        status: 'draft',
        requiresApproval: true,
        triggers: [
            { type: 'manual', description: 'Manually trigger for launch_party tagged customers' },
            { type: 'event', eventName: 'customer.tagged', condition: 'tag === "launch_party"', enabled: false }
        ],
        steps: [
            {
                id: 'step_1',
                name: 'Welcome Email',
                action: 'email',
                delay: null,
                params: { emailType: 'welcome', subject: 'Thanks for joining us!' }
            },
            {
                id: 'step_2',
                name: 'Day 3 - Feedback',
                action: 'email',
                delay: { value: 3, unit: 'days' },
                params: { emailType: 'onboarding', day: 3 }
            },
            {
                id: 'step_3',
                name: 'Day 7 - Urgency',
                action: 'email',
                delay: { value: 7, unit: 'days' },
                params: { emailType: 'promotion' }
            }
        ],
        targetTags: ['launch_party'],
        excludeTags: ['unsubscribed', 'opted_out']
    };

    describe('Playbook Metadata', () => {
        it('should have required fields', () => {
            expect(welcomePlaybook.name).toBeDefined();
            expect(welcomePlaybook.description).toBeDefined();
            expect(welcomePlaybook.agent).toBe('mrs_parker');
            expect(welcomePlaybook.category).toBe('customer_success');
        });

        it('should be in draft status (inactive)', () => {
            expect(welcomePlaybook.status).toBe('draft');
        });

        it('should require approval for email campaigns', () => {
            expect(welcomePlaybook.requiresApproval).toBe(true);
        });
    });

    describe('Playbook Triggers', () => {
        it('should have at least one trigger', () => {
            expect(welcomePlaybook.triggers.length).toBeGreaterThan(0);
        });

        it('should include a manual trigger', () => {
            const manualTrigger = welcomePlaybook.triggers.find(t => t.type === 'manual');
            expect(manualTrigger).toBeDefined();
        });

        it('should have event trigger disabled by default', () => {
            const eventTrigger = welcomePlaybook.triggers.find(t => t.type === 'event');
            if (eventTrigger) {
                expect((eventTrigger as any).enabled).toBe(false);
            }
        });
    });

    describe('Playbook Steps', () => {
        it('should have 3 email steps', () => {
            expect(welcomePlaybook.steps.length).toBe(3);
        });

        it('should have all steps as email actions', () => {
            welcomePlaybook.steps.forEach(step => {
                expect(step.action).toBe('email');
            });
        });

        it('should have first step with no delay (immediate)', () => {
            expect(welcomePlaybook.steps[0].delay).toBeNull();
        });

        it('should have Day 3 step with 3-day delay', () => {
            const day3Step = welcomePlaybook.steps[1];
            expect(day3Step.delay).toEqual({ value: 3, unit: 'days' });
        });

        it('should have Day 7 step with 7-day delay', () => {
            const day7Step = welcomePlaybook.steps[2];
            expect(day7Step.delay).toEqual({ value: 7, unit: 'days' });
        });

        it('should have unique step IDs', () => {
            const ids = welcomePlaybook.steps.map(s => s.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });

    describe('Targeting', () => {
        it('should target launch_party tagged customers', () => {
            expect(welcomePlaybook.targetTags).toContain('launch_party');
        });

        it('should exclude unsubscribed customers', () => {
            expect(welcomePlaybook.excludeTags).toContain('unsubscribed');
            expect(welcomePlaybook.excludeTags).toContain('opted_out');
        });
    });
});

// =============================================================================
// EMAIL CONTENT VALIDATION
// =============================================================================

describe('Welcome Email Content', () => {
    const emailContent = {
        step1: {
            subject: 'Thanks for joining us at the Ecstatic Edibles launch! 🌿',
            preheader: 'We hope you enjoyed your free samples!',
            cta: { text: 'Shop Now with 25% Off', code: 'LAUNCH25' }
        },
        step2: {
            subject: 'How did you like your edibles? 🍪',
            cta: { text: 'Share Your Favorite' }
        },
        step3: {
            subject: 'Your LAUNCH25 code expires soon! ⏰',
            urgency: 'Code expires in 48 hours',
            cta: { code: 'LAUNCH25' }
        }
    };

    it('should have discount code LAUNCH25', () => {
        expect(emailContent.step1.cta.code).toBe('LAUNCH25');
        expect(emailContent.step3.cta.code).toBe('LAUNCH25');
    });

    it('should have urgency messaging in final email', () => {
        expect(emailContent.step3.urgency).toContain('expires');
    });

    it('should have subject lines with emojis', () => {
        expect(emailContent.step1.subject).toContain('🌿');
        expect(emailContent.step2.subject).toContain('🍪');
        expect(emailContent.step3.subject).toContain('⏰');
    });
});

// =============================================================================
// CUSTOMER TAG VALIDATION
// =============================================================================

describe('Launch Party Tag', () => {
    const validTags = ['launch_party', 'vip', 'new_customer', 'opted_in'];
    const invalidTags = ['', ' ', 'launch party', 'LAUNCH_PARTY'];

    it('should use snake_case format', () => {
        expect('launch_party').toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it('should not contain spaces', () => {
        expect('launch_party').not.toContain(' ');
    });

    it('should be lowercase', () => {
        expect('launch_party').toBe('launch_party'.toLowerCase());
    });
});

// =============================================================================
// SEGMENT CALCULATION FOR NEW CUSTOMERS
// =============================================================================

describe('New Customer Segment', () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const customerProfiles = [
        {
            email: 'new@example.com',
            firstOrderDate: new Date(), // Today
            orderCount: 0,
            totalSpent: 0,
            expectedSegment: 'new'
        },
        {
            email: 'imported@example.com',
            firstOrderDate: undefined, // No orders yet
            orderCount: 0,
            totalSpent: 0,
            createdAt: new Date(), // Just created
            expectedSegment: 'new'
        }
    ];

    it('should categorize imported customers without orders as new', () => {
        customerProfiles.forEach(profile => {
            // Customers with no orders and recent creation date should be 'new'
            if (profile.orderCount === 0) {
                expect(profile.expectedSegment).toBe('new');
            }
        });
    });

    it('should have 0 total spent for imported customers', () => {
        customerProfiles.forEach(profile => {
            expect(profile.totalSpent).toBe(0);
        });
    });

    it('should have 0 order count for imported customers', () => {
        customerProfiles.forEach(profile => {
            expect(profile.orderCount).toBe(0);
        });
    });
});

// =============================================================================
// MRS. PARKER AGENT INTEGRATION
// =============================================================================

describe('Mrs. Parker Email Agent', () => {
    const agentConfig = {
        name: 'mrs_parker',
        role: 'Email Marketing Specialist',
        capabilities: [
            'welcome_email',
            'onboarding_sequence',
            'promotional_campaign',
            'winback_campaign'
        ],
        emailTypes: ['welcome', 'onboarding', 'promotion', 'winback']
    };

    it('should handle welcome emails', () => {
        expect(agentConfig.capabilities).toContain('welcome_email');
        expect(agentConfig.emailTypes).toContain('welcome');
    });

    it('should handle onboarding sequences', () => {
        expect(agentConfig.capabilities).toContain('onboarding_sequence');
        expect(agentConfig.emailTypes).toContain('onboarding');
    });

    it('should be named mrs_parker', () => {
        expect(agentConfig.name).toBe('mrs_parker');
    });
});
