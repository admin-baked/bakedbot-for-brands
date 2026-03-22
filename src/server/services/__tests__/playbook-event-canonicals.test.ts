import {
  getCompatiblePlaybookDedupTypes,
  getCompatiblePlaybookEventNames,
} from '../playbook-event-dispatcher';

describe('playbook event canonicals', () => {
  it('includes legacy customer.created listeners when customer.signup is dispatched', () => {
    expect(getCompatiblePlaybookEventNames('customer.signup')).toEqual([
      'customer.signup',
      'customer.created',
    ]);
  });

  it('keeps unrelated events unchanged', () => {
    expect(getCompatiblePlaybookEventNames('order.created')).toEqual(['order.created']);
    expect(getCompatiblePlaybookDedupTypes('order.created')).toEqual([
      'playbook_event_order.created',
    ]);
  });

  it('builds compatible dedup types for customer signup migration', () => {
    expect(getCompatiblePlaybookDedupTypes('customer.signup')).toEqual([
      'playbook_event_customer.signup',
      'playbook_event_customer.created',
    ]);
  });
});
