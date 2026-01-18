'use client';

import { useEffect, useState } from 'react';
import { Flame, Zap, Gift, Clock } from 'lucide-react';

interface DealTickerItem {
  id: string;
  text: string;
  icon?: 'flame' | 'zap' | 'gift' | 'clock';
  highlight?: string;
}

interface DealsTickerProps {
  deals?: DealTickerItem[];
  speed?: number; // pixels per second
  className?: string;
  backgroundColor?: string;
}

const defaultDeals: DealTickerItem[] = [
  { id: '1', text: 'HAPPY HOUR: 20% OFF 8AM-12PM', icon: 'clock', highlight: '20% OFF' },
  { id: '2', text: 'BUY 2 VAPES GET 1 FREE', icon: 'zap', highlight: 'GET 1 FREE' },
  { id: '3', text: 'FIRST TIME CUSTOMER? 25% OFF YOUR ORDER', icon: 'gift', highlight: '25% OFF' },
  { id: '4', text: 'DAILY DEALS: $5 PRE-ROLLS ALL DAY', icon: 'flame', highlight: '$5 PRE-ROLLS' },
  { id: '5', text: 'SPEND $100, GET A FREE EDIBLE', icon: 'gift', highlight: 'FREE EDIBLE' },
];

const IconComponent = ({ icon }: { icon?: string }) => {
  const className = "h-4 w-4 mr-2 shrink-0";
  switch (icon) {
    case 'flame': return <Flame className={className} />;
    case 'zap': return <Zap className={className} />;
    case 'gift': return <Gift className={className} />;
    case 'clock': return <Clock className={className} />;
    default: return <Flame className={className} />;
  }
};

export function DealsTicker({
  deals = defaultDeals,
  speed = 50,
  className = '',
  backgroundColor = '#16a34a',
}: DealsTickerProps) {
  const [isPaused, setIsPaused] = useState(false);

  // Duplicate deals for seamless loop
  const allDeals = [...deals, ...deals, ...deals];

  return (
    <div
      className={`w-full overflow-hidden py-2 ${className}`}
      style={{ backgroundColor }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="flex whitespace-nowrap animate-ticker"
        style={{
          animationPlayState: isPaused ? 'paused' : 'running',
          animationDuration: `${(allDeals.length * 200) / speed}s`,
        }}
      >
        {allDeals.map((deal, index) => (
          <div
            key={`${deal.id}-${index}`}
            className="flex items-center px-8 text-white text-sm font-medium"
          >
            <IconComponent icon={deal.icon} />
            <span>
              {deal.text}
            </span>
            <span className="mx-8 text-white/50">•</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        .animate-ticker {
          animation: ticker linear infinite;
        }
      `}</style>
    </div>
  );
}
