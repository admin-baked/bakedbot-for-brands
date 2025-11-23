import { redirect } from 'next/navigation';

// All settings have been centralized to the /account page.
// This page now simply redirects to the new canonical location.
export default function DashboardSettingsPage() {
  redirect('/account');
}
