import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Cannabis Lab Results | BakedBot',
    default: 'Cannabis Lab Results Directory | BakedBot',
  },
  description:
    'Browse verified cannabis lab test results — THC/CBD percentages, terpene profiles, and safety testing from certified labs. COA data you can trust.',
  openGraph: {
    title: 'Cannabis Lab Results Directory | BakedBot',
    description:
      'Verified cannabis lab results with THC/CBD, terpene profiles, and safety testing from certified labs.',
    type: 'website',
    siteName: 'BakedBot',
  },
};

export default function LabResultsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
