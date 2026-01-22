/**
 * Browser Automation Tests
 * Tests for browser automation data structures and utility functions.
 */

import type {
  BrowserSession,
  SessionState,
  SitePermission,
  PermissionGrant,
  RecordedWorkflow,
  WorkflowStep,
  BrowserTask,
  BrowserAction,
  AllowedAction,
  HighRiskAction,
  AccessLevel,
} from '@/types/browser-automation';

describe('Browser Automation Data Structures', () => {
  describe('BrowserSession', () => {
    it('should have required fields', () => {
      const session: Partial<BrowserSession> = {
        id: 'session-123',
        userId: 'user-456',
        status: 'active',
        tabs: [],
        startedAt: { toMillis: () => Date.now() } as any,
        lastActivityAt: { toMillis: () => Date.now() } as any,
      };

      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('userId');
      expect(session).toHaveProperty('status');
      expect(session).toHaveProperty('tabs');
    });

    it('should support all status values', () => {
      const statuses: BrowserSession['status'][] = ['active', 'paused', 'completed', 'failed'];

      statuses.forEach((status) => {
        const session: Partial<BrowserSession> = { status };
        expect(['active', 'paused', 'completed', 'failed']).toContain(session.status);
      });
    });

    it('should support optional taskDescription', () => {
      const session: Partial<BrowserSession> = {
        id: 'session-123',
        userId: 'user-456',
        status: 'active',
        taskDescription: 'Scrape competitor prices',
        tabs: [],
      };

      expect(session.taskDescription).toBe('Scrape competitor prices');
    });
  });

  describe('SitePermission', () => {
    it('should have required fields', () => {
      const permission: Partial<SitePermission> = {
        id: 'perm-123',
        userId: 'user-456',
        domain: 'example.com',
        accessLevel: 'full',
        allowedActions: ['navigate', 'click', 'type'],
        requiresConfirmation: ['purchase', 'delete'],
        grantedAt: { toMillis: () => Date.now() } as any,
      };

      expect(permission).toHaveProperty('id');
      expect(permission).toHaveProperty('userId');
      expect(permission).toHaveProperty('domain');
      expect(permission).toHaveProperty('accessLevel');
      expect(permission).toHaveProperty('allowedActions');
      expect(permission).toHaveProperty('requiresConfirmation');
    });

    it('should support all access levels', () => {
      const levels: AccessLevel[] = ['full', 'read-only', 'blocked'];

      levels.forEach((level) => {
        const permission: Partial<SitePermission> = { accessLevel: level };
        expect(['full', 'read-only', 'blocked']).toContain(permission.accessLevel);
      });
    });

    it('should support optional expiresAt', () => {
      const permission: Partial<SitePermission> = {
        id: 'perm-123',
        userId: 'user-456',
        domain: 'example.com',
        accessLevel: 'full',
        allowedActions: [],
        requiresConfirmation: [],
        expiresAt: { toMillis: () => Date.now() + 86400000 } as any,
      };

      expect(permission.expiresAt).toBeDefined();
    });
  });

  describe('PermissionGrant', () => {
    it('should have required fields', () => {
      const grant: PermissionGrant = {
        accessLevel: 'full',
        allowedActions: ['navigate', 'click'],
      };

      expect(grant).toHaveProperty('accessLevel');
      expect(grant).toHaveProperty('allowedActions');
    });

    it('should support optional requiresConfirmation', () => {
      const grant: PermissionGrant = {
        accessLevel: 'full',
        allowedActions: ['navigate'],
        requiresConfirmation: ['purchase', 'payment'],
      };

      expect(grant.requiresConfirmation).toContain('purchase');
    });

    it('should support optional expiresInDays', () => {
      const grant: PermissionGrant = {
        accessLevel: 'full',
        allowedActions: ['navigate'],
        expiresInDays: 30,
      };

      expect(grant.expiresInDays).toBe(30);
    });
  });

  describe('RecordedWorkflow', () => {
    it('should have required fields', () => {
      const workflow: Partial<RecordedWorkflow> = {
        id: 'workflow-123',
        userId: 'user-456',
        name: 'Daily Price Check',
        description: 'Check competitor prices daily',
        steps: [],
        variables: [],
        status: 'active',
        runCount: 0,
      };

      expect(workflow).toHaveProperty('id');
      expect(workflow).toHaveProperty('userId');
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('steps');
      expect(workflow).toHaveProperty('status');
    });

    it('should support workflow steps', () => {
      const step: WorkflowStep = {
        id: 'step-1',
        type: 'navigate',
        params: { url: 'https://example.com' },
        waitAfter: 1000,
      };

      const workflow: Partial<RecordedWorkflow> = {
        id: 'workflow-123',
        steps: [step],
      };

      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps![0].type).toBe('navigate');
    });

    it('should support workflow variables', () => {
      const workflow: Partial<RecordedWorkflow> = {
        id: 'workflow-123',
        variables: [
          { name: 'searchTerm', defaultValue: 'cannabis' },
          { name: 'maxPages', defaultValue: '5' },
        ],
      };

      expect(workflow.variables).toHaveLength(2);
      expect(workflow.variables![0].name).toBe('searchTerm');
    });
  });

  describe('BrowserTask', () => {
    it('should have required fields', () => {
      const task: Partial<BrowserTask> = {
        id: 'task-123',
        userId: 'user-456',
        name: 'Weekly Report',
        status: 'scheduled',
        enabled: true,
        schedule: {
          type: 'weekly',
          timezone: 'America/New_York',
        },
      };

      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('userId');
      expect(task).toHaveProperty('name');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('schedule');
    });

    it('should support all schedule types', () => {
      const types: ('once' | 'daily' | 'weekly' | 'monthly')[] = ['once', 'daily', 'weekly', 'monthly'];

      types.forEach((type) => {
        const task: Partial<BrowserTask> = {
          schedule: { type, timezone: 'UTC' },
        };
        expect(['once', 'daily', 'weekly', 'monthly']).toContain(task.schedule?.type);
      });
    });

    it('should support optional workflowId', () => {
      const task: Partial<BrowserTask> = {
        id: 'task-123',
        workflowId: 'workflow-456',
      };

      expect(task.workflowId).toBe('workflow-456');
    });
  });

  describe('BrowserAction', () => {
    it('should support navigate action', () => {
      const action: BrowserAction = {
        type: 'navigate',
        url: 'https://example.com',
      };

      expect(action.type).toBe('navigate');
      expect(action.url).toBe('https://example.com');
    });

    it('should support click action', () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#submit-button',
      };

      expect(action.type).toBe('click');
      expect(action.selector).toBe('#submit-button');
    });

    it('should support type action', () => {
      const action: BrowserAction = {
        type: 'type',
        selector: '#search-input',
        value: 'cannabis dispensary',
      };

      expect(action.type).toBe('type');
      expect(action.value).toBe('cannabis dispensary');
    });

    it('should support screenshot action', () => {
      const action: BrowserAction = {
        type: 'screenshot',
      };

      expect(action.type).toBe('screenshot');
    });

    it('should support execute_script action', () => {
      const action: BrowserAction = {
        type: 'execute_script',
        script: 'return document.title;',
      };

      expect(action.type).toBe('execute_script');
      expect(action.script).toBeDefined();
    });
  });
});

describe('Browser Automation Utility Functions', () => {
  describe('Domain normalization', () => {
    const normalizeDomain = (domain: string): string => {
      return domain.toLowerCase().replace(/^www\./, '');
    };

    it('should lowercase domains', () => {
      expect(normalizeDomain('EXAMPLE.COM')).toBe('example.com');
      expect(normalizeDomain('Example.Com')).toBe('example.com');
    });

    it('should remove www prefix', () => {
      expect(normalizeDomain('www.example.com')).toBe('example.com');
      expect(normalizeDomain('www.bakedbot.ai')).toBe('bakedbot.ai');
    });

    it('should handle domains without www', () => {
      expect(normalizeDomain('example.com')).toBe('example.com');
      expect(normalizeDomain('api.example.com')).toBe('api.example.com');
    });
  });

  describe('Blocked domain detection', () => {
    const BLOCKED_DOMAINS = ['bank', 'banking', 'paypal.com', 'chase.com'];

    const isBlockedDomain = (domain: string): boolean => {
      const normalized = domain.toLowerCase().replace(/^www\./, '');
      return BLOCKED_DOMAINS.some((blocked) => {
        if (blocked.includes('.')) {
          return normalized === blocked || normalized.endsWith('.' + blocked);
        }
        return normalized.includes(blocked);
      });
    };

    it('should block banking domains', () => {
      expect(isBlockedDomain('chase.com')).toBe(true);
      expect(isBlockedDomain('www.chase.com')).toBe(true);
      expect(isBlockedDomain('online.banking.example.com')).toBe(true);
    });

    it('should allow non-financial domains', () => {
      expect(isBlockedDomain('example.com')).toBe(false);
      expect(isBlockedDomain('bakedbot.ai')).toBe(false);
      expect(isBlockedDomain('leafly.com')).toBe(false);
    });

    it('should block domains containing "bank"', () => {
      expect(isBlockedDomain('mybank.com')).toBe(true);
      expect(isBlockedDomain('bankofamerica.com')).toBe(true);
    });
  });

  describe('Action validation', () => {
    const HIGH_RISK_KEYWORDS = ['checkout', 'payment', 'purchase', 'buy', 'order', 'submit'];

    const isHighRiskSelector = (selector: string): boolean => {
      const lower = selector.toLowerCase();
      return HIGH_RISK_KEYWORDS.some((keyword) => lower.includes(keyword));
    };

    it('should detect high-risk selectors', () => {
      expect(isHighRiskSelector('#checkout-button')).toBe(true);
      expect(isHighRiskSelector('.payment-form')).toBe(true);
      expect(isHighRiskSelector('[data-action="purchase"]')).toBe(true);
    });

    it('should allow normal selectors', () => {
      expect(isHighRiskSelector('#search-button')).toBe(false);
      expect(isHighRiskSelector('.product-list')).toBe(false);
      expect(isHighRiskSelector('[data-action="view"]')).toBe(false);
    });
  });

  describe('In-memory sorting', () => {
    it('should sort permissions by grantedAt descending', () => {
      const permissions = [
        { id: '1', grantedAt: { toMillis: () => 1000 } },
        { id: '2', grantedAt: { toMillis: () => 3000 } },
        { id: '3', grantedAt: { toMillis: () => 2000 } },
      ];

      const sorted = permissions.sort((a, b) => {
        const aTime = a.grantedAt?.toMillis?.() || 0;
        const bTime = b.grantedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      expect(sorted[0].id).toBe('2'); // Most recent first
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });

    it('should handle missing timestamps', () => {
      const items = [
        { id: '1', createdAt: null },
        { id: '2', createdAt: { toMillis: () => 1000 } },
        { id: '3' },
      ];

      const sorted = items.sort((a, b) => {
        const aTime = (a as any).createdAt?.toMillis?.() || 0;
        const bTime = (b as any).createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      expect(sorted[0].id).toBe('2'); // Only one with timestamp
    });
  });
});

describe('Browser Agent Chat', () => {
  describe('Action parsing from response', () => {
    const parseBrowserActions = (content: string) => {
      const actions: { type: string; target?: string; value?: string }[] = [];

      const navigateMatch = content.match(/navigat(?:e|ing) to ["`']?([^"`'\n]+)["`']?/i);
      if (navigateMatch) {
        actions.push({ type: 'navigate', target: navigateMatch[1] });
      }

      const clickMatch = content.match(/click(?:ed|ing)? (?:on )?["`']?([^"`'\n]+)["`']?/i);
      if (clickMatch) {
        actions.push({ type: 'click', target: clickMatch[1] });
      }

      const typeMatch = content.match(/typ(?:e|ing|ed) ["`']([^"`']+)["`']/i);
      if (typeMatch) {
        actions.push({ type: 'type', value: typeMatch[1] });
      }

      const screenshotMatch = content.match(/screenshot|capture/i);
      if (screenshotMatch) {
        actions.push({ type: 'screenshot' });
      }

      return actions;
    };

    it('should parse navigate actions', () => {
      const response = 'I will navigate to google.com';
      const actions = parseBrowserActions(response);

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('navigate');
      expect(actions[0].target).toBe('google.com');
    });

    it('should parse click actions', () => {
      const response = 'Now clicking on the search button';
      const actions = parseBrowserActions(response);

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('click');
    });

    it('should parse type actions', () => {
      const response = 'Typing "cannabis dispensary" in the search box';
      const actions = parseBrowserActions(response);

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('type');
      expect(actions[0].value).toBe('cannabis dispensary');
    });

    it('should parse screenshot actions', () => {
      const response = 'Taking a screenshot of the page';
      const actions = parseBrowserActions(response);

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('screenshot');
    });

    it('should parse multiple actions', () => {
      const response = 'I will navigate to google.com and take a screenshot';
      const actions = parseBrowserActions(response);

      expect(actions).toHaveLength(2);
    });

    it('should return empty array for non-action responses', () => {
      const response = 'I understand your request. Let me help you with that.';
      const actions = parseBrowserActions(response);

      expect(actions).toHaveLength(0);
    });
  });
});
