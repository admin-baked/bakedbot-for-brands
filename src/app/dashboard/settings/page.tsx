// src/app/dashboard/settings/page.tsx
import { redirect } from 'next/navigation';

// All settings have been centralized to the /account page.
// This page now simply redirects to the new canonical location for a consistent user experience.
export default function DashboardSettingsPage() {
  redirect('/account');
}
