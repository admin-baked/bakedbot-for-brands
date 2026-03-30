import Link from 'next/link';
import { ArrowRight, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface VisitorCheckinPromoProps {
  brandName: string;
  brandSlug: string;
  primaryColor: string;
}

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    label: 'Staff checks ID',
  },
  {
    icon: Smartphone,
    label: 'Phone required',
  },
  {
    icon: Mail,
    label: 'Email optional',
  },
];

export function VisitorCheckinPromo({
  brandName,
  brandSlug,
  primaryColor,
}: VisitorCheckinPromoProps) {
  return (
    <section className="py-6" aria-label={`${brandName} visitor check-in`}>
      <div className="container mx-auto px-4">
        <Card className="overflow-hidden border-border/60 bg-gradient-to-r from-background via-background to-muted/30 shadow-sm">
          <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="space-y-4">
              <Badge
                variant="secondary"
                className="border-transparent text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}
              >
                Front Door Check-In
              </Badge>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  BakedBot now checks visitors in before they shop at {brandName}
                </h2>
                <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                  After staff checks ID, visitors can check in with first name, phone, and
                  optional email. Returning guests are recognized instantly, and new opt-ins can
                  flow straight into loyalty follow-ups.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[240px]">
              <Button asChild size="lg" className="gap-2" style={{ backgroundColor: primaryColor }}>
                <Link href={`/${brandSlug}/rewards#check-in`}>
                  Check In Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`/${brandSlug}/rewards`}>See Rewards Details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
