/**
 * BakedBot AI in Chrome - Action Validator
 *
 * Validates browser actions and detects high-risk operations.
 */

import { logger } from '@/lib/logger';
import type {
  BrowserAction,
  HighRiskAction,
  AllowedAction,
} from '@/types/browser-automation';

// Patterns that indicate high-risk actions
const HIGH_RISK_PATTERNS = {
  purchase: [
    /buy\s*now/i,
    /add\s*to\s*cart/i,
    /checkout/i,
    /place\s*order/i,
    /submit\s*order/i,
    /confirm\s*purchase/i,
    /pay\s*now/i,
    /complete\s*order/i,
  ],
  payment: [
    /credit\s*card/i,
    /debit\s*card/i,
    /payment/i,
    /billing/i,
    /cvv/i,
    /card\s*number/i,
    /expir/i,
  ],
  publish: [
    /publish/i,
    /post/i,
    /submit/i,
    /send/i,
    /share/i,
    /tweet/i,
    /comment/i,
  ],
  delete: [
    /delete/i,
    /remove/i,
    /trash/i,
    /destroy/i,
    /erase/i,
  ],
  share: [
    /share/i,
    /invite/i,
    /add\s*member/i,
    /grant\s*access/i,
  ],
  login: [
    /log\s*in/i,
    /sign\s*in/i,
    /password/i,
    /username/i,
    /email/i,
    /authenticate/i,
  ],
};

// URL patterns for high-risk pages
const HIGH_RISK_URL_PATTERNS = {
  purchase: [
    /checkout/i,
    /cart/i,
    /order/i,
    /payment/i,
    /billing/i,
  ],
  payment: [
    /payment/i,
    /pay\./i,
    /billing/i,
    /stripe\.com/i,
    /paypal\.com/i,
  ],
  login: [
    /login/i,
    /signin/i,
    /auth/i,
    /oauth/i,
    /sso/i,
  ],
};

export interface ValidationResult {
  isValid: boolean;
  isHighRisk: boolean;
  riskType?: HighRiskAction;
  reason?: string;
  warnings: string[];
}

/**
 * Check if an action type is considered high-risk
 */
export function isHighRiskAction(action: string): action is HighRiskAction {
  const highRiskActions: HighRiskAction[] = [
    'purchase',
    'publish',
    'delete',
    'share',
    'login',
    'payment',
  ];
  return highRiskActions.includes(action as HighRiskAction);
}

export class ActionValidator {
  /**
   * Validate a browser action
   */
  validate(action: BrowserAction, url?: string): ValidationResult {
    const warnings: string[] = [];
    let isHighRisk = false;
    let riskType: HighRiskAction | undefined;

    // Check action type validity
    const validActions: AllowedAction[] = [
      'navigate',
      'click',
      'type',
      'submit',
      'screenshot',
      'scroll',
      'execute_script',
    ];

    if (!validActions.includes(action.type as AllowedAction)) {
      return {
        isValid: false,
        isHighRisk: false,
        reason: `Invalid action type: ${action.type}`,
        warnings,
      };
    }

    // Check for script execution risks
    if (action.type === 'execute_script') {
      if (!action.script) {
        return {
          isValid: false,
          isHighRisk: false,
          reason: 'Script content is required',
          warnings,
        };
      }

      // Check for dangerous patterns in script
      const dangerousPatterns = [
        /eval\s*\(/i,
        /Function\s*\(/i,
        /document\.cookie/i,
        /localStorage/i,
        /sessionStorage/i,
        /window\.open/i,
        /\.innerHTML\s*=/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(action.script)) {
          warnings.push(`Script contains potentially dangerous pattern: ${pattern.source}`);
          isHighRisk = true;
        }
      }
    }

    // Check selector for high-risk patterns
    if (action.selector) {
      const detectedRisk = this.detectRiskFromSelector(action.selector);
      if (detectedRisk) {
        isHighRisk = true;
        riskType = detectedRisk;
      }
    }

    // Check typed value for sensitive data
    if (action.type === 'type' && action.value) {
      const sensitivePatterns = [
        { pattern: /^\d{15,16}$/, type: 'payment' as HighRiskAction, warning: 'Value looks like a credit card number' },
        { pattern: /^\d{3,4}$/, type: 'payment' as HighRiskAction, warning: 'Value looks like a CVV' },
        { pattern: /^\d{9}$/, type: 'share' as HighRiskAction, warning: 'Value looks like a SSN' },
      ];

      for (const { pattern, type, warning } of sensitivePatterns) {
        if (pattern.test(action.value.replace(/\s/g, ''))) {
          warnings.push(warning);
          isHighRisk = true;
          riskType = type;
        }
      }
    }

    // Check URL for high-risk pages
    if (url) {
      const urlRisk = this.detectRiskFromUrl(url);
      if (urlRisk) {
        isHighRisk = true;
        riskType = riskType || urlRisk;
      }
    }

    // Validate required fields
    if (action.type === 'navigate' && !action.url) {
      return {
        isValid: false,
        isHighRisk,
        riskType,
        reason: 'URL is required for navigate action',
        warnings,
      };
    }

    if ((action.type === 'click' || action.type === 'type') && !action.selector) {
      return {
        isValid: false,
        isHighRisk,
        riskType,
        reason: `Selector is required for ${action.type} action`,
        warnings,
      };
    }

    if (action.type === 'type' && action.value === undefined) {
      return {
        isValid: false,
        isHighRisk,
        riskType,
        reason: 'Value is required for type action',
        warnings,
      };
    }

    return {
      isValid: true,
      isHighRisk,
      riskType,
      warnings,
    };
  }

  /**
   * Detect high-risk action from selector text
   */
  private detectRiskFromSelector(selector: string): HighRiskAction | null {
    for (const [riskType, patterns] of Object.entries(HIGH_RISK_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(selector)) {
          return riskType as HighRiskAction;
        }
      }
    }
    return null;
  }

  /**
   * Detect high-risk action from URL
   */
  private detectRiskFromUrl(url: string): HighRiskAction | null {
    for (const [riskType, patterns] of Object.entries(HIGH_RISK_URL_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          return riskType as HighRiskAction;
        }
      }
    }
    return null;
  }

  /**
   * Create a human-readable description of the action
   */
  describeAction(action: BrowserAction, url?: string): string {
    switch (action.type) {
      case 'navigate':
        return `Navigate to ${action.url}`;
      case 'click':
        return `Click on element "${action.selector}"${url ? ` on ${url}` : ''}`;
      case 'type':
        const maskedValue = action.value?.length && action.value.length > 4
          ? action.value.slice(0, 2) + '***' + action.value.slice(-2)
          : '***';
        return `Type "${maskedValue}" into "${action.selector}"${url ? ` on ${url}` : ''}`;
      case 'submit':
        return `Submit form "${action.selector}"${url ? ` on ${url}` : ''}`;
      case 'scroll':
        return `Scroll ${action.value || 'down'}${url ? ` on ${url}` : ''}`;
      case 'screenshot':
        return `Take screenshot${url ? ` of ${url}` : ''}`;
      case 'execute_script':
        return `Execute script${url ? ` on ${url}` : ''}`;
      default:
        return `Perform ${action.type}${url ? ` on ${url}` : ''}`;
    }
  }
}

// Export singleton instance
export const actionValidator = new ActionValidator();
