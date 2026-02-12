'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft, Loader2, Mail, Phone, Calendar, ShoppingBag,
    DollarSign, TrendingUp, Clock, Tag, MessageSquare,
    ChevronDown, ChevronRight, Plus, X, Save, Star, Bot,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSegmentInfo, type CustomerSegment } from '@/types/customers';
import {
    getCustomerDetail,
    getCustomerOrders,
    updateCustomerNotes,
    updateCustomerTags,
    type CustomerDetailData,
    type CustomerOrder,
} from './actions';

interface CustomerDetailProps {
    customerId: string;
    orgId: string;
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

    // Also fetch spending data from API for enrichment
    const [spendingEnriched, setSpendingEnriched] = useState(false);

    // Load customer detail
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const data = await getCustomerDetail(customerId);
                setCustomerData(data);
                setNotes(data.customer?.notes || '');
                setTags(data.customer?.customTags || []);
            } catch (err) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load customer' });
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [customerId, toast]);

    // If spending not in cache, fetch it
    useEffect(() => {
        if (!customerData?.customer || customerData.spending || spendingEnriched) return;

        async function fetchSpending() {
            try {
                const res = await fetch(`/api/customers/spending?orgId=${encodeURIComponent(orgId)}`);
                if (!res.ok) return;
                const json = await res.json();
                if (json.success && json.spending && json.spending[customerId]) {
                    const s = json.spending[customerId];
                    setCustomerData(prev => {
                        if (!prev?.customer) return prev;
                        const c = { ...prev.customer };
                        c.totalSpent = s.totalSpent;
                        c.orderCount = s.orderCount;
                        c.avgOrderValue = s.avgOrderValue;
                        c.lifetimeValue = s.totalSpent;
                        if (s.lastOrderDate) c.lastOrderDate = new Date(s.lastOrderDate);
                        if (s.firstOrderDate) c.firstOrderDate = new Date(s.firstOrderDate);
                        if (c.lastOrderDate) {
                            c.daysSinceLastOrder = Math.floor(
                                (Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
                            );
                        }
                        c.tier = c.totalSpent > 2000 ? 'gold' : c.totalSpent > 500 ? 'silver' : 'bronze';
                        return { customer: c, spending: s };
                    });
                }
            } catch { /* silently fail */ }
            setSpendingEnriched(true);
        }
        fetchSpending();
    }, [customerData, customerId, orgId, spendingEnriched]);

    // Load orders when Orders tab is selected
    const loadOrders = useCallback(async () => {
        if (ordersLoaded || ordersLoading) return;
        setOrdersLoading(true);
        try {
            const result = await getCustomerOrders(customerId);
            setOrders(result);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load orders' });
        } finally {
            setOrdersLoading(false);
            setOrdersLoaded(true);
        }
    }, [customerId, ordersLoaded, ordersLoading, toast]);

    useEffect(() => {
        if (activeTab === 'orders' && !ordersLoaded) {
            loadOrders();
        }
    }, [activeTab, ordersLoaded, loadOrders]);

    const handleSaveNotes = async () => {
        setNotesSaving(true);
        try {
            await updateCustomerNotes(customerId, notes);
            setNotesEdited(false);
            toast({ title: 'Saved', description: 'Notes updated' });
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save notes' });
        } finally {
            setNotesSaving(false);
        }
    };

    const handleAddTag = async () => {
        if (!newTag.trim() || tags.includes(newTag.trim())) return;
        const updatedTags = [...tags, newTag.trim()];
        setTags(updatedTags);
        setNewTag('');
        setTagsSaving(true);
        try {
            await updateCustomerTags(customerId, updatedTags);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save tag' });
            setTags(tags); // revert
        } finally {
            setTagsSaving(false);
        }
    };

    const handleRemoveTag = async (tag: string) => {
        const updatedTags = tags.filter(t => t !== tag);
        setTags(updatedTags);
        setTagsSaving(true);
        try {
            await updateCustomerTags(customerId, updatedTags);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove tag' });
            setTags(tags); // revert
        } finally {
            setTagsSaving(false);
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

    if (!customer) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => router.push('/dashboard/customers')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Customers
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/customers')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const params = new URLSearchParams({
                            newThread: 'crm_customer',
                            customerId: customerId,
                            customerName: customer.displayName || customer.email || '',
                            customerEmail: customer.email || '',
                        });
                        router.push(`/dashboard/inbox?${params.toString()}`);
                    }}
                >
                    <Bot className="h-4 w-4 mr-2" /> Chat About Customer
                </Button>
            </div>

            {/* Customer Hero */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold tracking-tight">
                            {customer.displayName || customer.email}
                        </h1>
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

            {/* Metric Cards */}
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
                            {customer.lastOrderDate
                                ? `${customer.daysSinceLastOrder ?? '?'}d ago`
                                : 'N/A'}
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

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                    <TabsTrigger value="communications">Communications</TabsTrigger>
                    <TabsTrigger value="notes">Notes & Tags</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Preferences */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Preferences</CardTitle>
                                <CardDescription>AI-inferred from purchase history</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {customer.preferredCategories.length > 0 && (
                                    <div>
                                        <div className="text-sm font-medium mb-1">Preferred Categories</div>
                                        <div className="flex flex-wrap gap-1">
                                            {customer.preferredCategories.map(cat => (
                                                <Badge key={cat} variant="secondary">{cat}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {customer.preferredProducts.length > 0 && (
                                    <div>
                                        <div className="text-sm font-medium mb-1">Top Products</div>
                                        <div className="flex flex-wrap gap-1">
                                            {customer.preferredProducts.slice(0, 5).map(prod => (
                                                <Badge key={prod} variant="outline">{prod}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {customer.preferredCategories.length === 0 && customer.preferredProducts.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        No purchase preferences yet. Preferences will populate after order history loads.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Loyalty */}
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
                                    <span className="text-sm capitalize">{customer.source?.replace(/_/g, ' ')}</span>
                                </div>
                                {customer.createdAt && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Customer Since</span>
                                        <span className="text-sm" suppressHydrationWarning>
                                            {new Date(customer.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tags */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Tags</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="gap-1">
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
                                    <span className="text-sm text-muted-foreground">No tags yet</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add tag..."
                                    value={newTag}
                                    onChange={e => setNewTag(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                    className="max-w-xs"
                                />
                                <Button size="sm" onClick={handleAddTag} disabled={tagsSaving || !newTag.trim()}>
                                    <Plus className="h-4 w-4 mr-1" /> Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Order History</CardTitle>
                            <CardDescription>
                                {ordersLoaded ? `${orders.length} orders found` : 'Loading from POS...'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {ordersLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                                    <span className="text-muted-foreground">Loading orders from Alleaves...</span>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
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
                                        {orders.map(order => (
                                            <>
                                                <TableRow
                                                    key={order.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => setExpandedOrder(
                                                        expandedOrder === order.id ? null : order.id
                                                    )}
                                                >
                                                    <TableCell>
                                                        {expandedOrder === order.id
                                                            ? <ChevronDown className="h-4 w-4" />
                                                            : <ChevronRight className="h-4 w-4" />}
                                                    </TableCell>
                                                    <TableCell suppressHydrationWarning>
                                                        {order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">
                                                        {order.orderNumber || order.id}
                                                    </TableCell>
                                                    <TableCell>{order.items.length} items</TableCell>
                                                    <TableCell className="font-medium">
                                                        ${order.total.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            order.status === 'completed' ? 'default' :
                                                            order.status === 'cancelled' ? 'destructive' :
                                                            'secondary'
                                                        }>
                                                            {order.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="capitalize">
                                                        {order.paymentMethod}
                                                    </TableCell>
                                                </TableRow>
                                                {expandedOrder === order.id && (
                                                    <TableRow key={`${order.id}-detail`}>
                                                        <TableCell colSpan={7} className="bg-muted/30">
                                                            <div className="py-2 px-4">
                                                                <div className="text-sm font-medium mb-2">Line Items</div>
                                                                <table className="w-full text-sm">
                                                                    <thead>
                                                                        <tr className="text-muted-foreground">
                                                                            <th className="text-left py-1">Product</th>
                                                                            <th className="text-right py-1">Qty</th>
                                                                            <th className="text-right py-1">Price</th>
                                                                            <th className="text-right py-1">Total</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {order.items.map((item, idx) => (
                                                                            <tr key={idx}>
                                                                                <td className="py-1">{item.productName}</td>
                                                                                <td className="text-right py-1">{item.quantity}</td>
                                                                                <td className="text-right py-1">${item.unitPrice.toFixed(2)}</td>
                                                                                <td className="text-right py-1">${item.total.toFixed(2)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                                <div className="flex justify-end gap-4 mt-2 pt-2 border-t text-sm">
                                                                    <span>Subtotal: ${order.subtotal.toFixed(2)}</span>
                                                                    <span>Tax: ${order.tax.toFixed(2)}</span>
                                                                    {order.discount > 0 && (
                                                                        <span className="text-green-600">
                                                                            Discount: -${order.discount.toFixed(2)}
                                                                        </span>
                                                                    )}
                                                                    <span className="font-bold">Total: ${order.total.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Communications Tab */}
                <TabsContent value="communications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Communication History</CardTitle>
                            <CardDescription>Emails, SMS, and scheduled messages</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <MessageSquare className="h-12 w-12 mb-4 opacity-30" />
                                <p className="text-lg font-medium">Coming Soon</p>
                                <p className="text-sm">
                                    Communication tracking will show email and SMS history,
                                    open rates, and scheduled campaigns for this customer.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notes & Tags Tab */}
                <TabsContent value="notes" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">CRM Notes</CardTitle>
                                    <CardDescription>Add context about this customer</CardDescription>
                                </div>
                                {notesEdited && (
                                    <Button size="sm" onClick={handleSaveNotes} disabled={notesSaving}>
                                        {notesSaving ? (
                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-1" />
                                        )}
                                        Save
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Add notes about this customer..."
                                value={notes}
                                onChange={e => { setNotes(e.target.value); setNotesEdited(true); }}
                                rows={6}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Tags</CardTitle>
                            <CardDescription>Organize and categorize customers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {tags.map(tag => (
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
                                    <span className="text-sm text-muted-foreground">No tags yet</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add tag (e.g., VIP, Birthday Club, Edibles Fan)..."
                                    value={newTag}
                                    onChange={e => setNewTag(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                    className="max-w-md"
                                />
                                <Button size="sm" onClick={handleAddTag} disabled={tagsSaving || !newTag.trim()}>
                                    <Plus className="h-4 w-4 mr-1" /> Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
