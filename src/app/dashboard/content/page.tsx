
// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import ContentClient from './ContentClient';

export default function ProductContentGeneratorPage() {
  return <ContentClient />;
}
