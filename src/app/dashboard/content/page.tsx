
// This component was incorrectly configured as a route segment.
// The exports for `dynamic` and `revalidate` have been removed to fix a build error.

import ContentClient from './ContentClient';

export default function ProductContentGeneratorPage() {
  return <ContentClient />;
}
