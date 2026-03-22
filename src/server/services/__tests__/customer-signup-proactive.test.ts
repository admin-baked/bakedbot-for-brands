import {
  CUSTOMER_SIGNUP_IMPORT_DIGEST_THRESHOLD,
  getCustomerSignupImportMode,
  getCustomerSignupOpportunity,
  summarizeCustomerSignupImportOpportunities,
} from '../customer-signup-proactive';

describe('customer signup proactive gap detection', () => {
  const orgId = 'org_test';

  it('skips when welcome automation is active and email exists', () => {
    const opportunity = getCustomerSignupOpportunity({
      orgId,
      payload: {
        customerId: 'cust_1',
        email: 'healthy@example.com',
        firstName: 'Healthy',
      },
      welcomeAutomationState: 'active',
    });

    expect(opportunity).toBeNull();
  });

  it('flags missing contact channels as high severity', () => {
    const opportunity = getCustomerSignupOpportunity({
      orgId,
      payload: {
        customerId: 'cust_2',
        firstName: 'No',
        lastName: 'Contact',
      },
      welcomeAutomationState: 'active',
    });

    expect(opportunity).toEqual(
      expect.objectContaining({
        severity: 'high',
        reason: 'missing_contact_channel',
        title: 'New customer needs contact capture: No Contact',
      })
    );
  });

  it('flags welcome automation gaps when email exists but playbook is missing', () => {
    const opportunity = getCustomerSignupOpportunity({
      orgId,
      payload: {
        customerId: 'cust_3',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'Customer',
      },
      welcomeAutomationState: 'missing',
    });

    expect(opportunity).toEqual(
      expect.objectContaining({
        severity: 'high',
        reason: 'welcome_automation_missing',
        businessObjectId: 'new@example.com',
      })
    );
  });

  it('uses digest mode only when import size crosses the batching threshold', () => {
    expect(getCustomerSignupImportMode(CUSTOMER_SIGNUP_IMPORT_DIGEST_THRESHOLD)).toBe('individual');
    expect(getCustomerSignupImportMode(CUSTOMER_SIGNUP_IMPORT_DIGEST_THRESHOLD + 1)).toBe('digest');
  });

  it('summarizes imported customer onboarding gaps into one cohort digest', () => {
    const digest = summarizeCustomerSignupImportOpportunities({
      orgId,
      payloads: [
        { customerId: 'cust_1', email: 'one@example.com', firstName: 'One' },
        { customerId: 'cust_2', firstName: 'Two', lastName: 'NoEmail' },
        { customerId: 'cust_3', email: 'three@example.com', firstName: 'Three' },
      ],
      welcomeAutomationState: 'missing',
      now: new Date('2026-03-21T12:00:00.000Z'),
    });

    expect(digest).toEqual(
      expect.objectContaining({
        title: 'Imported customers need onboarding review (3)',
        severity: 'high',
        businessObjectId: 'customer_import_2026-03-21',
      })
    );
    expect(digest?.reasonCounts).toEqual({
      welcome_automation_missing: 2,
      missing_contact_channel: 1,
    });
    expect(digest?.sampleCustomers).toHaveLength(3);
  });
});
