
// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import SettingsClient from './SettingsClient';

export default function SettingsPage() {
  return <SettingsClient />;
}
