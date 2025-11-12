
// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import LocationsClient from './LocationsClient';

export default function LocationsPage() {
  return <LocationsClient />;
}
