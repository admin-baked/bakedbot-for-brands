/**
 * Goal-Driven Directive System Types
 * Strategic goals that become the north star for all agent activity
 */

export type GoalTimeframe = 'weekly' | 'monthly' | 'yearly';

export type GoalCategory =
  | 'foot_traffic'   // new customers, visit frequency, unique visitors
  | 'revenue'        // total revenue, AOV, order count
  | 'retention'      // repeat purchase rate, churn reduction
  | 'loyalty'        // tier advancement, points redemption, loyalty enrollment
  | 'marketing'      // campaign open rates, engagement metrics
  | 'compliance'     // license renewal, audit readiness
  | 'margin'         // gross margin %, product profitability
  | 'custom';        // freeform goal

export type GoalStatus = 'active' | 'achieved' | 'at_risk' | 'behind' | 'paused' | 'archived';

export interface GoalMetric {
  key: string;            // 'new_customers' | 'revenue' | 'avg_order_value' | 'repeat_rate' | 'churn_rate'
  label: string;          // "New Customers"
  targetValue: number;
  currentValue: number;
  baselineValue: number;  // snapshot at goal creation
  unit: string;           // '$', '#', '%', 'days'
  direction: 'increase' | 'decrease';
}

export interface GoalMilestone {
  id: string;
  label: string;          // "50% to target"
  targetProgress: number; // 0-100
  dueAt: Date;
  achievedAt?: Date;
}

export interface OrgGoal {
  id: string;
  orgId: string;
  createdBy: string;

  title: string;
  description: string;
  category: GoalCategory;
  timeframe: GoalTimeframe;

  startDate: Date;        // beginning of the goal period
  endDate: Date;          // deadline

  status: GoalStatus;
  progress: number;       // 0–100 computed from metrics

  metrics: GoalMetric[];  // what we're measuring (1–3 metrics per goal)

  playbookIds: string[];           // playbooks activated for this goal
  suggestedPlaybookIds: string[];  // AI-recommended, not yet activated

  milestones: GoalMilestone[];

  aiRationale?: string;   // why this was suggested by the magic button

  createdAt: Date;
  updatedAt: Date;
  lastProgressUpdatedAt: Date;
}

/**
 * Suggested goal from the magic button
 */
export interface SuggestedGoal {
  title: string;
  description: string;
  category: GoalCategory;
  timeframe: GoalTimeframe;
  targetMetric: GoalMetric;
  rationale: string;
  suggestedPlaybookIds: string[];
}

/**
 * Goal category metadata for UI display
 */
export interface GoalCategoryInfo {
  id: GoalCategory;
  label: string;
  description: string;
  icon: string;
  defaultTimeframe: GoalTimeframe;
  exampleGoals: string[];
}

export const GOAL_CATEGORIES: GoalCategoryInfo[] = [
  {
    id: 'foot_traffic',
    label: 'Foot Traffic',
    description: 'Increase store visits and attract new customers',
    icon: 'MapPin',
    defaultTimeframe: 'weekly',
    exampleGoals: [
      'Get 50 new customers this week',
      'Increase average weekly visits to 100',
      'Grow unique customers by 25 this month',
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    description: 'Grow total sales and average order value',
    icon: 'DollarSign',
    defaultTimeframe: 'monthly',
    exampleGoals: [
      'Reach $20k in revenue this month',
      'Grow average order value to $75',
      'Increase weekly sales to $5k',
    ],
  },
  {
    id: 'retention',
    label: 'Retention',
    description: 'Keep customers coming back',
    icon: 'Heart',
    defaultTimeframe: 'monthly',
    exampleGoals: [
      'Increase repeat purchase rate to 50%',
      'Reduce churn by 15% this month',
      'Get 75% of customers to reorder',
    ],
  },
  {
    id: 'loyalty',
    label: 'Loyalty',
    description: 'Grow loyalty program membership and engagement',
    icon: 'Star',
    defaultTimeframe: 'monthly',
    exampleGoals: [
      'Enroll 200 customers in loyalty program',
      'Increase loyalty redemption rate to 40%',
      'Get 50 customers to reach Gold tier',
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Improve campaign performance and engagement',
    icon: 'Megaphone',
    defaultTimeframe: 'monthly',
    exampleGoals: [
      'Achieve 35% email open rate',
      'Get 15% SMS click-through rate',
      'Complete 5 successful campaigns',
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    description: 'Maintain regulatory and license requirements',
    icon: 'ShieldCheck',
    defaultTimeframe: 'yearly',
    exampleGoals: [
      'Complete license renewal by deadline',
      'Pass compliance audit',
      'Maintain 100% compliance score',
    ],
  },
  {
    id: 'margin',
    label: 'Profitability',
    description: 'Improve gross margin and product profitability',
    icon: 'TrendingUp',
    defaultTimeframe: 'monthly',
    exampleGoals: [
      'Achieve 20% gross margin this month',
      'Improve average product margin to 25%',
      'Reduce below-cost product exposure by 50%',
    ],
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Set your own goal',
    icon: 'Target',
    defaultTimeframe: 'monthly',
    exampleGoals: ['Define your own goal'],
  },
];

/**
 * Goal status display metadata
 */
export interface GoalStatusInfo {
  id: GoalStatus;
  label: string;
  description: string;
  badgeColor: string;
  icon: string;
}

export const GOAL_STATUS_INFO: GoalStatusInfo[] = [
  {
    id: 'active',
    label: 'Active',
    description: 'Currently working toward this goal',
    badgeColor: 'bg-blue-100 text-blue-800',
    icon: 'Target',
  },
  {
    id: 'achieved',
    label: 'Achieved',
    description: 'Goal completed successfully',
    badgeColor: 'bg-green-100 text-green-800',
    icon: 'CheckCircle',
  },
  {
    id: 'at_risk',
    label: 'At Risk',
    description: 'Progress is lagging, action needed',
    badgeColor: 'bg-orange-100 text-orange-800',
    icon: 'AlertCircle',
  },
  {
    id: 'behind',
    label: 'Behind',
    description: 'Significantly behind pace',
    badgeColor: 'bg-red-100 text-red-800',
    icon: 'AlertTriangle',
  },
  {
    id: 'paused',
    label: 'Paused',
    description: 'Temporarily paused',
    badgeColor: 'bg-gray-100 text-gray-800',
    icon: 'Pause',
  },
  {
    id: 'archived',
    label: 'Archived',
    description: 'No longer active',
    badgeColor: 'bg-slate-100 text-slate-800',
    icon: 'Archive',
  },
];

/**
 * Get category info by ID
 */
export function getGoalCategoryInfo(categoryId: GoalCategory): GoalCategoryInfo | undefined {
  return GOAL_CATEGORIES.find(cat => cat.id === categoryId);
}

/**
 * Get status info by ID
 */
export function getGoalStatusInfo(statusId: GoalStatus): GoalStatusInfo | undefined {
  return GOAL_STATUS_INFO.find(status => status.id === statusId);
}

/**
 * Calculate goal progress as a percentage
 */
export function calculateGoalProgress(metrics: GoalMetric[]): number {
  if (metrics.length === 0) return 0;

  const progressScores = metrics.map(metric => {
    const range = metric.targetValue - metric.baselineValue;
    if (range === 0) return 0;

    const current = metric.currentValue;
    const baseline = metric.baselineValue;
    const target = metric.targetValue;

    if (metric.direction === 'increase') {
      return Math.min(100, Math.max(0, ((current - baseline) / (target - baseline)) * 100));
    } else {
      // For decreases, invert the logic
      return Math.min(100, Math.max(0, ((baseline - current) / (baseline - target)) * 100));
    }
  });

  // Return average progress across all metrics
  return Math.round(progressScores.reduce((a, b) => a + b, 0) / progressScores.length);
}

/**
 * Determine goal status based on progress and time remaining
 */
export function determineGoalStatus(progress: number, daysRemaining: number): GoalStatus {
  if (progress >= 100) return 'achieved';
  if (daysRemaining <= 0) return 'behind'; // time is up
  if (daysRemaining <= 3) {
    // Last 3 days — must be at 70%+ or we're at risk
    return progress >= 70 ? 'active' : 'at_risk';
  }
  // General check: should be at least proportionally ahead
  const expectedProgress = ((100 - progress) / (daysRemaining + 1)) * daysRemaining;
  return progress >= expectedProgress * 0.7 ? 'active' : 'at_risk';
}
