
// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import ReviewsClient from './ReviewsClient';

export default function ReviewsPage() {
  return <ReviewsClient />;
}
