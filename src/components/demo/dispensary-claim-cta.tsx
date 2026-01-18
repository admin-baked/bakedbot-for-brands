'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Store,
  Gift,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Users,
  TrendingUp,
  Zap,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  Star,
  Leaf,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DispensaryClaimCTAProps {
  brandName: string;
  brandLogo?: string;
  primaryColor?: string;
  dispensaryName?: string;
  variant?: 'inline' | 'modal' | 'banner';
  orderContext?: {
    orderId: string;
    customerName: string;
    itemCount: number;
    total: number;
  };
}

const benefits = [
  {
    icon: Gift,
    title: 'Receive Brand Orders',
    description: 'Get customers sent directly to your store',
  },
  {
    icon: TrendingUp,
    title: 'Increase Revenue',
    description: 'Tap into brand marketing without extra work',
  },
  {
    icon: Users,
    title: 'Build Customer Base',
    description: 'Turn brand orders into loyal customers',
  },
  {
    icon: Zap,
    title: 'Instant Setup',
    description: 'Claim your page in under 2 minutes',
  },
];

export function DispensaryClaimCTA({
  brandName,
  brandLogo,
  primaryColor = '#16a34a',
  dispensaryName,
  variant = 'inline',
  orderContext,
}: DispensaryClaimCTAProps) {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleClaim = async () => {
    if (!email) return;
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  const renderClaimForm = () => (
    <div className="space-y-4">
      {!isSubmitted ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="claim-email">Dispensary Email</Label>
            <Input
              id="claim-email"
              type="email"
              placeholder="manager@yourdispensary.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
            />
          </div>
          <Button
            size="lg"
            className="w-full h-12 font-bold"
            style={{ backgroundColor: primaryColor }}
            onClick={handleClaim}
            disabled={!email || isSubmitting}
          >
            {isSubmitting ? (
              'Processing...'
            ) : (
              <>
                Claim Your Free Page
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            No credit card required. Setup takes less than 2 minutes.
          </p>
        </>
      ) : (
        <div className="text-center py-6">
          <div
            className="h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <h3 className="font-bold text-lg mb-2">Request Sent!</h3>
          <p className="text-muted-foreground text-sm">
            Check your email for next steps. We&apos;ll have your page ready in minutes.
          </p>
        </div>
      )}
    </div>
  );

  // Banner variant - shown to budtender at checkout
  if (variant === 'banner') {
    return (
      <Card className="border-2 border-dashed" style={{ borderColor: primaryColor }}>
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Left: Brand Info */}
            <div className="flex items-center gap-4">
              {brandLogo ? (
                <div className="relative h-16 w-16 bg-white rounded-xl shadow-sm">
                  <Image
                    src={brandLogo}
                    alt={brandName}
                    fill
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <div
                  className="h-16 w-16 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Leaf className="h-8 w-8 text-white" />
                </div>
              )}
              <div>
                <Badge
                  variant="outline"
                  className="mb-1 gap-1"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  <Gift className="h-3 w-3" />
                  Free Offer
                </Badge>
                <h3 className="font-bold text-lg">
                  {dispensaryName ? `Hey ${dispensaryName}!` : 'Hey there!'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Want more orders like this? Claim your BakedBot page.
                </p>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
              {orderContext && (
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground">
                    Order #{orderContext.orderId}
                  </p>
                  <p className="font-semibold">
                    {orderContext.itemCount} items • ${orderContext.total.toFixed(2)}
                  </p>
                </div>
              )}
              <Button
                size="lg"
                className="font-bold gap-2"
                style={{ backgroundColor: primaryColor }}
                onClick={() => setShowModal(true)}
              >
                <Sparkles className="h-5 w-5" />
                Claim Free Page
              </Button>
            </div>
          </div>
        </CardContent>

        {/* Modal for banner */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" style={{ color: primaryColor }} />
                Claim Your Free BakedBot Page
              </DialogTitle>
              <DialogDescription>
                Start receiving {brandName} orders directly to your dispensary
              </DialogDescription>
            </DialogHeader>
            {renderClaimForm()}
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Modal variant
  if (variant === 'modal') {
    return (
      <>
        <Button
          size="lg"
          className="font-bold gap-2"
          style={{ backgroundColor: primaryColor }}
          onClick={() => setShowModal(true)}
        >
          <Store className="h-5 w-5" />
          Claim Your Dispensary Page
        </Button>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                {brandLogo ? (
                  <div className="relative h-12 w-12">
                    <Image
                      src={brandLogo}
                      alt={brandName}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Leaf className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <DialogTitle>Join the {brandName} Network</DialogTitle>
                  <DialogDescription>Free for dispensaries. Setup in minutes.</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-4 py-4">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <benefit.icon className="h-5 w-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{benefit.title}</p>
                    <p className="text-xs text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {renderClaimForm()}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Inline variant (default)
  return (
    <section className="py-12 bg-gradient-to-br from-muted/50 to-muted">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Left: Info */}
            <div
              className="p-8 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {/* Decorative circles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
                <div className="absolute -right-10 -top-10 w-40 h-40 border-4 border-white rounded-full" />
                <div className="absolute -left-5 -bottom-5 w-32 h-32 border-4 border-white rounded-full" />
              </div>

              <div className="relative">
                <Badge className="bg-white/20 text-white border-0 mb-4">
                  <Gift className="h-3 w-3 mr-1" />
                  For Dispensaries
                </Badge>

                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Receive {brandName} Orders
                </h2>

                <p className="text-white/90 mb-6">
                  Customers order {brandName} products online and pick them up at your store.
                  It&apos;s free marketing and new customers delivered to you.
                </p>

                <div className="space-y-3">
                  {benefits.slice(0, 3).map((benefit) => (
                    <div key={benefit.title} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-white/80" />
                      <span className="text-sm">{benefit.title}</span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex gap-8 mt-8 pt-6 border-t border-white/20">
                  <div>
                    <div className="text-2xl font-bold">500+</div>
                    <div className="text-sm text-white/70">Partner Dispensaries</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">$0</div>
                    <div className="text-sm text-white/70">Setup Cost</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div className="p-8 bg-background">
              <div className="flex items-center gap-3 mb-6">
                <Store className="h-6 w-6" style={{ color: primaryColor }} />
                <h3 className="text-xl font-bold">Claim Your Page</h3>
              </div>

              {renderClaimForm()}

              {/* Trust indicators */}
              {!isSubmitted && (
                <div className="flex items-center gap-4 mt-6 pt-6 border-t text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    2 min setup
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    No contracts
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    Free forever
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
