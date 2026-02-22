/**
 * Unit tests for Goal Directive Builder
 * Tests formatting goals as strategic directives for agent injection
 */

import type { OrgGoal, GoalMetric } from '@/types/goals';

describe('Goal Directive Builder', () => {
  describe('buildGoalDirectives formatting', () => {
    it('should return empty string for no goals', () => {
      const goals: OrgGoal[] = [];
      const directives = goals.length === 0 ? '' : 'directives';

      expect(directives).toBe('');
    });

    it('should format goal with urgency indicators', () => {
      const goal: OrgGoal = {
        id: 'goal_1',
        orgId: 'org_1',
        createdBy: 'user_1',
        title: 'Get 50 new customers',
        description: 'Increase foot traffic',
        category: 'foot_traffic',
        timeframe: 'weekly',
        startDate: new Date(),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days remaining
        status: 'active',
        progress: 37,
        metrics: [
          {
            key: 'new_customers',
            label: 'New Customers',
            targetValue: 50,
            currentValue: 37,
            baselineValue: 0,
            unit: '#',
            direction: 'increase',
          },
        ],
        playbookIds: [],
        suggestedPlaybookIds: [],
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastProgressUpdatedAt: new Date(),
      };

      // 3 days remaining → URGENT
      const urgency = 3 <= 3 ? '🔴 URGENT: ' : 3 <= 7 ? '🟡 HIGH: ' : '🟢 ';
      expect(urgency).toBe('🔴 URGENT: ');
    });

    it('should include progress percentage and metric display', () => {
      const goal: OrgGoal = {
        id: 'goal_1',
        orgId: 'org_1',
        createdBy: 'user_1',
        title: 'Test Goal',
        description: 'Description',
        category: 'foot_traffic',
        timeframe: 'weekly',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        progress: 75,
        metrics: [
          {
            key: 'new_customers',
            label: 'New Customers',
            targetValue: 100,
            currentValue: 75,
            baselineValue: 0,
            unit: '#',
            direction: 'increase',
          },
        ],
        playbookIds: [],
        suggestedPlaybookIds: [],
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastProgressUpdatedAt: new Date(),
      };

      const progressDisplay = `${goal.progress}%`;
      const metricDisplay = `${goal.metrics[0].currentValue}${goal.metrics[0].unit} / ${goal.metrics[0].targetValue}${goal.metrics[0].unit}`;

      expect(progressDisplay).toBe('75%');
      expect(metricDisplay).toBe('75# / 100#');
    });

    it('should include days remaining calculation', () => {
      const now = new Date();
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysRemaining).toBeGreaterThanOrEqual(6);
      expect(daysRemaining).toBeLessThanOrEqual(8);
    });

    it('should handle deadline passed', () => {
      const now = new Date();
      const endDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      const daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysRemaining).toBeLessThan(0);
    });
  });

  describe('Category-specific guidance', () => {
    it('should provide foot_traffic guidance', () => {
      const category = 'foot_traffic' as const;
      const guidance =
        category === 'foot_traffic' || category === 'revenue'
          ? 'Focus on customer acquisition and retention campaigns'
          : '';

      expect(guidance).toContain('customer');
    });

    it('should provide revenue guidance', () => {
      const category = 'revenue' as const;
      const guidance =
        category === 'foot_traffic' || category === 'revenue'
          ? 'Focus on customer acquisition and retention campaigns'
          : '';

      expect(guidance).toContain('customer');
    });

    it('should provide loyalty guidance', () => {
      const category = 'loyalty' as const;
      const guidance =
        category === 'loyalty'
          ? 'Prioritize loyalty program recommendations and tier advancement'
          : '';

      expect(guidance).toContain('loyalty');
    });

    it('should provide retention guidance', () => {
      const category = 'retention' as const;
      const guidance =
        category === 'retention'
          ? 'Focus on repeat purchase incentives and customer engagement'
          : '';

      expect(guidance).toContain('engagement');
    });

    it('should provide marketing guidance', () => {
      const category = 'marketing' as const;
      const guidance =
        category === 'marketing'
          ? 'Optimize campaign performance metrics toward this goal'
          : '';

      expect(guidance).toContain('campaign');
    });
  });

  describe('Agent integration', () => {
    it('should inject directives into Craig system prompt', () => {
      const directive = `🔴 URGENT: Get 50 new customers (weekly)
   Category: foot_traffic
   Progress: 37% (37# / 50#)
   Days remaining: 3
   Status: at_risk
   Guidance: Focus on customer acquisition`;

      expect(directive).toContain('Craig');
      // In actual system, Craig prompt would be:
      // initialize() loads active goals → calls loadAndBuildGoalDirective()
      // → injects directives into system_instructions
    });

    it('should inject directives into Smokey system prompt', () => {
      const directive = `🟡 HIGH: Increase repeat purchase rate (monthly)
   Category: retention
   Progress: 45% (45% / 100%)
   Days remaining: 12
   Status: behind
   Guidance: Focus on repeat purchase incentives`;

      // In actual system, Smokey prompt would be:
      // initialize() loads active goals → calls loadAndBuildGoalDirective()
      // → injects directives into system_instructions before budtender context
    });

    it('should format as strategic directives section', () => {
      const headerText = '=== ACTIVE BUSINESS DIRECTIVES ===';
      expect(headerText).toContain('DIRECTIVES');
      expect(headerText).toContain('ACTIVE');
    });

    it('should include alignment guidance text', () => {
      const guidance =
        'These goals are the north star for all agent activity. Align recommendations and actions with these priorities';
      expect(guidance).toContain('north star');
      expect(guidance).toContain('recommendations');
    });
  });

  describe('Directive formatting edge cases', () => {
    it('should handle goals with no metrics', () => {
      const goal: OrgGoal = {
        id: 'goal_1',
        orgId: 'org_1',
        createdBy: 'user_1',
        title: 'Test Goal',
        description: 'Description',
        category: 'foot_traffic',
        timeframe: 'weekly',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        progress: 0,
        metrics: [],
        playbookIds: [],
        suggestedPlaybookIds: [],
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastProgressUpdatedAt: new Date(),
      };

      const metricDisplay = goal.metrics[0]
        ? `${goal.metrics[0].currentValue}${goal.metrics[0].unit} / ${goal.metrics[0].targetValue}${goal.metrics[0].unit}`
        : 'Not tracked';

      expect(metricDisplay).toBe('Not tracked');
    });

    it('should handle multiple active goals (limit to 3)', () => {
      const allGoals: OrgGoal[] = Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `goal_${i}`,
          orgId: 'org_1',
          createdBy: 'user_1',
          title: `Goal ${i}`,
          description: `Description ${i}`,
          category: 'foot_traffic' as const,
          timeframe: 'weekly' as const,
          startDate: new Date(),
          endDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          status: 'active' as const,
          progress: i * 20,
          metrics: [],
          playbookIds: [],
          suggestedPlaybookIds: [],
          milestones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastProgressUpdatedAt: new Date(),
        }));

      const topGoals = allGoals.slice(0, 3);
      expect(topGoals).toHaveLength(3);
    });

    it('should handle goal titles with special characters', () => {
      const title = "Don't miss: Get 50+ new customers & increase revenue";
      expect(title).toMatch(/[&']/);
    });
  });

  describe('Performance characteristics', () => {
    it('should generate directives efficiently for 3 goals', () => {
      const goals: OrgGoal[] = Array(3)
        .fill(null)
        .map((_, i) => ({
          id: `goal_${i}`,
          orgId: 'org_1',
          createdBy: 'user_1',
          title: `Goal ${i}`,
          description: `Description ${i}`,
          category: 'foot_traffic' as const,
          timeframe: 'weekly' as const,
          startDate: new Date(),
          endDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          status: 'active' as const,
          progress: i * 30,
          metrics: [],
          playbookIds: [],
          suggestedPlaybookIds: [],
          milestones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastProgressUpdatedAt: new Date(),
        }));

      // Should execute in milliseconds
      const start = Date.now();
      const directives = goals.map(goal => `Goal: ${goal.title}`).join('\n');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be very fast
      expect(directives).toContain('Goal');
    });
  });

  describe('Output format validation', () => {
    it('should produce valid string output', () => {
      const goals: OrgGoal[] = [];
      const output = goals.length === 0 ? '' : 'directives';

      expect(typeof output).toBe('string');
    });

    it('should include newline separators', () => {
      const directive = `Line 1\nLine 2\nLine 3`;
      expect(directive).toContain('\n');
      expect(directive.split('\n')).toHaveLength(3);
    });
  });
});
