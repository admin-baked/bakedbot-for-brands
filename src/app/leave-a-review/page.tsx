// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import LeaveReviewClient from './LeaveReviewClient';

export default function LeaveReviewPage() {
  return <LeaveReviewClient />;
}
