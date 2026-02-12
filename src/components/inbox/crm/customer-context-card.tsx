'use client';

/**
 * CustomerContextCard
 *
 * Compact inline card for rendering customer data within chat bubbles.
 * Parses CRM markers from agent responses: :::crm:customer:Name\n{json}\n:::
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    DollarSign,
    ShoppingCart,
    CalendarDays,
    ExternalLink,
    Star,
} from 'lucide-react';

interface CrmCustomerData {
    id?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    segment?: string;
    tier?: string;
    points?: number;
    totalSpent?: number;
    orderCount?: number;
    avgOrderValue?: number;
    lastOrderDate?: string;
    daysSinceLastOrder?: number;
    customTags?: string[];
    notes?: string;
}

const SEGMENT_COLORS: Record<string, string> = {
    vip: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    loyal: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    at_risk: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    slipping: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    churned: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    high_value: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    frequent: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
};

const SEGMENT_LABELS: Record<string, string> = {
    vip: 'VIP',
    loyal: 'Loyal',
    new: 'New',
    at_risk: 'At Risk',
    slipping: 'Slipping',
    churned: 'Churned',
    high_value: 'High Value',
    frequent: 'Frequent',
};

export function CustomerContextCard({
    customer,
    compact = false,
}: {
    customer: CrmCustomerData;
    compact?: boolean;
}) {
    const segmentColor = SEGMENT_COLORS[customer.segment || ''] || 'bg-gray-100 text-gray-800';
    const segmentLabel = SEGMENT_LABELS[customer.segment || ''] || customer.segment || 'Unknown';

    return (
        <div className="rounded-lg border bg-card p-3 my-2 shadow-sm">
            {/* Header: Name + Segment Badge */}
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                            {(customer.displayName || '?')[0].toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{customer.displayName || 'Unknown'}</p>
                        {customer.email && (
                            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                        )}
                    </div>
                </div>
                <Badge variant="secondary" className={cn('text-xs flex-shrink-0', segmentColor)}>
                    {segmentLabel}
                </Badge>
            </div>

            {/* Metrics Grid */}
            <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-4')}>
                <MetricCell
                    icon={<DollarSign className="h-3 w-3" />}
                    label="LTV"
                    value={`$${Number(customer.totalSpent ?? 0).toLocaleString()}`}
                />
                <MetricCell
                    icon={<ShoppingCart className="h-3 w-3" />}
                    label="Orders"
                    value={String(customer.orderCount ?? 0)}
                />
                <MetricCell
                    icon={<DollarSign className="h-3 w-3" />}
                    label="AOV"
                    value={`$${Number(customer.avgOrderValue ?? 0).toFixed(2)}`}
                />
                <MetricCell
                    icon={<CalendarDays className="h-3 w-3" />}
                    label="Last Visit"
                    value={customer.lastOrderDate || 'Never'}
                />
            </div>

            {/* Tier + Points Row */}
            {(customer.tier || customer.points !== undefined) && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t">
                    {customer.tier && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3" />
                            <span>{customer.tier}</span>
                        </div>
                    )}
                    {customer.points !== undefined && (
                        <span className="text-xs text-muted-foreground">
                            {Number(customer.points).toLocaleString()} pts
                        </span>
                    )}
                    {customer.daysSinceLastOrder !== undefined && customer.daysSinceLastOrder > 0 && (
                        <span className={cn(
                            'text-xs',
                            customer.daysSinceLastOrder > 60 ? 'text-red-500' :
                            customer.daysSinceLastOrder > 30 ? 'text-orange-500' :
                            'text-muted-foreground'
                        )}>
                            {customer.daysSinceLastOrder}d inactive
                        </span>
                    )}
                </div>
            )}

            {/* Tags */}
            {customer.customTags && customer.customTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {customer.customTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                            {tag}
                        </Badge>
                    ))}
                </div>
            )}

            {/* View Profile Link */}
            {customer.id && (
                <div className="mt-2 pt-2 border-t">
                    <a
                        href={`/dashboard/customers/${customer.id}`}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                        View Profile <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            )}
        </div>
    );
}

function MetricCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-md bg-muted/50 p-1.5 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                {icon}
                <span className="text-[10px] uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-xs font-medium truncate">{value}</p>
        </div>
    );
}

/**
 * Parse CRM customer markers from message content.
 * Pattern: :::crm:customer:Name\n{json}\n:::
 */
export const CRM_CUSTOMER_PATTERN = /:::crm:customer:([^\n]+)\n([\s\S]*?):::/g;

export function parseCrmCustomers(content: string): { customers: CrmCustomerData[]; cleanedContent: string } {
    const customers: CrmCustomerData[] = [];
    const cleanedContent = content.replace(CRM_CUSTOMER_PATTERN, (_match, _name, jsonStr) => {
        try {
            const data = JSON.parse(jsonStr.trim());
            customers.push(data);
        } catch {
            // Invalid JSON, skip
        }
        return ''; // Remove marker from displayed text
    });

    return { customers, cleanedContent: cleanedContent.trim() };
}
