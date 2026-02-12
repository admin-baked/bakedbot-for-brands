'use client';

/**
 * CRM Context Panel
 *
 * Right-side panel for crm_customer threads showing customer profile,
 * recent orders, communications, and quick prompts.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    ChevronDown,
    ChevronRight,
    DollarSign,
    ShoppingCart,
    CalendarDays,
    Mail,
    Phone,
    Star,
    MessageSquare,
    ExternalLink,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CrmPanelCustomer {
    id: string;
    displayName: string;
    email?: string;
    phone?: string;
    segment: string;
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

interface CrmPanelOrder {
    id: string;
    date: string;
    total: number;
    items: number;
    status: string;
}

interface CrmPanelComm {
    id: string;
    type: 'email' | 'sms';
    subject?: string;
    date: string;
    status: string;
}

const SEGMENT_COLORS: Record<string, string> = {
    vip: 'bg-purple-100 text-purple-800',
    loyal: 'bg-green-100 text-green-800',
    new: 'bg-blue-100 text-blue-800',
    at_risk: 'bg-red-100 text-red-800',
    slipping: 'bg-orange-100 text-orange-800',
    churned: 'bg-gray-100 text-gray-800',
    high_value: 'bg-yellow-100 text-yellow-800',
    frequent: 'bg-teal-100 text-teal-800',
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

const QUICK_PROMPTS = [
    { label: 'Draft win-back email', prompt: 'Draft a personalized win-back email for this customer based on their purchase history and preferences.' },
    { label: 'Show order history', prompt: 'Look up the full order history for this customer. Summarize patterns and favorite products.' },
    { label: 'Check engagement', prompt: 'Review all communications sent to this customer. Which messages got engagement? Suggest improvements.' },
    { label: 'Create VIP offer', prompt: 'Create a special offer for this customer based on their segment, spending level, and product preferences.' },
];

export function CrmContextPanel({
    customerId,
    customerEmail,
    orgId,
    onInsertPrompt,
    className,
}: {
    customerId: string;
    customerEmail?: string;
    orgId: string;
    onInsertPrompt?: (prompt: string) => void;
    className?: string;
}) {
    const [customer, setCustomer] = useState<CrmPanelCustomer | null>(null);
    const [orders, setOrders] = useState<CrmPanelOrder[]>([]);
    const [comms, setComms] = useState<CrmPanelComm[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        profile: true,
        orders: false,
        comms: false,
        prompts: true,
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Load customer data via server action
    const loadCustomer = useCallback(async () => {
        setLoading(true);
        try {
            const { lookupCustomerAction } = await import('@/server/actions/crm-panel');
            const result = await lookupCustomerAction(customerId || customerEmail || '', orgId);
            if (result?.customer) {
                setCustomer(result.customer as unknown as CrmPanelCustomer);
            }
        } catch {
            // Silently fail
        } finally {
            setLoading(false);
        }
    }, [customerId, customerEmail, orgId]);

    // Load orders lazily when section opens via server action
    const loadOrders = useCallback(async () => {
        if (orders.length > 0) return;
        try {
            const { getCustomerHistoryAction } = await import('@/server/actions/crm-panel');
            const result = await getCustomerHistoryAction(customerId, orgId, 5);
            if (result?.orders) {
                setOrders(result.orders as unknown as CrmPanelOrder[]);
            }
        } catch {
            // Silently fail
        }
    }, [customerId, orgId, orders.length]);

    // Load comms lazily when section opens via server action
    const loadComms = useCallback(async () => {
        if (comms.length > 0) return;
        try {
            const { getCustomerCommsAction } = await import('@/server/actions/crm-panel');
            const result = await getCustomerCommsAction(customerId, orgId, 5);
            if (result?.communications) {
                setComms(result.communications as unknown as CrmPanelComm[]);
            }
        } catch {
            // Silently fail
        }
    }, [customerId, orgId, comms.length]);

    useEffect(() => {
        loadCustomer();
    }, [loadCustomer]);

    useEffect(() => {
        if (expandedSections.orders) loadOrders();
    }, [expandedSections.orders, loadOrders]);

    useEffect(() => {
        if (expandedSections.comms) loadComms();
    }, [expandedSections.comms, loadComms]);

    if (loading) {
        return (
            <div className={cn('flex items-center justify-center h-full', className)}>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className={cn('p-4 text-sm text-muted-foreground', className)}>
                Customer not found.
            </div>
        );
    }

    const segmentColor = SEGMENT_COLORS[customer.segment] || 'bg-gray-100 text-gray-800';
    const segmentLabel = SEGMENT_LABELS[customer.segment] || customer.segment;

    return (
        <div className={cn('flex flex-col overflow-y-auto border-l bg-card', className)}>
            <div className="p-4 border-b">
                <h3 className="text-sm font-semibold">Customer Context</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Profile Section */}
                <CollapsibleSection
                    title="Profile"
                    expanded={expandedSections.profile}
                    onToggle={() => toggleSection('profile')}
                >
                    <div className="space-y-3">
                        {/* Name + Segment */}
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg font-semibold text-primary">
                                    {customer.displayName[0]?.toUpperCase() || '?'}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{customer.displayName}</p>
                                <div className="flex items-center gap-1.5">
                                    <Badge className={cn('text-[10px]', segmentColor)}>{segmentLabel}</Badge>
                                    {customer.tier && (
                                        <Badge variant="outline" className="text-[10px]">{customer.tier}</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="space-y-1 text-xs text-muted-foreground">
                            {customer.email && (
                                <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{customer.email}</p>
                            )}
                            {customer.phone && (
                                <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{customer.phone}</p>
                            )}
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-2">
                            <MiniMetric
                                icon={<DollarSign className="h-3 w-3" />}
                                label="LTV"
                                value={`$${Number(customer.totalSpent ?? 0).toLocaleString()}`}
                            />
                            <MiniMetric
                                icon={<ShoppingCart className="h-3 w-3" />}
                                label="Orders"
                                value={String(customer.orderCount ?? 0)}
                            />
                            <MiniMetric
                                icon={<DollarSign className="h-3 w-3" />}
                                label="AOV"
                                value={`$${Number(customer.avgOrderValue ?? 0).toFixed(2)}`}
                            />
                            <MiniMetric
                                icon={<CalendarDays className="h-3 w-3" />}
                                label="Last Visit"
                                value={customer.lastOrderDate || 'Never'}
                            />
                        </div>

                        {/* Points + Inactive */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {customer.points !== undefined && customer.points > 0 && (
                                <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    {customer.points.toLocaleString()} pts
                                </span>
                            )}
                            {customer.daysSinceLastOrder !== undefined && customer.daysSinceLastOrder > 0 && (
                                <span className={cn(
                                    customer.daysSinceLastOrder > 60 ? 'text-red-500' :
                                    customer.daysSinceLastOrder > 30 ? 'text-orange-500' : ''
                                )}>
                                    {customer.daysSinceLastOrder}d inactive
                                </span>
                            )}
                        </div>

                        {/* Tags */}
                        {customer.customTags && customer.customTags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {customer.customTags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* View Profile Link */}
                        <a
                            href={`/dashboard/customers/${customer.id}`}
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                            View Full Profile <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </CollapsibleSection>

                {/* Recent Orders */}
                <CollapsibleSection
                    title="Recent Orders"
                    expanded={expandedSections.orders}
                    onToggle={() => toggleSection('orders')}
                >
                    {orders.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No orders found.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {orders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50">
                                    <div>
                                        <p className="font-medium">${Number(order.total).toFixed(2)}</p>
                                        <p className="text-muted-foreground">{order.items} items</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-muted-foreground">{order.date}</p>
                                        <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CollapsibleSection>

                {/* Communications */}
                <CollapsibleSection
                    title="Communications"
                    expanded={expandedSections.comms}
                    onToggle={() => toggleSection('comms')}
                >
                    {comms.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No communications found.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {comms.map((comm) => (
                                <div key={comm.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50">
                                    <div className="flex items-center gap-1.5">
                                        {comm.type === 'email' ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                                        <span className="truncate max-w-[140px]">{comm.subject || comm.type.toUpperCase()}</span>
                                    </div>
                                    <span className="text-muted-foreground flex-shrink-0">{comm.date}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CollapsibleSection>

                {/* Quick Prompts */}
                <CollapsibleSection
                    title="Quick Prompts"
                    expanded={expandedSections.prompts}
                    onToggle={() => toggleSection('prompts')}
                >
                    <div className="space-y-1">
                        {QUICK_PROMPTS.map((qp) => (
                            <Button
                                key={qp.label}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-7 px-2"
                                onClick={() => onInsertPrompt?.(qp.prompt)}
                            >
                                {qp.label}
                            </Button>
                        ))}
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
}

function CollapsibleSection({
    title,
    expanded,
    onToggle,
    children,
}: {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <Card className="shadow-none">
            <CardHeader
                className="p-2 cursor-pointer hover:bg-muted/50 rounded-t-lg"
                onClick={onToggle}
            >
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                    {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {title}
                </CardTitle>
            </CardHeader>
            {expanded && (
                <CardContent className="p-2 pt-0">
                    {children}
                </CardContent>
            )}
        </Card>
    );
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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
