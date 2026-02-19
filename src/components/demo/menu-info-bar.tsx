'use client';

/**
 * MenuInfoBar — Public-facing loyalty + discount + delivery info strip.
 *
 * Driven entirely by data from `getPublicMenuSettings()`.
 * Shown on both BrandMenuClient (dispensary mode) and DispensaryMenuClient.
 */

import { Shield, GraduationCap, Star, Heart, Users, Tag, Award } from 'lucide-react';
import type { DiscountProgramIcon, LoyaltyMenuDisplay, DiscountProgram } from '@/types/customers';

export interface PublicMenuSettings {
  pointsPerDollar: number;
  menuDisplay: LoyaltyMenuDisplay;
  discountPrograms: DiscountProgram[];
}

interface MenuInfoBarProps {
  settings: PublicMenuSettings;
  primaryColor?: string;
}

function DiscountIcon({ icon, className }: { icon: DiscountProgramIcon; className?: string }) {
  switch (icon) {
    case 'shield': return <Shield className={className} />;
    case 'graduation-cap': return <GraduationCap className={className} />;
    case 'star': return <Star className={className} />;
    case 'heart': return <Heart className={className} />;
    case 'users': return <Users className={className} />;
    case 'tag': default: return <Tag className={className} />;
  }
}

export function MenuInfoBar({ settings, primaryColor = '#16a34a' }: MenuInfoBarProps) {
  const { menuDisplay, discountPrograms, pointsPerDollar } = settings;

  if (!menuDisplay.showBar && !menuDisplay.showDeliveryInfo) return null;

  const enabledPrograms = menuDisplay.showDiscountPrograms
    ? discountPrograms.filter(p => p.enabled)
    : [];

  const loyaltyTagline = menuDisplay.loyaltyTagline?.trim() ||
    `Earn ${pointsPerDollar} pt${pointsPerDollar !== 1 ? 's' : ''} per $1 spent — redeem for discounts`;

  const hasLoyaltyContent = menuDisplay.showBar;
  const hasDeliveryContent = menuDisplay.showDeliveryInfo;

  if (!hasLoyaltyContent && !hasDeliveryContent) return null;

  return (
    <>
      {/* Loyalty & Discount Bar */}
      {hasLoyaltyContent && (
        <div className="border-b bg-muted/40">
          <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2 font-medium" style={{ color: primaryColor }}>
              <Award className="h-4 w-4 shrink-0" />
              <span>{loyaltyTagline}</span>
            </div>
            {enabledPrograms.map((program, i) => (
              <div key={program.id} className="flex items-center gap-x-6 gap-y-2">
                {i === 0 && <div className="h-4 w-px bg-border hidden sm:block" />}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DiscountIcon icon={program.icon} className="h-4 w-4" />
                  <span>
                    <span className="font-medium text-foreground">{program.name}:</span>{' '}
                    {program.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Info Bar */}
      {hasDeliveryContent && (
        <div className="bg-muted/60 border-t border-b">
          <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-sm text-muted-foreground">
            {menuDisplay.deliveryMinimum !== undefined && (
              <span className="flex items-center gap-1.5">
                <span className="text-base">🚗</span>
                <strong className="text-foreground">Delivery</strong> — ${menuDisplay.deliveryMinimum} min
                {menuDisplay.deliveryFee !== undefined && ` · $${menuDisplay.deliveryFee} fee`}
                {menuDisplay.deliveryRadius !== undefined && ` · ${menuDisplay.deliveryRadius}-mi radius`}
              </span>
            )}
            {menuDisplay.deliveryMinimum !== undefined && menuDisplay.showDriveThru && (
              <span className="hidden sm:block text-border">|</span>
            )}
            {menuDisplay.showDriveThru && (
              <span className="flex items-center gap-1.5">
                <span className="text-base">🚗</span>
                <strong className="text-foreground">Drive-Thru</strong> — Open daily 9AM–10PM
              </span>
            )}
            <span className="hidden sm:block text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-base">🏪</span>
              <strong className="text-foreground">In-Store Pickup</strong> — Order ahead, skip the line
            </span>
          </div>
        </div>
      )}
    </>
  );
}
