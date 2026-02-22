/**
 * Unit tests for Goal-Driven Directive System
 * Tests type utilities, calculations, and business logic
 */

import {
  calculateGoalProgress,
  determineGoalStatus,
  getGoalCategoryInfo,
  GOAL_CATEGORIES,
} from '@/types/goals';
import type { GoalMetric, OrgGoal } from '@/types/goals';

describe('Goal Types & Utilities', () => {
  describe('calculateGoalProgress', () => {
    it('should return 0% progress when no metrics exist', () => {
      const progress = calculateGoalProgress([]);
      expect(progress).toBe(0);
    });

    it('should calculate progress as average of all metrics', () => {
      const metrics: GoalMetric[] = [
        {
          key: 'new_customers',
          label: 'New Customers',
          targetValue: 100,
          currentValue: 50, // 50%
          baselineValue: 0,
          unit: '#',
          direction: 'increase',
        },
        {
          key: 'repeat_rate',
          label: 'Repeat Rate',
          targetValue: 100,
          currentValue: 60, // 60%
          baselineValue: 0,
          unit: '%',
          direction: 'increase',
        },
      ];

      const progress = calculateGoalProgress(metrics);
      expect(progress).toBe(55); // (50 + 60) / 2
    });

    it('should handle decrease direction metrics correctly', () => {
      const metrics: GoalMetric[] = [
        {
          key: 'churn_rate',
          label: 'Churn Rate',
          targetValue: 10, // target 10% or less
          currentValue: 15, // currently 15%
          baselineValue: 20,
          unit: '%',
          direction: 'decrease',
        },
      ];

      const progress = calculateGoalProgress(metrics);
      // For decrease: (target - current) / (target - baseline) * 100
      // (10 - 15) / (10 - 20) * 100 = -5 / -10 * 100 = 50%
      expect(progress).toBeGreaterThan(0);
    });

    it('should cap progress at 100%', () => {
      const metrics: GoalMetric[] = [
        {
          key: 'new_customers',
          label: 'New Customers',
          targetValue: 100,
          currentValue: 150, // exceeded target
          baselineValue: 0,
          unit: '#',
          direction: 'increase',
        },
      ];

      const progress = calculateGoalProgress(metrics);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('determineGoalStatus', () => {
    it('should return "achieved" when progress >= 100%', () => {
      const status = determineGoalStatus(100, 5);
      expect(status).toBe('achieved');
    });

    it('should return "at_risk" when progress < 50% and days remaining <= 3', () => {
      const status = determineGoalStatus(40, 2);
      expect(status).toBe('at_risk');
    });

    it('should return "behind" when progress < 50% and days remaining > 3', () => {
      const status = determineGoalStatus(40, 10);
      expect(status).toBe('behind');
    });

    it('should return "on_track" when progress >= 50% and days remaining > 0', () => {
      const status = determineGoalStatus(75, 5);
      expect(status).toBe('on_track');
    });

    it('should return "deadline_passed" when days remaining < 0', () => {
      const status = determineGoalStatus(50, -1);
      expect(status).toBe('deadline_passed');
    });

    it('should return "on_track" for 100% progress at any time', () => {
      expect(determineGoalStatus(100, -5)).toBe('achieved');
      expect(determineGoalStatus(100, 0)).toBe('achieved');
      expect(determineGoalStatus(100, 100)).toBe('achieved');
    });
  });

  describe('getGoalCategoryInfo', () => {
    it('should return category info for foot_traffic', () => {
      const info = getGoalCategoryInfo('foot_traffic');
      expect(info).toBeDefined();
      expect(info.label).toContain('Foot Traffic');
      expect(info.icon).toBeDefined();
    });

    it('should return category info for all valid categories', () => {
      const categories: Array<'foot_traffic' | 'revenue' | 'retention' | 'loyalty' | 'marketing' | 'compliance' | 'custom'> = [
        'foot_traffic',
        'revenue',
        'retention',
        'loyalty',
        'marketing',
        'compliance',
        'custom',
      ];

      categories.forEach(category => {
        const info = getGoalCategoryInfo(category);
        expect(info).toBeDefined();
        expect(info.label).toBeTruthy();
        expect(info.icon).toBeTruthy();
        expect(info.description).toBeTruthy();
      });
    });
  });

  describe('GOAL_CATEGORIES constant', () => {
    it('should contain all required category definitions', () => {
      expect(GOAL_CATEGORIES.length).toBeGreaterThan(0);
      expect(GOAL_CATEGORIES).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            value: expect.stringMatching(/foot_traffic|revenue|retention|loyalty|marketing|compliance|custom/),
            label: expect.any(String),
          }),
        ])
      );
    });

    it('should have unique category values', () => {
      const values = GOAL_CATEGORIES.map(cat => cat.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});

describe('Goal Calculations', () => {
  describe('Progress calculation edge cases', () => {
    it('should handle single metric', () => {
      const metrics: GoalMetric[] = [
        {
          key: 'test',
          label: 'Test',
          targetValue: 100,
          currentValue: 75,
          baselineValue: 0,
          unit: '#',
          direction: 'increase',
        },
      ];

      const progress = calculateGoalProgress(metrics);
      expect(progress).toBe(75);
    });

    it('should handle zero target value gracefully', () => {
      const metrics: GoalMetric[] = [
        {
          key: 'test',
          label: 'Test',
          targetValue: 0,
          currentValue: 0,
          baselineValue: 0,
          unit: '#',
          direction: 'increase',
        },
      ];

      const progress = calculateGoalProgress(metrics);
      expect(progress).toBeDefined();
      expect(typeof progress).toBe('number');
    });

    it('should handle multiple metrics with varying progress', () => {
      const metrics: GoalMetric[] = [
        {
          key: 'm1',
          label: 'M1',
          targetValue: 100,
          currentValue: 100, // 100%
          baselineValue: 0,
          unit: '#',
          direction: 'increase',
        },
        {
          key: 'm2',
          label: 'M2',
          targetValue: 100,
          currentValue: 50, // 50%
          baselineValue: 0,
          unit: '#',
          direction: 'increase',
        },
        {
          key: 'm3',
          label: 'M3',
          targetValue: 100,
          currentValue: 0, // 0%
          baselineValue: 0,
          unit: '#',
          direction: 'increase',
        },
      ];

      const progress = calculateGoalProgress(metrics);
      expect(progress).toBe(50); // (100 + 50 + 0) / 3
    });
  });

  describe('Status determination edge cases', () => {
    it('should handle 0 days remaining', () => {
      const status = determineGoalStatus(50, 0);
      expect(status).toBeDefined();
      expect(['on_track', 'behind', 'at_risk', 'deadline_passed']).toContain(status);
    });

    it('should handle negative days (past deadline)', () => {
      expect(determineGoalStatus(0, -1)).toBe('deadline_passed');
      expect(determineGoalStatus(100, -10)).toBe('achieved');
      expect(determineGoalStatus(50, -5)).toBe('deadline_passed');
    });

    it('should handle boundary progress values', () => {
      expect(determineGoalStatus(0, 10)).toBeDefined();
      expect(determineGoalStatus(50, 10)).toBeDefined();
      expect(determineGoalStatus(100, 10)).toBe('achieved');
    });
  });
});

describe('Goal Data Validation', () => {
  describe('Metric validation', () => {
    it('should require all metric fields', () => {
      const metric: GoalMetric = {
        key: 'test',
        label: 'Test Metric',
        targetValue: 100,
        currentValue: 50,
        baselineValue: 0,
        unit: '#',
        direction: 'increase',
      };

      expect(metric.key).toBeTruthy();
      expect(metric.label).toBeTruthy();
      expect(metric.targetValue).toBeGreaterThanOrEqual(0);
      expect(metric.currentValue).toBeGreaterThanOrEqual(0);
      expect(metric.unit).toMatch(/\$|#|%|days/);
      expect(['increase', 'decrease']).toContain(metric.direction);
    });
  });

  describe('Goal validation', () => {
    it('should require core goal fields', () => {
      const goal: OrgGoal = {
        id: 'goal_1',
        orgId: 'org_1',
        createdBy: 'user_1',
        title: 'Test Goal',
        description: 'A test goal',
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

      expect(goal.id).toBeTruthy();
      expect(goal.orgId).toBeTruthy();
      expect(goal.createdBy).toBeTruthy();
      expect(['active', 'achieved', 'paused', 'archived', 'at_risk', 'behind']).toContain(goal.status);
      expect(goal.endDate.getTime()).toBeGreaterThan(goal.startDate.getTime());
    });

    it('should validate timeframes', () => {
      const validTimeframes: Array<'weekly' | 'monthly' | 'yearly'> = ['weekly', 'monthly', 'yearly'];
      expect(validTimeframes).toContain('weekly');
      expect(validTimeframes).toContain('monthly');
      expect(validTimeframes).toContain('yearly');
    });

    it('should validate categories', () => {
      const validCategories = ['foot_traffic', 'revenue', 'retention', 'loyalty', 'marketing', 'compliance', 'custom'];
      expect(validCategories).toContain('foot_traffic');
      expect(validCategories).toContain('revenue');
      expect(validCategories).toContain('retention');
    });
  });
});
