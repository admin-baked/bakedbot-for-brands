import { getCustomerSignupOpportunity } from '../customer-signup-proactive';

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
});
