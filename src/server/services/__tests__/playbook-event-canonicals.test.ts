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

  it('includes post-purchase listeners when order.completed is dispatched', () => {
    expect(getCompatiblePlaybookEventNames('order.completed')).toEqual([
      'order.completed',
      'order.post_purchase',
    ]);
    expect(getCompatiblePlaybookDedupTypes('order.completed')).toEqual([
      'playbook_event_order.completed',
      'playbook_event_order.post_purchase',
    ]);
  });

  it('builds compatible dedup types for customer signup migration', () => {
    expect(getCompatiblePlaybookDedupTypes('customer.signup')).toEqual([
      'playbook_event_customer.signup',
      'playbook_event_customer.created',
    ]);
  });
});
