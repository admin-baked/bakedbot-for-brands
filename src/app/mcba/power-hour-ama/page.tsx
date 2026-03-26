import type { Metadata } from 'next';
import { MCBAPowerHourPage } from '@/components/landing/mcba-power-hour-page';

export const metadata: Metadata = {
  title: 'MCBA Power Hour AMA | Martez Knox x BakedBot.ai',
  description:
    'Join Martez Knox, CEO of BakedBot.ai, for an MCBA Power Hour AMA built for cannabis brands and dispensaries. Sign up and unlock 150 free AI credits.',
};

export default function Page() {
  return <MCBAPowerHourPage />;
}
