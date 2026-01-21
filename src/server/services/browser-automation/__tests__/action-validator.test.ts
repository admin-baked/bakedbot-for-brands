import { ActionValidator, isHighRiskAction } from '../action-validator';
import type { BrowserAction, HighRiskAction } from '@/types/browser-automation';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('ActionValidator', () => {
  let validator: ActionValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new ActionValidator();
  });

  describe('validate', () => {
    it('should validate a simple navigate action', () => {
      const action: BrowserAction = {
        type: 'navigate',
        url: 'https://example.com',
      };

      const result = validator.validate(action);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('should validate a click action with selector', () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#submit-button',
      };

      const result = validator.validate(action);

      expect(result.isValid).toBe(true);
    });

    it('should validate a type action with selector and value', () => {
      const action: BrowserAction = {
        type: 'type',
        selector: 'input[name="email"]',
        value: 'user@example.com',
      };

      const result = validator.validate(action);

      expect(result.isValid).toBe(true);
    });

    it('should reject navigate action without URL', () => {
      const action: BrowserAction = {
        type: 'navigate',
        // missing url
      } as BrowserAction;

      const result = validator.validate(action);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('URL');
    });

    it('should reject click action without selector', () => {
      const action: BrowserAction = {
        type: 'click',
        // missing selector
      } as BrowserAction;

      const result = validator.validate(action);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Selector');
    });

    it('should reject type action without value', () => {
      const action: BrowserAction = {
        type: 'type',
        selector: '#input',
        // missing value
      } as BrowserAction;

      const result = validator.validate(action);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Value');
    });

    it('should warn about dangerous script patterns', () => {
      const action: BrowserAction = {
        type: 'execute_script',
        script: 'document.cookie',
      };

      const result = validator.validate(action);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.isHighRisk).toBe(true);
    });

    it('should detect high-risk action from checkout URL', () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#place-order',
      };

      const result = validator.validate(action, 'https://shop.com/checkout');

      expect(result.isHighRisk).toBe(true);
      // Selector pattern takes precedence, both checkout URL and place-order suggest purchase
    });

    it('should detect login risk from URL', () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#login-button',
      };

      const result = validator.validate(action, 'https://site.com/login');

      expect(result.isHighRisk).toBe(true);
      expect(result.riskType).toBe('login');
    });

    it('should detect purchase action from selector containing checkout', () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#checkout-button',
      };

      const result = validator.validate(action);

      expect(result.isHighRisk).toBe(true);
      expect(result.riskType).toBe('purchase');
    });

    it('should detect delete action from selector', () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#delete-account',
      };

      const result = validator.validate(action);

      expect(result.isHighRisk).toBe(true);
      expect(result.riskType).toBe('delete');
    });

    it('should detect payment info in typed values', () => {
      const action: BrowserAction = {
        type: 'type',
        selector: '#card-number',
        value: '4242424242424242',
      };

      const result = validator.validate(action);

      expect(result.isHighRisk).toBe(true);
      expect(result.riskType).toBe('payment');
    });

    it('should reject script action without script content', () => {
      const action: BrowserAction = {
        type: 'execute_script',
        // missing script
      } as BrowserAction;

      const result = validator.validate(action);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Script');
    });
  });

  describe('describeAction', () => {
    it('should describe navigate action', () => {
      const action: BrowserAction = {
        type: 'navigate',
        url: 'https://example.com',
      };

      const description = validator.describeAction(action);

      expect(description).toContain('Navigate');
      expect(description).toContain('https://example.com');
    });

    it('should describe click action', () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#button',
      };

      const description = validator.describeAction(action);

      expect(description).toContain('Click');
      expect(description).toContain('#button');
    });

    it('should mask values in type action description', () => {
      const action: BrowserAction = {
        type: 'type',
        selector: '#password',
        value: 'secretpassword123',
      };

      const description = validator.describeAction(action);

      expect(description).not.toContain('secretpassword123');
      expect(description).toContain('***');
    });
  });
});

describe('isHighRiskAction', () => {
  it('should return true for purchase', () => {
    expect(isHighRiskAction('purchase')).toBe(true);
  });

  it('should return true for payment', () => {
    expect(isHighRiskAction('payment')).toBe(true);
  });

  it('should return true for delete', () => {
    expect(isHighRiskAction('delete')).toBe(true);
  });

  it('should return true for publish', () => {
    expect(isHighRiskAction('publish')).toBe(true);
  });

  it('should return true for share', () => {
    expect(isHighRiskAction('share')).toBe(true);
  });

  it('should return true for login', () => {
    expect(isHighRiskAction('login')).toBe(true);
  });

  it('should return false for non-risky actions', () => {
    expect(isHighRiskAction('navigate' as any)).toBe(false);
    expect(isHighRiskAction('click' as any)).toBe(false);
  });
});
