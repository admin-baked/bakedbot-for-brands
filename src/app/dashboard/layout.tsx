
// This file is the new, clean layout for the /dashboard route segment.
// It imports the actual layout logic from DashboardLayout, ensuring
// that the complex logic doesn't leak and affect other routes like /customer-login.

import DashboardLayout from './DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
