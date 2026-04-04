'use client';

/**
 * DispensaryInfoPanel — Weedmaps-style dispensary identity bar.
 *
 * Shows above the hero carousel on dispensary menu pages.
 * Displays: open/closed status, today's hours, address + directions,
 * phone number, and service badges (Pickup / Delivery).
 */

import { MapPin, Phone, Clock, ShoppingBag, Truck, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface DispensaryInfoPanelProps {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  /** e.g. { monday: "9am-9pm", tuesday: "10am-8pm", ... } */
  hours?: Record<string, string>;
  primaryColor?: string;
  showDelivery?: boolean;
  deliveryMinimum?: number;
  showDriveThru?: boolean;
}

// ─── Hours helpers ────────────────────────────────────────────────────────────

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_ABBREVS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getTodayHours(hours: Record<string, string>): string | null {
  const dayIndex = new Date().getDay(); // 0 = Sunday
  const full = DAY_KEYS[dayIndex];
  const abbr = DAY_ABBREVS[dayIndex];
  return (
    hours[full] ??
    hours[full.charAt(0).toUpperCase() + full.slice(1)] ??
    hours[abbr] ??
    hours[abbr.toUpperCase()] ??
    null
  );
}

function parseMinutes(timeStr: string): number | null {
  const cleaned = timeStr.trim().toLowerCase().replace(/\s/g, '');
  const m = cleaned.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = m[2] ? parseInt(m[2]) : 0;
  if (m[3] === 'pm' && h !== 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return h * 60 + min;
}

function computeOpenStatus(hoursStr: string | null): { open: boolean; label: string } {
  if (!hoursStr) return { open: false, label: 'Hours unavailable' };
  if (/closed/i.test(hoursStr)) return { open: false, label: 'Closed today' };

  // Split on dash or en-dash, take first and last segments
  const parts = hoursStr.split(/\s*[-–]\s*/);
  if (parts.length < 2) return { open: false, label: hoursStr };

  const openMin = parseMinutes(parts[0]);
  const closeMin = parseMinutes(parts[parts.length - 1]);
  if (openMin === null || closeMin === null) return { open: false, label: hoursStr };

  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = cur >= openMin && cur < closeMin;

  // Format close time for "Closes at X"
  const closeH = Math.floor(closeMin / 60);
  const closeM = closeMin % 60;
  const closeLabel = `${closeH > 12 ? closeH - 12 : closeH || 12}${closeM ? `:${String(closeM).padStart(2, '0')}` : ''}${closeH >= 12 ? 'pm' : 'am'}`;

  return {
    open,
    label: open ? `Open · Closes ${closeLabel}` : `Closed · Opens ${parts[0]}`,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DispensaryInfoPanel({
  address,
  city,
  state,
  zip,
  phone,
  hours,
  primaryColor = '#16a34a',
  showDelivery = false,
  deliveryMinimum,
  showDriveThru = false,
}: DispensaryInfoPanelProps) {
  const todayHours = hours ? getTodayHours(hours) : null;
  const { open, label: openLabel } = computeOpenStatus(todayHours);

  const hasAddress = !!(address || city);
  const mapsQuery = [address, city, state, zip].filter(Boolean).join(', ');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  const displayAddress = address
    ? `${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${zip ? ` ${zip}` : ''}`
    : city
      ? `${city}${state ? `, ${state}` : ''}`
      : null;

  return (
    <div className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Badge
            className="shrink-0 font-semibold text-white border-0"
            style={{ backgroundColor: open ? primaryColor : '#6b7280' }}
          >
            {open ? 'Open Now' : 'Closed'}
          </Badge>

          {todayHours && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {openLabel}
            </span>
          )}

          {(hasAddress || phone) && todayHours && (
            <span className="hidden sm:block text-border select-none">|</span>
          )}

          {hasAddress && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[220px] sm:max-w-none">{displayAddress}</span>
              <Navigation className="h-3 w-3 shrink-0 opacity-60" />
            </a>
          )}

          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {phone}
            </a>
          )}

          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" style={{ color: primaryColor }} />
              Pickup
            </span>
            {showDelivery && (
              <span className="flex items-center gap-1 text-muted-foreground text-xs">
                <Truck className="h-3.5 w-3.5 shrink-0" style={{ color: primaryColor }} />
                Delivery{deliveryMinimum != null ? ` · $${deliveryMinimum} min` : ''}
              </span>
            )}
            {showDriveThru && (
              <span className="text-muted-foreground text-xs">🚗 Drive-Thru</span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
