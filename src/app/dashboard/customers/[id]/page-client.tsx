'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Bot,
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    DollarSign,
    Loader2,
    Mail,
    MessageSquare,
    Phone,
    Plus,
    Save,
    ShoppingBag,
    Sparkles,
    Star,
    Tag,
    TrendingUp,
    X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
    buildAutoCustomerTags,
    mergeCustomerTags,
    resolveCustomerDisplayName,
} from '@/lib/customers/profile-derivations';
import {
    buildLifecycleMessagePreview,
    inferLifecyclePlaybookKind,
    type LifecyclePlaybookKind,
} from '@/lib/customers/lifecycle-playbooks';
import { calculateSegment, getSegmentInfo, type CustomerProfile, type CustomerSegment } from '@/types/customers';
import { CustomerChatDialog } from '../components/customer-chat-dialog';
import { CustomerMessageSandboxDialog } from '../components/customer-message-sandbox-dialog';
import { launchLifecyclePlaybook } from '../actions';
import {
    getCustomerDetail,
    getCustomerOrders,
    updateCustomerNotes,
    updateCustomerTags,
    type CustomerDetailData,
    type CustomerOrder,
    type CustomerOrderData,
} from './actions';

interface CustomerDetailProps {
    customerId: string;
    orgId: string;
}

function deriveTier(totalSpent: number): CustomerProfile['tier'] {
    if (totalSpent > 2000) return 'gold';
    if (totalSpent > 500) return 'silver';
    return 'bronze';
}

function getOrderSourceLabel(source: CustomerOrderData['source']): string {
    if (source === 'customer_endpoint') return 'Loaded from customer endpoint';
    if (source === 'all_orders_cache') return 'Loaded from cached order snapshot';
    if (source === 'all_orders_live') return 'Loaded from fresh all-orders fallback';
    return 'No connected POS client available';
}

function getPlaybookStatusLabel(status: 'missing' | 'paused' | 'active'): string {
    if (status === 'active') return 'Active';
    if (status === 'paused') return 'Ready';
    return 'Missing';
}

function applyOrderInsights(customer: CustomerProfile, result: CustomerOrderData): CustomerProfile {
    const autoTags = buildAutoCustomerTags({
        segment: customer.segment,
        tier: customer.tier,
        priceRange: customer.priceRange,
        orderCount: customer.orderCount,
        totalSpent: customer.totalSpent,
        daysSinceLastOrder: customer.daysSinceLastOrder,
        preferredCategories: result.preferences.categories,
        preferredProducts: result.preferences.products,
    });

    return {
        ...customer,
        preferredCategories: result.preferences.categories,
        preferredProducts: result.preferences.products,
        autoTags,
        allTags: mergeCustomerTags(customer.customTags, autoTags),
    };
}

function applySpendingSnapshot(
    customer: CustomerProfile,
    spending: {
        totalSpent: number;
        orderCount: number;
        avgOrderValue: number;
        lastOrderDate: string | null;
        firstOrderDate: string | null;
    },
): CustomerProfile {
    const lastOrderDate = spending.lastOrderDate ? new Date(spending.lastOrderDate) : customer.lastOrderDate;
    const firstOrderDate = spending.firstOrderDate ? new Date(spending.firstOrderDate) : customer.firstOrderDate;
    const daysSinceLastOrder = lastOrderDate
        ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
        : customer.daysSinceLastOrder;
    const totalSpent = spending.totalSpent;
    const orderCount = spending.orderCount;
    const avgOrderValue = spending.avgOrderValue;
    const segment = calculateSegment({
        ...customer,
        totalSpent,
        orderCount,
        avgOrderValue,
        lifetimeValue: totalSpent,
        lastOrderDate,
        firstOrderDate,
        daysSinceLastOrder,
    });
    const tier = deriveTier(totalSpent);
    const autoTags = buildAutoCustomerTags({
        segment,
        tier,
        priceRange: customer.priceRange,
        orderCount,
        totalSpent,
        daysSinceLastOrder,
        preferredCategories: customer.preferredCategories,
        preferredProducts: customer.preferredProducts,
    });

    return {
        ...customer,
        totalSpent,
        orderCount,
        avgOrderValue,
        lifetimeValue: totalSpent,
        lastOrderDate,
        firstOrderDate,
        daysSinceLastOrder,
        segment,
        tier,
        points: Math.floor(totalSpent),
        autoTags,
        allTags: mergeCustomerTags(customer.customTags, autoTags),
    };
}

function resolveUpcomingMessagePreview(
    customer: CustomerProfile,
    orgName: string,
    upcoming: CustomerDetailData['upcoming'][number] | null | undefined,
): string | null {
    if (!upcoming) {
        return null;
    }

    if (upcoming.preview) {
        return upcoming.preview;
    }

    const inferredKind = inferLifecyclePlaybookKind({
        segment: customer.segment,
        playbookId: upcoming.playbookId ?? null,
        subject: upcoming.subject ?? null,
        metadata: upcoming.metadata ?? null,
    });

    if (!inferredKind) {
        return null;
    }

    const preview = buildLifecycleMessagePreview({
        playbookKind: inferredKind,
        customer,
        orgName,
    });

    return upcoming.channel === 'sms' ? preview.smsBody : preview.emailPreview;
}

export default function CustomerDetailClient({ customerId, orgId }: CustomerDetailProps) {
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [customerData, setCustomerData] = useState<CustomerDetailData | null>(null);
    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersLoaded, setOrdersLoaded] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [notesEdited, setNotesEdited] = useState(false);
    const [notesSaving, setNotesSaving] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [tagsSaving, setTagsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [spendingEnriched, setSpendingEnriched] = useState(false);
    const [chatDialogOpen, setChatDialogOpen] = useState(false);
    const [sandboxOpen, setSandboxOpen] = useState(false);
    const [sandboxPlaybookKind, setSandboxPlaybookKind] = useState<LifecyclePlaybookKind>('welcome');
    const [orderMeta, setOrderMeta] = useState<{ source: CustomerOrderData['source'] } | null>(null);
    const [launchingPlaybook, setLaunchingPlaybook] = useState<LifecyclePlaybookKind | null>(null);

    const loadOrders = useCallback(async () => {
        if (ordersLoading || ordersLoaded) {
            return;
        }

        setOrdersLoading(true);
        try {
            const result = await getCustomerOrders(customerId);
            setOrders(result.orders);
            setOrderMeta({ source: result.source });
            setCustomerData((current) => {
                if (!current?.customer) {
                    return current;
                }

                return {
                    ...current,
                    customer: applyOrderInsights(current.customer, result),
                };
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Orders unavailable',
                description: error instanceof Error ? error.message : 'Failed to load customer orders.',
            });
        } finally {
            setOrdersLoading(false);
            setOrdersLoaded(true);
        }
    }, [customerId, ordersLoaded, ordersLoading, toast]);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const data = await getCustomerDetail(customerId);
                setCustomerData(data);
                setNotes(data.customer?.notes || '');
                setTags(data.customer?.customTags || []);
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error instanceof Error ? error.message : 'Failed to load customer.',
                });
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [customerId, toast]);

    useEffect(() => {
        if (customerData?.customer && !ordersLoaded && !ordersLoading) {
            loadOrders();
        }
    }, [customerData?.customer, loadOrders, ordersLoaded, ordersLoading]);

    useEffect(() => {
        if (!customerData?.customer || customerData.spending || spendingEnriched) {
            return;
        }

        async function fetchSpending() {
            try {
                const response = await fetch(`/api/customers/spending?orgId=${encodeURIComponent(orgId)}`);
                if (!response.ok) {
                    return;
                }

                const json = await response.json();
                if (!json.success || !json.spending || !json.spending[customerId]) {
                    return;
                }

                const spending = json.spending[customerId];
                setCustomerData((current) => {
                    if (!current?.customer) {
                        return current;
                    }

                    return {
                        ...current,
                        spending,
                        customer: applySpendingSnapshot(current.customer, spending),
                    };
                });
            } catch {
                // Keep the existing customer detail state if enrichment fails.
            } finally {
                setSpendingEnriched(true);
            }
        }

        fetchSpending();
    }, [customerData?.customer, customerData?.spending, customerId, orgId, spendingEnriched]);

    const handleSaveNotes = async () => {
        setNotesSaving(true);
        try {
            await updateCustomerNotes(customerId, notes);
            setNotesEdited(false);
            setCustomerData((current) => current?.customer ? {
                ...current,
                customer: {
                    ...current.customer,
                    notes,
                },
            } : current);
            toast({ title: 'Saved', description: 'CRM notes updated.' });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to save notes.',
            });
        } finally {
            setNotesSaving(false);
        }
    };

    const handleAddTag = async () => {
        const trimmed = newTag.trim();
        if (!trimmed || tags.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) {
            return;
        }

        const updatedTags = [...tags, trimmed];
        setTags(updatedTags);
        setNewTag('');
        setTagsSaving(true);
        try {
            await updateCustomerTags(customerId, updatedTags);
            setCustomerData((current) => current?.customer ? {
                ...current,
                customer: {
                    ...current.customer,
                    customTags: updatedTags,
                    allTags: mergeCustomerTags(updatedTags, current.customer.autoTags),
                },
            } : current);
        } catch (error) {
            setTags(tags);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to save tag.',
            });
        } finally {
            setTagsSaving(false);
        }
    };

    const handleRemoveTag = async (tag: string) => {
        const updatedTags = tags.filter((existing) => existing !== tag);
        setTags(updatedTags);
        setTagsSaving(true);
        try {
            await updateCustomerTags(customerId, updatedTags);
            setCustomerData((current) => current?.customer ? {
                ...current,
                customer: {
                    ...current.customer,
                    customTags: updatedTags,
                    allTags: mergeCustomerTags(updatedTags, current.customer.autoTags),
                },
            } : current);
        } catch (error) {
            setTags(tags);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to remove tag.',
            });
        } finally {
            setTagsSaving(false);
        }
    };

    const openSandbox = (kind: LifecyclePlaybookKind) => {
        setSandboxPlaybookKind(kind);
        setSandboxOpen(true);
    };

    const refreshCustomerDetail = useCallback(async () => {
        const data = await getCustomerDetail(customerId);
        setCustomerData(data);
        setNotes(data.customer?.notes || '');
        setTags(data.customer?.customTags || []);
    }, [customerId]);

    const handlePlaybookAction = async (kind: LifecyclePlaybookKind, status: 'missing' | 'paused' | 'active') => {
        if (status === 'active') {
            router.push('/dashboard/playbooks');
            return;
        }

        setLaunchingPlaybook(kind);
        try {
            const result = await launchLifecyclePlaybook(kind, orgId);
            if (!result.success) {
                toast({
                    variant: 'destructive',
                    title: 'Playbook launch failed',
                    description: result.error || 'Could not activate this lifecycle playbook.',
                });
                return;
            }

            await refreshCustomerDetail();
            toast({
                title: 'Playbook active',
                description: 'Lifecycle automation is active for this organization.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Playbook launch failed',
                description: error instanceof Error ? error.message : 'Could not activate this lifecycle playbook.',
            });
        } finally {
            setLaunchingPlaybook(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const customer = customerData?.customer;
    if (!customer || !customerData) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => router.push('/dashboard/customers')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
                </Button>
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        Customer not found.
                    </CardContent>
                </Card>
            </div>
        );
    }

    const segInfo = getSegmentInfo(customer.segment as CustomerSegment);
    const upcomingMessage = customerData.upcoming[0] ?? null;
    const nextSuggestedPlaybook = customerData.playbooks.find((playbook) => playbook.appliesNow && playbook.assignmentStatus !== 'missing') ?? null;
    const nextSuggestedPreview = nextSuggestedPlaybook ? buildLifecycleMessagePreview({
        playbookKind: nextSuggestedPlaybook.playbookKind,
        customer,
        orgName: customerData.orgName,
    }) : null;
    const upcomingPreview = resolveUpcomingMessagePreview(customer, customerData.orgName, upcomingMessage);
    const autoTags = customer.autoTags ?? [];
    const hasPreferences = customer.preferredCategories.length > 0 || customer.preferredProducts.length > 0;
    const customerName = resolveCustomerDisplayName({
        displayName: customer.displayName,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        fallbackId: customer.id,
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/customers')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button variant="outline" size="sm" onClick={() => setChatDialogOpen(true)}>
                    <Bot className="mr-2 h-4 w-4" /> Chat About Customer
                </Button>
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{customerName}</h1>
                        <Badge className={segInfo.color}>{segInfo.label}</Badge>
                        <Badge variant="outline" className="capitalize">{customer.tier}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {customer.email && (
                            <span className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" /> {customer.email}
                            </span>
                        )}
                        {customer.phone && (
                            <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" /> {customer.phone}
                            </span>
                        )}
                        {customer.birthDate && (
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" /> Birthday: {customer.birthDate}
                            </span>
                        )}
                        {customer.points > 0 && (
                            <span className="flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 text-yellow-500" /> {customer.points} pts
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${customer.lifetimeValue.toFixed(0)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customer.orderCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Order</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${customer.avgOrderValue.toFixed(0)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last Order</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" suppressHydrationWarning>
                            {customer.lastOrderDate ? `${customer.daysSinceLastOrder ?? '?'}d ago` : 'N/A'}
                        </div>
                        {customer.lastOrderDate && (
                            <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                                {new Date(customer.lastOrderDate).toLocaleDateString()}
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Price Range</CardTitle>
                        <Tag className="h-4 w-4 text-teal-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{customer.priceRange}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                    <TabsTrigger value="communications">Communications</TabsTrigger>
                    <TabsTrigger value="notes">Notes & Tags</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Preferences</CardTitle>
                                <CardDescription>AI-inferred from purchase history</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {ordersLoading && !ordersLoaded ? (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading purchase preferences...
                                    </div>
                                ) : hasPreferences ? (
                                    <>
                                        {customer.preferredCategories.length > 0 && (
                                            <div>
                                                <div className="mb-1 text-sm font-medium">Preferred Categories</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {customer.preferredCategories.map((category) => (
                                                        <Badge key={category} variant="secondary">{category}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {customer.preferredProducts.length > 0 && (
                                            <div>
                                                <div className="mb-1 text-sm font-medium">Top Products</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {customer.preferredProducts.slice(0, 5).map((product) => (
                                                        <Badge key={product} variant="outline">{product}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No purchase preferences available yet.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Loyalty</CardTitle>
                                <CardDescription>Points and tier status</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Points Balance</span>
                                    <span className="font-medium">{customer.points}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Tier</span>
                                    <Badge variant="outline" className="capitalize">{customer.tier}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Segment</span>
                                    <Badge className={segInfo.color}>{segInfo.label}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Source</span>
                                    <span className="text-sm capitalize">{customer.source.replace(/_/g, ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Customer Since</span>
                                    <span className="text-sm" suppressHydrationWarning>
                                        {new Date(customer.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{upcomingMessage ? 'Next Message' : nextSuggestedPlaybook ? 'Next Suggested Message' : 'Next Message'}</CardTitle>
                                <CardDescription>Upcoming outreach based on scheduling and lifecycle context</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {upcomingMessage ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{(upcomingMessage.channel || 'email').toUpperCase()}</Badge>
                                            <span className="text-sm text-muted-foreground" suppressHydrationWarning>
                                                {new Date(upcomingMessage.scheduledFor).toLocaleString()}
                                            </span>
                                        </div>
                                        {upcomingMessage.subject && (
                                            <div className="font-medium">{upcomingMessage.subject}</div>
                                        )}
                                        {upcomingPreview && (
                                            <p className="text-sm text-muted-foreground">{upcomingPreview}</p>
                                        )}
                                    </>
                                ) : nextSuggestedPlaybook && nextSuggestedPreview ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{nextSuggestedPlaybook.name}</Badge>
                                            <Badge variant="outline">Suggested</Badge>
                                        </div>
                                        <div className="font-medium">{nextSuggestedPreview.emailSubject}</div>
                                        <p className="text-sm text-muted-foreground">{nextSuggestedPreview.emailPreview}</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No upcoming customer message is scheduled yet.</p>
                                )}
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openSandbox(
                                            inferLifecyclePlaybookKind({
                                                segment: customer.segment,
                                                playbookId: upcomingMessage?.playbookId ?? null,
                                                subject: upcomingMessage?.subject ?? null,
                                                metadata: upcomingMessage?.metadata ?? null,
                                            }) ?? nextSuggestedPlaybook?.playbookKind ?? 'welcome'
                                        )}
                                    >
                                        <Sparkles className="mr-2 h-4 w-4" /> Preview in Sandbox
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setActiveTab('communications')}>
                                        Open Communications
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Playbooks</CardTitle>
                                <CardDescription>Recurring lifecycle automation for this customer</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {customerData.playbooks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No lifecycle playbooks are configured yet.</p>
                                ) : customerData.playbooks.map((playbook) => (
                                    <div key={playbook.playbookKind} className="rounded-lg border p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium">{playbook.name}</span>
                                                    <Badge variant={playbook.assignmentStatus === 'active' ? 'default' : 'secondary'}>
                                                        {getPlaybookStatusLabel(playbook.assignmentStatus)}
                                                    </Badge>
                                                    {playbook.appliesNow && (
                                                        <Badge variant="outline">Applies Now</Badge>
                                                    )}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground">{playbook.description}</div>
                                                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                                    <div>
                                                        Last sent: {playbook.lastCommunicationAt ? new Date(playbook.lastCommunicationAt).toLocaleString() : 'Not yet'}
                                                    </div>
                                                    <div>
                                                        Next scheduled: {playbook.nextScheduledAt ? new Date(playbook.nextScheduledAt).toLocaleString() : 'Not scheduled'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePlaybookAction(playbook.playbookKind, playbook.assignmentStatus)}
                                                    disabled={launchingPlaybook === playbook.playbookKind}
                                                >
                                                    {launchingPlaybook === playbook.playbookKind && (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    )}
                                                    {playbook.assignmentStatus === 'active'
                                                        ? 'View'
                                                        : playbook.assignmentStatus === 'paused'
                                                            ? 'Activate'
                                                            : 'Create'}
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => openSandbox(playbook.playbookKind)}>
                                                    Sandbox
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="orders" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Order History</CardTitle>
                            <CardDescription>
                                {ordersLoaded ? `${orders.length} orders found` : 'Loading order history...'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {orderMeta && (
                                <p className="text-sm text-muted-foreground">{getOrderSourceLabel(orderMeta.source)}</p>
                            )}

                            {ordersLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin text-muted-foreground" />
                                    <span className="text-muted-foreground">Loading orders from Alleaves...</span>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground">
                                    No orders found for this customer.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8"></TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Order #</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Payment</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order) => (
                                            <Fragment key={order.id}>
                                                <TableRow
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                                >
                                                    <TableCell>
                                                        {expandedOrder === order.id
                                                            ? <ChevronDown className="h-4 w-4" />
                                                            : <ChevronRight className="h-4 w-4" />}
                                                    </TableCell>
                                                    <TableCell suppressHydrationWarning>
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">{order.orderNumber || order.id}</TableCell>
                                                    <TableCell>{order.items.length} items</TableCell>
                                                    <TableCell className="font-medium">${order.total.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={order.status === 'completed' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                                            {order.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="capitalize">{order.paymentMethod}</TableCell>
                                                </TableRow>
                                                {expandedOrder === order.id && (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="bg-muted/30">
                                                            <div className="px-4 py-2">
                                                                <div className="mb-2 text-sm font-medium">Line Items</div>
                                                                <table className="w-full text-sm">
                                                                    <thead>
                                                                        <tr className="text-muted-foreground">
                                                                            <th className="py-1 text-left">Product</th>
                                                                            <th className="py-1 text-left">Category</th>
                                                                            <th className="py-1 text-right">Qty</th>
                                                                            <th className="py-1 text-right">Price</th>
                                                                            <th className="py-1 text-right">Total</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {order.items.map((item, index) => (
                                                                            <tr key={`${order.id}-${index}`}>
                                                                                <td className="py-1">{item.name}</td>
                                                                                <td className="py-1 text-muted-foreground">{item.category || '—'}</td>
                                                                                <td className="py-1 text-right">{item.quantity || 0}</td>
                                                                                <td className="py-1 text-right">${(item.price || 0).toFixed(2)}</td>
                                                                                <td className="py-1 text-right">${(item.total || 0).toFixed(2)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                                <div className="mt-2 flex justify-end gap-4 border-t pt-2 text-sm">
                                                                    <span>Subtotal: ${order.subtotal.toFixed(2)}</span>
                                                                    <span>Tax: ${order.tax.toFixed(2)}</span>
                                                                    {order.discount > 0 && (
                                                                        <span className="text-green-600">Discount: -${order.discount.toFixed(2)}</span>
                                                                    )}
                                                                    <span className="font-bold">Total: ${order.total.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="communications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Scheduled</CardTitle>
                            <CardDescription>Upcoming email and SMS messages for this customer</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {customerData.upcoming.length === 0 ? (
                                <div className="py-6 text-sm text-muted-foreground">No communications yet</div>
                            ) : (
                                <div className="space-y-3">
                                    {customerData.upcoming.map((communication) => {
                                        const preview = resolveUpcomingMessagePreview(customer, customerData.orgName, communication);
                                        return (
                                            <div key={communication.id} className="rounded-lg border p-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="secondary">{(communication.channel || 'email').toUpperCase()}</Badge>
                                                    <span className="text-sm text-muted-foreground" suppressHydrationWarning>
                                                        {new Date(communication.scheduledFor).toLocaleString()}
                                                    </span>
                                                </div>
                                                {communication.subject && (
                                                    <div className="mt-2 font-medium">{communication.subject}</div>
                                                )}
                                                {preview && (
                                                    <p className="mt-1 text-sm text-muted-foreground">{preview}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">History</CardTitle>
                            <CardDescription>Recent outbound email and SMS activity</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {customerData.communications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                                    <MessageSquare className="mb-3 h-10 w-10 opacity-30" />
                                    <p className="text-lg font-medium">No communications yet</p>
                                    <p className="text-sm">
                                        We have not recorded outbound email or SMS activity for this customer yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {customerData.communications.map((communication) => (
                                        <div key={communication.id} className="rounded-lg border p-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary">{communication.channel.toUpperCase()}</Badge>
                                                <Badge variant="outline">{communication.type}</Badge>
                                                <span className="text-sm text-muted-foreground" suppressHydrationWarning>
                                                    {new Date(communication.sentAt || communication.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            {communication.subject && (
                                                <div className="mt-2 font-medium">{communication.subject}</div>
                                            )}
                                            {communication.preview && (
                                                <p className="mt-1 text-sm text-muted-foreground">{communication.preview}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notes" forceMount className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">CRM Notes</CardTitle>
                                    <CardDescription>Add context about this customer</CardDescription>
                                </div>
                                {notesEdited && (
                                    <Button size="sm" onClick={handleSaveNotes} disabled={notesSaving}>
                                        {notesSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                                        Save
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Add notes about this customer..."
                                value={notes}
                                onChange={(event) => {
                                    setNotes(event.target.value);
                                    setNotesEdited(true);
                                }}
                                rows={6}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Auto Tags</CardTitle>
                            <CardDescription>Behavior and lifecycle tags generated from CRM data</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {autoTags.length > 0 ? autoTags.map((tag) => (
                                    <Badge key={tag} variant="secondary">{tag}</Badge>
                                )) : (
                                    <span className="text-sm text-muted-foreground">No auto tags yet</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Manual Tags</CardTitle>
                            <CardDescription>Organize and categorize customers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="gap-1 text-sm">
                                        {tag}
                                        <button
                                            onClick={() => handleRemoveTag(tag)}
                                            className="ml-1 hover:text-destructive"
                                            disabled={tagsSaving}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                                {tags.length === 0 && (
                                    <span className="text-sm text-muted-foreground">No manual tags yet</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add tag..."
                                    value={newTag}
                                    onChange={(event) => setNewTag(event.target.value)}
                                    onKeyDown={(event) => event.key === 'Enter' && handleAddTag()}
                                    className="max-w-md"
                                />
                                <Button size="sm" onClick={handleAddTag} disabled={tagsSaving || !newTag.trim()}>
                                    <Plus className="mr-1 h-4 w-4" /> Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <CustomerChatDialog
                open={chatDialogOpen}
                onOpenChange={setChatDialogOpen}
                customer={customer}
            />
            <CustomerMessageSandboxDialog
                open={sandboxOpen}
                onOpenChange={setSandboxOpen}
                customer={customer}
                orgName={customerData.orgName}
                defaultPlaybookKind={sandboxPlaybookKind}
            />
        </div>
    );
}
