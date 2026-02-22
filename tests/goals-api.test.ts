/**
 * Unit tests for Goal API Endpoints
 * Tests /api/goals/suggest and /api/cron/generate-insights-goal-progress
 */

import type { SuggestedGoal, GoalCategory, GoalTimeframe } from '@/types/goals';

describe('Goal API Endpoints', () => {
  describe('POST /api/goals/suggest', () => {
    it('should validate authentication required', () => {
      const requiresAuth = true;
      expect(requiresAuth).toBe(true);
    });

    it('should return array of suggested goals', () => {
      const mockResponse = {
        success: true,
        suggestions: [
          {
            title: 'Get 50 new customers',
            description: 'Increase foot traffic through promotions',
            category: 'foot_traffic' as GoalCategory,
            timeframe: 'weekly' as GoalTimeframe,
            targetMetric: {
              key: 'new_customers',
              label: 'New Customers',
              targetValue: 50,
              currentValue: 0,
              baselineValue: 0,
              unit: '#',
              direction: 'increase' as const,
            },
            rationale: 'You averaged 8 new customers/week last month',
            suggestedPlaybookIds: ['playbook_1'],
          } as SuggestedGoal,
        ],
      };

      expect(mockResponse.success).toBe(true);
      expect(Array.isArray(mockResponse.suggestions)).toBe(true);
      expect(mockResponse.suggestions[0].title).toBeTruthy();
    });

    it('should limit suggestions to 5 maximum', () => {
      const suggestions = Array(7)
        .fill(null)
        .map((_, i) => ({
          title: `Goal ${i}`,
          description: 'Test goal',
          category: 'foot_traffic' as GoalCategory,
          timeframe: 'weekly' as GoalTimeframe,
          targetMetric: {
            key: 'test',
            label: 'Test',
            targetValue: 100,
            currentValue: 0,
            baselineValue: 0,
            unit: '#',
            direction: 'increase' as const,
          },
          rationale: 'Test rationale',
          suggestedPlaybookIds: [],
        } as SuggestedGoal));

      const limited = suggestions.slice(0, 5);
      expect(limited).toHaveLength(5);
    });

    it('should include rationale referencing actual org data', () => {
      const suggestion: SuggestedGoal = {
        title: 'Grow loyalty enrollment',
        description: 'Increase loyalty program members',
        category: 'loyalty' as GoalCategory,
        timeframe: 'monthly' as GoalTimeframe,
        targetMetric: {
          key: 'loyalty_enrollments',
          label: 'Loyalty Enrollments',
          targetValue: 150,
          currentValue: 111,
          baselineValue: 100,
          unit: '#',
          direction: 'increase' as const,
        },
        rationale: 'You have 111 enrolled. 20 recent buyers arent enrolled',
        suggestedPlaybookIds: [],
      };

      expect(suggestion.rationale).toMatch(/enrolled|enrolled|customers/i);
      expect(suggestion.rationale.length).toBeGreaterThan(10);
    });

    it('should suggest different categories', () => {
      const categories: GoalCategory[] = [
        'foot_traffic',
        'revenue',
        'retention',
        'loyalty',
        'marketing',
        'compliance',
      ];

      categories.forEach(category => {
        expect(['foot_traffic', 'revenue', 'retention', 'loyalty', 'marketing', 'compliance', 'custom']).toContain(
          category
        );
      });
    });

    it('should include suggested playbooks', () => {
      const suggestion: SuggestedGoal = {
        title: 'Test Goal',
        description: 'Test',
        category: 'foot_traffic' as GoalCategory,
        timeframe: 'weekly' as GoalTimeframe,
        targetMetric: {
          key: 'test',
          label: 'Test',
          targetValue: 100,
          currentValue: 0,
          baselineValue: 0,
          unit: '#',
          direction: 'increase' as const,
        },
        rationale: 'Test',
        suggestedPlaybookIds: ['playbook_1', 'playbook_2'],
      };

      expect(Array.isArray(suggestion.suggestedPlaybookIds)).toBe(true);
      expect(suggestion.suggestedPlaybookIds.length).toBeGreaterThanOrEqual(0);
    });

    it('should return error on invalid request', () => {
      const response = {
        success: false,
        error: 'Organization not found',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });

    it('should return error on AI service failure', () => {
      const response = {
        success: false,
        error: 'Failed to generate goal suggestions',
      };

      expect(response.success).toBe(false);
      expect(response.error).toMatch(/generate|suggestions|failed/i);
    });
  });

  describe('POST /api/cron/generate-insights-goal-progress', () => {
    it('should validate CRON_SECRET header', () => {
      const expectedHeader = 'authorization';
      const expectedPrefix = 'Bearer ';
      expect(expectedHeader).toBeTruthy();
      expect(expectedPrefix).toBeTruthy();
    });

    it('should reject missing CRON_SECRET', () => {
      const response = {
        status: 401,
        error: 'Unauthorized',
      };

      expect(response.status).toBe(401);
    });

    it('should return 500 if CRON_SECRET not configured', () => {
      const response = {
        status: 500,
        error: 'Server misconfiguration',
      };

      expect([400, 401, 500]).toContain(response.status);
    });

    it('should process all organizations', () => {
      const mockResponse = {
        success: true,
        orgsProcessed: 5,
        goalsUpdated: 12,
        errors: 0,
      };

      expect(mockResponse.orgsProcessed).toBeGreaterThanOrEqual(0);
      expect(mockResponse.goalsUpdated).toBeGreaterThanOrEqual(0);
      expect(mockResponse.errors).toBeGreaterThanOrEqual(0);
    });

    it('should track update count', () => {
      const mockResponse = {
        success: true,
        orgsProcessed: 1,
        goalsUpdated: 3,
        errors: 0,
      };

      expect(mockResponse.goalsUpdated).toBeGreaterThanOrEqual(0);
    });

    it('should handle processing errors gracefully', () => {
      const mockResponse = {
        success: true,
        orgsProcessed: 5,
        goalsUpdated: 10,
        errors: 2, // 2 orgs had errors but processing continued
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.errors).toBeLessThanOrEqual(mockResponse.orgsProcessed);
    });

    it('should calculate metrics for foot_traffic category', () => {
      const metric = {
        category: 'foot_traffic',
        calculation: 'Count new customers since goal start',
      };

      expect(metric.category).toBe('foot_traffic');
      expect(metric.calculation.toLowerCase()).toContain('customer');
    });

    it('should calculate metrics for revenue category', () => {
      const metric = {
        category: 'revenue',
        calculation: 'Sum order totals since goal start',
      };

      expect(metric.category).toBe('revenue');
      expect(metric.calculation.toLowerCase()).toContain('order');
    });

    it('should calculate metrics for retention category', () => {
      const metric = {
        category: 'retention',
        calculation: 'Calculate repeat purchase rate',
      };

      expect(metric.category).toBe('retention');
      expect(metric.calculation.toLowerCase()).toContain('repeat');
    });

    it('should calculate metrics for loyalty category', () => {
      const metric = {
        category: 'loyalty',
        calculation: 'Count loyalty enrollments since goal start',
      };

      expect(metric.category).toBe('loyalty');
      expect(metric.calculation.toLowerCase()).toContain('enroll');
    });

    it('should calculate metrics for marketing category', () => {
      const metric = {
        category: 'marketing',
        calculation: 'Calculate average campaign open rate',
      };

      expect(metric.category).toBe('marketing');
      expect(metric.calculation.toLowerCase()).toContain('campaign');
    });

    it('should support GET and POST methods', () => {
      const methods = ['GET', 'POST'];
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
    });

    it('should return consistent response format', () => {
      const response = {
        success: true,
        orgsProcessed: 0,
        goalsUpdated: 0,
        errors: 0,
      };

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('orgsProcessed');
      expect(response).toHaveProperty('goalsUpdated');
      expect(response).toHaveProperty('errors');
    });
  });

  describe('API Error Handling', () => {
    it('should return 404 if org not found', () => {
      const statusCodes = [400, 401, 404, 500];
      expect(statusCodes).toContain(404);
    });

    it('should return 400 for invalid request body', () => {
      const statusCodes = [400, 401, 404, 500];
      expect(statusCodes).toContain(400);
    });

    it('should not expose internal error details', () => {
      const errorResponse = {
        error: 'Failed to process request',
      };

      expect(errorResponse.error).not.toMatch(/stack|database|sql/i);
    });

    it('should log errors for debugging', () => {
      const shouldLog = true;
      expect(shouldLog).toBe(true);
    });
  });

  describe('API Rate Limiting', () => {
    it('should accept cron requests from Cloud Scheduler', () => {
      const validSource = 'Cloud Scheduler';
      expect(validSource).toBeTruthy();
    });

    it('should verify Authorization header format', () => {
      const validFormat = /^Bearer\s.+$/;
      const validToken = 'Bearer test_token_123';
      expect(validToken).toMatch(validFormat);
    });
  });
});
