'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Store, Search, Globe, CheckCircle, XCircle, Inbox, Send, ArrowUpDown, TrendingUp, Users, DollarSign, Trash2, Mail, MessageSquare, ThumbsDown, RefreshCw, FlaskConical, Brain, Sparkles, AlertTriangle, Lightbulb, Flag, ChevronDown, ChevronRight, TestTube2, CheckSquare, Square } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    getBrands,
    getDispensaries,
    getPlatformLeads,
    getPlatformUsers,
    getCRMUserStats,
    getCRMStats,
    deleteCrmEntity,
    deleteUserByEmail,
    markAccountAsTest,
    getTestAccountCount,
    type CRMBrand,
    type CRMDispensary,
    type CRMLead,
    type CRMFilters
} from '@/server/services/crm-service';
import {
    LIFECYCLE_STAGE_CONFIG,
    type CRMUser,
    type CRMLifecycleStage
} from '@/server/services/crm-types';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { inviteToClaimAction, approveUser, rejectUser } from '../actions/user-actions';
import {
    getNYOutreachForCRM,
    addNYLeadNote,
    markNYLeadStatus,
    getNYLeadDataQuality,
    deduplicateNYLeads,
    bulkDeleteNYLeads,
    type NYOutreachCRMLead,
} from '@/server/actions/ny-outreach-dashboard';
import {
    getCRMAIInsights,
    queryCRMWithAI,
    getNextActionForUser,
    type CRMAIInsight,
} from '@/server/actions/crm-ai';

const US_STATES = [
    'All States',
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
];

export default function CRMTab() {
    const { toast } = useToast();

    // Stats
    const [stats, setStats] = useState<{ totalBrands: number; totalDispensaries: number; claimedBrands: number; claimedDispensaries: number; totalPlatformLeads: number } | null>(null);

    // ... (rest of state items are standard hooks initialized inside component, keeping code flow minimal)

    // ... [Inside component]

    // Handler for Approve
    const handleApproveUser = async (uid: string, name: string) => {
        try {
            const result = await approveUser(uid);
            if (result.success) {
                toast({ title: 'Approved', description: `${name} has been approved.` });
                loadUsers();
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    // Handler for Reject
    const handleRejectUser = async (uid: string, name: string) => {
        if (!confirm(`Reject ${name}? This will disable their account.`)) return;
        try {
            const result = await rejectUser(uid);
            if (result.success) {
                toast({ title: 'Rejected', description: `${name} has been rejected.` });
                loadUsers();
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    // Brands
    const [brands, setBrands] = useState<CRMBrand[]>([]);
    const [brandsLoading, setBrandsLoading] = useState(true);
    const [brandSearch, setBrandSearch] = useState('');
    const [brandState, setBrandState] = useState('All States');

    // Dispensaries
    const [dispensaries, setDispensaries] = useState<CRMDispensary[]>([]);
    const [dispensariesLoading, setDispensariesLoading] = useState(true);
    const [dispSearch, setDispSearch] = useState('');
    const [dispState, setDispState] = useState('All States');

    // Leads (Platform)
    const [leads, setLeads] = useState<CRMLead[]>([]);
    const [leadsLoading, setLeadsLoading] = useState(true);
    const [leadSearch, setLeadSearch] = useState(''); // Search by email/company

    // NY Outreach Leads
    const [outreachLeads, setOutreachLeads] = useState<NYOutreachCRMLead[]>([]);
    const [outreachLoading, setOutreachLoading] = useState(false);
    const [outreachFilter, setOutreachFilter] = useState('all');
    const [outreachSearch, setOutreachSearch] = useState('');
    const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

    // NY Data Quality
    const [dataQuality, setDataQuality] = useState<{ totalLeads?: number; dupCount?: number; noEmailCount?: number; incompleteCount?: number; avgScore?: number } | null>(null);
    const [dataQualityLoading, setDataQualityLoading] = useState(false);
    const [dedupLoading, setDedupLoading] = useState(false);
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState<string | null>(null);

    // Jack AI Insights
    const [aiInsights, setAiInsights] = useState<CRMAIInsight[]>([]);
    const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
    const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

    // AI Search
    const [aiSearchQuery, setAiSearchQuery] = useState('');
    const [aiSearchLoading, setAiSearchLoading] = useState(false);
    const [aiSearchResult, setAiSearchResult] = useState<{ summary: string; filtersApplied: string } | null>(null);
    const [isAiSearchMode, setIsAiSearchMode] = useState(false);

    // Test account controls
    const [showTestAccounts, setShowTestAccounts] = useState(false);
    const [testAccountCount, setTestAccountCount] = useState(0);

    // Bulk select
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

    // Next action per user (lazy, keyed by userId)
    const [nextActions, setNextActions] = useState<Record<string, string>>({});
    const [nextActionsLoading, setNextActionsLoading] = useState<Set<string>>(new Set());
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Sorting State
    const [brandSort, setBrandSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
    const [dispSort, setDispSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    // Sorted Brands
    const sortedBrands = useMemo(() => {
        return [...brands].sort((a, b) => {
            const aVal = String(a[brandSort.key as keyof CRMBrand] || '');
            const bVal = String(b[brandSort.key as keyof CRMBrand] || '');
            if (aVal < bVal) return brandSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return brandSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [brands, brandSort]);

    // Sorted Dispensaries
    const sortedDispensaries = useMemo(() => {
        return [...dispensaries].sort((a, b) => {
            const aVal = String(a[dispSort.key as keyof CRMDispensary] || '');
            const bVal = String(b[dispSort.key as keyof CRMDispensary] || '');
            if (aVal < bVal) return dispSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return dispSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [dispensaries, dispSort]);

    // Paginated Brands
    const {
        currentPage: brandsPage,
        totalPages: brandsTotalPages,
        paginatedItems: paginatedBrands,
        setCurrentPage: setBrandsPage,
        totalItems: totalBrandsItems
    } = usePagination(sortedBrands, 10);

    // Paginated Dispensaries
    const {
        currentPage: dispPage,
        totalPages: dispTotalPages,
        paginatedItems: paginatedDispensaries,
        setCurrentPage: setDispPage,
        totalItems: totalDispItems
    } = usePagination(sortedDispensaries, 10);

    // Paginated Leads
    const {
        currentPage: leadsPage,
        totalPages: leadsTotalPages,
        paginatedItems: paginatedLeads,
        setCurrentPage: setLeadsPage,
        totalItems: totalLeadsItems
    } = usePagination(leads, 10);

    // Paginated Outreach Leads
    const {
        currentPage: outreachPage,
        totalPages: outreachTotalPages,
        paginatedItems: paginatedOutreachLeads,
        setCurrentPage: setOutreachPage,
        totalItems: totalOutreachItems
    } = usePagination(outreachLeads, 25);

    // Users (Platform)
    const [users, setUsers] = useState<CRMUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [userSearch, setUserSearch] = useState('');
    const [userLifecycleFilter, setUserLifecycleFilter] = useState<CRMLifecycleStage | 'all'>('all');
    const [userStats, setUserStats] = useState<{ totalUsers: number; activeUsers: number; totalMRR: number; byLifecycle: Record<CRMLifecycleStage, number> } | null>(null);

    // Paginated Users
    const {
        currentPage: usersPage,
        totalPages: usersTotalPages,
        paginatedItems: paginatedUsers,
        setCurrentPage: setUsersPage,
        totalItems: totalUsersItems
    } = usePagination(users, 10);

    useEffect(() => {
        loadStats();
        loadBrands();
        loadDispensaries();
        loadLeads();
        loadUsers();
        loadOutreachLeads();
        loadAIInsights();
        loadDataQuality();
        getTestAccountCount().then(setTestAccountCount).catch(() => {});
    }, []);

    const loadStats = async () => {
        try {
            const data = await getCRMStats();
            setStats(data);
            // Also load user stats
            const uStats = await getCRMUserStats();
            setUserStats(uStats);
        } catch (e: any) {
            console.error('Failed to load CRM stats', e);
        }
    };

    const loadBrands = async () => {
        setBrandsLoading(true);
        try {
            const filters: CRMFilters = { limit: 200 }; // Increase limit
            if (brandState !== 'All States') filters.state = brandState;
            if (brandSearch) filters.search = brandSearch;
            const data = await getBrands(filters);
            setBrands(data);
            setBrandsPage(1); // Reset page
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setBrandsLoading(false);
        }
    };

    const loadDispensaries = async () => {
        setDispensariesLoading(true);
        try {
            const filters: CRMFilters = { limit: 200 }; // Increase limit
            if (dispState !== 'All States') filters.state = dispState;
            if (dispSearch) filters.search = dispSearch;
            const data = await getDispensaries(filters);
            setDispensaries(data);
            setDispPage(1); // Reset page
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setDispensariesLoading(false);
        }
    };

    const loadLeads = async () => {
        setLeadsLoading(true);
        try {
            const filters: CRMFilters = { limit: 200 }; // Increase limit
            if (leadSearch) filters.search = leadSearch;
            const data = await getPlatformLeads(filters);
            setLeads(data);
            setLeadsPage(1); // Reset page
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setLeadsLoading(false);
        }
    };

    const loadUsers = async (overrideShowTest?: boolean) => {
        setUsersLoading(true);
        setAiSearchResult(null);
        try {
            const filters: CRMFilters = { limit: 200, includeTest: overrideShowTest ?? showTestAccounts };
            if (userSearch) filters.search = userSearch;
            if (userLifecycleFilter !== 'all') filters.lifecycleStage = userLifecycleFilter;
            const data = await getPlatformUsers(filters);
            setUsers(data);
            setUsersPage(1);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setUsersLoading(false);
        }
    };

    const loadOutreachLeads = async () => {
        setOutreachLoading(true);
        try {
            const result = await getNYOutreachForCRM(outreachFilter, outreachSearch);
            if (result.success && result.leads) {
                setOutreachLeads(result.leads);
                setOutreachPage(1);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setOutreachLoading(false);
        }
    };

    const handleAddNote = async (leadId: string) => {
        const note = noteInputs[leadId]?.trim();
        if (!note) return;
        try {
            await addNYLeadNote(leadId, note);
            setNoteInputs(prev => ({ ...prev, [leadId]: '' }));
            toast({ title: 'Note saved' });
            loadOutreachLeads();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    const handleMarkStatus = async (leadId: string, status: 'responded' | 'not_interested' | 'researched') => {
        try {
            await markNYLeadStatus(leadId, status);
            toast({ title: 'Status updated' });
            loadOutreachLeads();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    const handleBrandSearch = () => {
        loadBrands();
    };

    const handleDispSearch = () => {
        loadDispensaries();
    };

    const handleLeadSearch = () => {
        loadLeads();
    };

    const toggleBrandSort = (key: string) => {
        setBrandSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleDispSort = (key: string) => {
        setDispSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleInvite = async (type: 'brand' | 'dispensary', org: CRMBrand | CRMDispensary) => {
        try {
            const result = await inviteToClaimAction(org.id, type);

            if (!result.error) {
                toast({ title: 'Success', description: result.message || `Invite sent successfully` });
                // Reload to show updated status
                if (type === 'brand') loadBrands();
                else loadDispensaries();
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to send invite' });
        }
    };

    const handleDelete = async (type: 'brand' | 'dispensary' | 'user', id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${type} "${name}"? This cannot be undone.`)) {
            return;
        }

        try {
            await deleteCrmEntity(id, type);
            toast({ title: 'Deleted', description: `${name} has been removed from CRM.` });
            if (type === 'brand') loadBrands();
            else if (type === 'dispensary') loadDispensaries();
            else loadUsers();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete entity.' });
        }
    };

    const handleCleanup = async () => {
        const email = prompt("Enter email of the user to force delete (Zombie Cleanup):");
        if (!email) return;

        if (!confirm(`DANGER: Are you sure you want to FORCE DELETE ${email} from Auth and Firestore? This bypasses standard checks.`)) {
            return;
        }

        try {
            const result = await deleteUserByEmail(email);
            toast({ title: 'Cleanup Result', description: result });
            loadUsers();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Cleanup Failed', description: e.message });
        }
    };

    // Mark a user as test account
    const handleMarkAsTest = async (userId: string, name: string, isTest: boolean) => {
        try {
            await markAccountAsTest(userId, isTest);
            toast({ title: isTest ? 'Marked as test' : 'Unmarked', description: `${name} ${isTest ? 'excluded from stats' : 'included in stats'}.` });
            loadUsers();
            const count = await getTestAccountCount();
            setTestAccountCount(count);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    // Bulk mark selected users as test
    const handleBulkMarkAsTest = async () => {
        if (selectedUserIds.size === 0) return;
        if (!confirm(`Mark ${selectedUserIds.size} account(s) as test? They will be excluded from all metrics.`)) return;
        for (const id of Array.from(selectedUserIds)) {
            const user = users.find(u => u.id === id);
            if (user) await markAccountAsTest(id, true);
        }
        setSelectedUserIds(new Set());
        loadUsers();
        const count = await getTestAccountCount();
        setTestAccountCount(count);
        toast({ title: `${selectedUserIds.size} accounts marked as test` });
    };

    // Bulk delete selected users
    const handleBulkDelete = async () => {
        if (selectedUserIds.size === 0) return;
        if (!confirm(`Delete ${selectedUserIds.size} account(s)? This cannot be undone and will remove all subcollections.`)) return;
        for (const id of Array.from(selectedUserIds)) {
            const user = users.find(u => u.id === id);
            await deleteCrmEntity(id, 'user');
            toast({ title: `Deleted ${user?.displayName || id}` });
        }
        setSelectedUserIds(new Set());
        loadUsers();
    };

    // Load Jack AI insights
    const loadAIInsights = async () => {
        setAiInsightsLoading(true);
        try {
            const result = await getCRMAIInsights();
            if (result.success && result.insights) {
                setAiInsights(result.insights);
            }
        } catch (e: any) {
            console.error('Failed to load AI insights', e);
        } finally {
            setAiInsightsLoading(false);
        }
    };

    // AI natural language search
    const handleAISearch = async () => {
        if (!aiSearchQuery.trim()) return;
        setAiSearchLoading(true);
        setAiSearchResult(null);
        try {
            const result = await queryCRMWithAI(aiSearchQuery);
            if (result.success && result.result) {
                setUsers(result.result.users);
                setAiSearchResult({ summary: result.result.summary, filtersApplied: result.result.filtersApplied });
                setUsersPage(1);
            } else {
                toast({ variant: 'destructive', title: 'Search failed', description: result.error });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setAiSearchLoading(false);
        }
    };

    // Toggle row expand and lazy-load next action
    const handleToggleRow = async (userId: string) => {
        const next = new Set(expandedRows);
        if (next.has(userId)) {
            next.delete(userId);
        } else {
            next.add(userId);
            // Lazy-load next action if not cached
            if (!nextActions[userId]) {
                const loading = new Set(nextActionsLoading);
                loading.add(userId);
                setNextActionsLoading(loading);
                try {
                    const result = await getNextActionForUser(userId);
                    if (result.success && result.nextAction) {
                        setNextActions(prev => ({ ...prev, [userId]: result.nextAction! }));
                    }
                } catch {
                    // silently fail
                } finally {
                    const l = new Set(nextActionsLoading);
                    l.delete(userId);
                    setNextActionsLoading(l);
                }
            }
        }
        setExpandedRows(next);
    };

    // Load NY data quality stats
    const loadDataQuality = async () => {
        setDataQualityLoading(true);
        try {
            const result = await getNYLeadDataQuality();
            if (result.success) setDataQuality(result);
        } catch (e: any) {
            console.error('Data quality load failed', e);
        } finally {
            setDataQualityLoading(false);
        }
    };

    // Run deduplication
    const handleRunDedup = async () => {
        if (!confirm('Scan all NY leads for duplicates and score data quality? This may take 10-30 seconds.')) return;
        setDedupLoading(true);
        try {
            const result = await deduplicateNYLeads();
            if (result.success) {
                toast({ title: 'Dedup complete', description: `${result.marked} duplicates marked, ${result.scored} leads scored.` });
                loadOutreachLeads();
                loadDataQuality();
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Dedup failed', description: e.message });
        } finally {
            setDedupLoading(false);
        }
    };

    // Bulk delete NY leads
    const handleBulkDeleteNY = async (filter: 'duplicates' | 'no_email' | 'incomplete') => {
        const labels: Record<string, string> = {
            duplicates: 'duplicate leads',
            no_email: 'leads with no email',
            incomplete: 'incomplete leads (score < 40%)',
        };
        if (!confirm(`Delete all ${labels[filter]}? This cannot be undone.`)) return;
        setBulkDeleteLoading(filter);
        try {
            const result = await bulkDeleteNYLeads(filter);
            if (result.success) {
                toast({ title: 'Deleted', description: `${result.deleted} ${labels[filter]} removed.` });
                loadOutreachLeads();
                loadDataQuality();
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete failed', description: e.message });
        } finally {
            setBulkDeleteLoading(null);
        }
    };

    const SortIcon = ({ column, currentSort }: { column: string, currentSort: { key: string, direction: 'asc' | 'desc' } }) => {
        if (currentSort.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
        return currentSort.direction === 'asc' ?
            <TrendingUp className="ml-2 h-4 w-4 text-primary rotate-0" /> :
            <TrendingUp className="ml-2 h-4 w-4 text-primary rotate-180" />;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Brain className="h-6 w-6 text-purple-500" />
                        BakedBot CRM
                    </h2>
                    <p className="text-muted-foreground">AI-native CRM powered by Jack · lifecycle tracking · MRR</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { loadAIInsights(); loadStats(); loadUsers(); }} disabled={aiInsightsLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${aiInsightsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Jack AI Insights Panel */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-400">
                    <Sparkles className="h-4 w-4" />
                    Jack&apos;s Intelligence Feed
                    {aiInsightsLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                {aiInsightsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : aiInsights.filter(i => !dismissedInsights.has(i.id)).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active insights. Jack is watching.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {aiInsights.filter(i => !dismissedInsights.has(i.id)).map(insight => (
                            <div
                                key={insight.id}
                                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm border ${
                                    insight.type === 'alert' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
                                    : insight.type === 'opportunity' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200'
                                    : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200'
                                }`}
                            >
                                {insight.type === 'alert' ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    : insight.type === 'opportunity' ? <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                                    : <Flag className="h-3.5 w-3.5 shrink-0" />}
                                <span>{insight.message}</span>
                                {insight.count !== undefined && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{insight.count}</Badge>
                                )}
                                {insight.action && (
                                    <button
                                        className="underline underline-offset-2 font-medium hover:opacity-70 text-xs shrink-0"
                                        onClick={() => {
                                            if (insight.filterHint?.lifecycleStage) {
                                                setUserLifecycleFilter(insight.filterHint.lifecycleStage);
                                                loadUsers();
                                            }
                                        }}
                                    >
                                        {insight.action}
                                    </button>
                                )}
                                <button
                                    className="ml-1 opacity-40 hover:opacity-100 shrink-0"
                                    onClick={() => setDismissedInsights(prev => new Set([...prev, insight.id]))}
                                >×</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {stats && (
                    <>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Total Brands</CardDescription>
                                <CardTitle className="text-2xl">{stats.totalBrands}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Dispensaries</CardDescription>
                                <CardTitle className="text-2xl">{stats.totalDispensaries}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Inbound Leads</CardDescription>
                                <CardTitle className="text-2xl text-blue-600">{stats.totalPlatformLeads}</CardTitle>
                            </CardHeader>
                        </Card>
                    </>
                )}
                {userStats && (
                    <>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    Platform Users
                                    {testAccountCount > 0 && !showTestAccounts && (
                                        <span className="text-xs text-muted-foreground">(-{testAccountCount} test)</span>
                                    )}
                                </CardDescription>
                                <CardTitle className="text-2xl text-purple-600">{userStats.totalUsers}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Active (7d)</CardDescription>
                                <CardTitle className="text-2xl text-green-600">{userStats.activeUsers}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    Total MRR
                                    {testAccountCount > 0 && !showTestAccounts && (
                                        <span className="text-xs text-muted-foreground">(excl. test)</span>
                                    )}
                                </CardDescription>
                                <CardTitle className="text-2xl text-green-600">${userStats.totalMRR.toLocaleString()}</CardTitle>
                            </CardHeader>
                        </Card>
                    </>
                )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="users">
                <TabsList>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="h-4 w-4" />
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="brands" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Brands
                    </TabsTrigger>
                    <TabsTrigger value="dispensaries" className="gap-2">
                        <Store className="h-4 w-4" />
                        Dispensaries
                    </TabsTrigger>
                    <TabsTrigger value="leads" className="gap-2">
                        <Inbox className="h-4 w-4" />
                        Leads
                    </TabsTrigger>
                    <TabsTrigger value="ny-outreach" className="gap-2">
                        <Mail className="h-4 w-4" />
                        NY Outreach
                    </TabsTrigger>
                </TabsList>

                {/* Users Tab */}
                <TabsContent value="users" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                Platform Users
                                {selectedUserIds.size > 0 && (
                                    <span className="ml-2 flex items-center gap-2">
                                        <Badge variant="secondary">{selectedUserIds.size} selected</Badge>
                                        <Button size="sm" variant="outline" onClick={handleBulkMarkAsTest} className="h-7 text-xs gap-1">
                                            <FlaskConical className="h-3 w-3" />
                                            Mark Test
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="h-7 text-xs gap-1">
                                            <Trash2 className="h-3 w-3" />
                                            Delete
                                        </Button>
                                        <button className="text-xs text-muted-foreground underline" onClick={() => setSelectedUserIds(new Set())}>clear</button>
                                    </span>
                                )}
                            </CardTitle>
                            <CardDescription>
                                All registered users with lifecycle tracking and MRR from Authorize.net
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* AI Search Bar */}
                            <div className="space-y-2">
                                <div className="flex gap-2 flex-wrap">
                                    <div className="relative flex-1 min-w-[200px]">
                                        {isAiSearchMode ? (
                                            <div className="flex gap-1">
                                                <div className="relative flex-1">
                                                    <Sparkles className="absolute left-2 top-2.5 h-4 w-4 text-purple-400" />
                                                    <Input
                                                        placeholder='Ask Jack: "show me VIP users inactive 30+ days"'
                                                        value={aiSearchQuery}
                                                        onChange={(e) => setAiSearchQuery(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                                                        className="pl-8"
                                                    />
                                                </div>
                                                <Button onClick={handleAISearch} disabled={aiSearchLoading} className="bg-purple-600 hover:bg-purple-700">
                                                    {aiSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-1">
                                                <Input
                                                    placeholder="Search users..."
                                                    value={userSearch}
                                                    onChange={(e) => setUserSearch(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                                                    className="max-w-xs"
                                                />
                                                <Button onClick={() => loadUsers()}>
                                                    <Search className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant={isAiSearchMode ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => {
                                            setIsAiSearchMode(!isAiSearchMode);
                                            setAiSearchResult(null);
                                            if (isAiSearchMode) loadUsers();
                                        }}
                                        className={isAiSearchMode ? 'bg-purple-600 hover:bg-purple-700' : ''}
                                    >
                                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                        {isAiSearchMode ? 'AI Search' : 'AI Search'}
                                    </Button>
                                    <Select value={userLifecycleFilter} onValueChange={(v) => setUserLifecycleFilter(v as CRMLifecycleStage | 'all')}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Lifecycle Stage" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Stages</SelectItem>
                                            {Object.entries(LIFECYCLE_STAGE_CONFIG).map(([key, config]) => (
                                                <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {/* Test account toggle */}
                                    <Button
                                        variant={showTestAccounts ? 'secondary' : 'outline'}
                                        size="sm"
                                        onClick={() => {
                                            const next = !showTestAccounts;
                                            setShowTestAccounts(next);
                                            loadUsers(next);
                                        }}
                                        className="gap-1.5"
                                    >
                                        <TestTube2 className="h-3.5 w-3.5" />
                                        {showTestAccounts ? `Showing test (${testAccountCount})` : testAccountCount > 0 ? `Hide ${testAccountCount} test` : 'Test accounts'}
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={handleCleanup} title="Force User Cleanup">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                {/* AI Search result summary */}
                                {aiSearchResult && (
                                    <div className="flex items-center gap-2 text-sm px-3 py-2 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                                        <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                        <span className="text-purple-800 dark:text-purple-200 font-medium">{aiSearchResult.summary}</span>
                                        <span className="text-purple-400 text-xs ml-auto shrink-0">{aiSearchResult.filtersApplied}</span>
                                        <button className="text-xs text-muted-foreground underline shrink-0" onClick={() => { setAiSearchResult(null); loadUsers(); }}>clear</button>
                                    </div>
                                )}
                            </div>

                            {/* Table */}
                            {usersLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : users.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No users found.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8">
                                                <button
                                                    onClick={() => {
                                                        if (selectedUserIds.size === paginatedUsers.length) {
                                                            setSelectedUserIds(new Set());
                                                        } else {
                                                            setSelectedUserIds(new Set(paginatedUsers.map(u => u.id)));
                                                        }
                                                    }}
                                                >
                                                    {selectedUserIds.size === paginatedUsers.length && paginatedUsers.length > 0
                                                        ? <CheckSquare className="h-4 w-4" />
                                                        : <Square className="h-4 w-4" />}
                                                </button>
                                            </TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Lifecycle</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>MRR</TableHead>
                                            <TableHead>Signup</TableHead>
                                            <TableHead>Last Login</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedUsers.map((user) => (
                                            <>
                                            <TableRow
                                                key={user.id}
                                                className={`cursor-pointer ${user.isTestAccount ? 'opacity-60 bg-muted/30' : ''}`}
                                                onClick={() => handleToggleRow(user.id)}
                                            >
                                                <TableCell onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => {
                                                        const next = new Set(selectedUserIds);
                                                        next.has(user.id) ? next.delete(user.id) : next.add(user.id);
                                                        setSelectedUserIds(next);
                                                    }}>
                                                        {selectedUserIds.has(user.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                                                    </button>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {user.photoUrl && (
                                                            <img src={user.photoUrl} alt="" className="h-8 w-8 rounded-full" />
                                                        )}
                                                        <div>
                                                            <div className="font-medium flex items-center gap-1.5">
                                                                {user.displayName}
                                                                {user.isTestAccount && (
                                                                    <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-gray-500 border-gray-300">TEST</Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">{user.accountType}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={LIFECYCLE_STAGE_CONFIG[user.lifecycleStage]?.color || 'bg-gray-100'}>
                                                        {LIFECYCLE_STAGE_CONFIG[user.lifecycleStage]?.label || user.lifecycleStage}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="capitalize">{user.plan}</Badge>
                                                </TableCell>
                                                <TableCell className="font-medium text-green-600">
                                                    ${user.mrr.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(user.signupAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                                </TableCell>
                                                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                                            title={user.isTestAccount ? 'Unmark test account' : 'Mark as test account'}
                                                            onClick={() => handleMarkAsTest(user.id, user.displayName, !user.isTestAccount)}
                                                        >
                                                            <FlaskConical className={`h-3.5 w-3.5 ${user.isTestAccount ? 'text-amber-500' : ''}`} />
                                                        </button>
                                                        {user.approvalStatus !== 'approved' && (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    onClick={() => handleApproveUser(user.id, user.displayName)}
                                                                    title="Approve User"
                                                                >
                                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                                </Button>
                                                                {user.approvalStatus === 'pending' && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                        onClick={() => handleRejectUser(user.id, user.displayName)}
                                                                        title="Reject User"
                                                                    >
                                                                        <XCircle className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-full"
                                                            onClick={() => handleDelete('user', user.id, user.displayName)}
                                                            title="Delete User (cascade)"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <span className="text-muted-foreground">
                                                            {expandedRows.has(user.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {expandedRows.has(user.id) && (
                                                <TableRow key={`${user.id}-expanded`} className="bg-muted/20">
                                                    <TableCell colSpan={9} className="py-2 px-4">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                                            <span className="text-muted-foreground text-xs font-medium">Jack suggests:</span>
                                                            {nextActionsLoading.has(user.id) ? (
                                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                                                                </span>
                                                            ) : nextActions[user.id] ? (
                                                                <span className="text-sm text-foreground">{nextActions[user.id]}</span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">No suggestion available</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            </>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {users.length > 0 && !usersLoading && (
                                <Pagination
                                    currentPage={usersPage}
                                    totalPages={usersTotalPages}
                                    onPageChange={setUsersPage}
                                    itemsPerPage={10}
                                    totalItems={totalUsersItems}
                                    className="mt-4"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Brands Tab */}
                <TabsContent value="brands" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Discovered Brands</CardTitle>
                            <CardDescription>
                                Brands found during page generation. National brands appear in 3+ states.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Filters */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search brands..."
                                    value={brandSearch}
                                    onChange={(e) => setBrandSearch(e.target.value)}
                                    className="max-w-xs"
                                />
                                <Select value={brandState} onValueChange={setBrandState}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {US_STATES.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleBrandSearch}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Table */}
                            {brandsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : brands.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No brands found. Run page generation to discover brands.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleBrandSort('name')}
                                            >
                                                <div className="flex items-center">
                                                    Name
                                                    <SortIcon column="name" currentSort={brandSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead>States</TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleBrandSort('isNational')}
                                            >
                                                <div className="flex items-center">
                                                    Type
                                                    <SortIcon column="isNational" currentSort={brandSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleBrandSort('source')}
                                            >
                                                <div className="flex items-center">
                                                    Source
                                                    <SortIcon column="source" currentSort={brandSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleBrandSort('claimStatus')}
                                            >
                                                <div className="flex items-center">
                                                    Status
                                                    <SortIcon column="claimStatus" currentSort={brandSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleBrandSort('discoveredAt')}
                                            >
                                                <div className="flex items-center">
                                                    Discovered
                                                    <SortIcon column="discoveredAt" currentSort={brandSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedBrands.map((brand) => (
                                            <TableRow key={brand.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {brand.logoUrl && (
                                                            <img src={brand.logoUrl} alt={brand.name} className="h-6 w-6 rounded-full object-cover" />
                                                        )}
                                                        <div>
                                                            <div>{brand.name}</div>
                                                            {brand.website && (
                                                                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center hover:underline">
                                                                    <Globe className="h-3 w-3 mr-1" />
                                                                    {new URL(brand.website).hostname}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {brand.states.map(s => (
                                                            <Badge key={s} variant="outline" className="text-[10px] py-0">{s}</Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={brand.isNational ? "default" : "secondary"}>
                                                        {brand.isNational ? 'National' : 'Local'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">{brand.source}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {brand.claimStatus === 'claimed' ? (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                            Claimed
                                                        </Badge>
                                                    ) : brand.claimStatus === 'invited' ? (
                                                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                                                            Invited
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground">Unclaimed</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(brand.discoveredAt).toLocaleDateString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        {brand.claimStatus !== 'claimed' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                                                onClick={() => handleInvite('brand', brand)}
                                                            >
                                                                <Send className="h-3 w-3" />
                                                                Invite
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-full"
                                                            onClick={() => handleDelete('brand', brand.id, brand.name)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {brands.length > 0 && !brandsLoading && (
                                <Pagination
                                    currentPage={brandsPage}
                                    totalPages={brandsTotalPages}
                                    onPageChange={setBrandsPage}
                                    itemsPerPage={10}
                                    totalItems={totalBrandsItems}
                                    className="mt-4"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Dispensaries Tab */}
                <TabsContent value="dispensaries" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Discovered Dispensaries</CardTitle>
                            <CardDescription>
                                Dispensaries found during page generation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Filters */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search dispensaries..."
                                    value={dispSearch}
                                    onChange={(e) => setDispSearch(e.target.value)}
                                    className="max-w-xs"
                                />
                                <Select value={dispState} onValueChange={setDispState}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {US_STATES.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleDispSearch}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Table */}
                            {dispensariesLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : dispensaries.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No dispensaries found. Run page generation to discover dispensaries.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('name')}
                                            >
                                                <div className="flex items-center">
                                                    Name
                                                    <SortIcon column="name" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('state')}
                                            >
                                                <div className="flex items-center">
                                                    Location
                                                    <SortIcon column="state" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('address')}
                                            >
                                                <div className="flex items-center">
                                                    Address
                                                    <SortIcon column="address" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('source')}
                                            >
                                                <div className="flex items-center">
                                                    Source
                                                    <SortIcon column="source" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('claimStatus')}
                                            >
                                                <div className="flex items-center">
                                                    Status
                                                    <SortIcon column="claimStatus" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('discoveredAt')}
                                            >
                                                <div className="flex items-center">
                                                    Discovered
                                                    <SortIcon column="discoveredAt" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedDispensaries.map((disp) => (
                                            <TableRow key={disp.id}>
                                                <TableCell className="font-medium">{disp.name}</TableCell>
                                                <TableCell>
                                                    {disp.city && `${disp.city}, `}{disp.state}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {disp.address || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">{disp.source || 'discovery'}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {disp.claimStatus === 'claimed' ? (
                                                        <Badge className="bg-green-100 text-green-800">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Claimed
                                                        </Badge>
                                                    ) : disp.claimStatus === 'invited' ? (
                                                        <Badge className="bg-blue-100 text-blue-800">
                                                            <Inbox className="h-3 w-3 mr-1" />
                                                            Invited
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Unclaimed
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {disp.discoveredAt ? new Date(disp.discoveredAt).toLocaleDateString() : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        {disp.claimStatus !== 'claimed' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                                                onClick={() => handleInvite('dispensary', disp)}
                                                            >
                                                                <Send className="h-3 w-3" />
                                                                Invite
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-full"
                                                            onClick={() => handleDelete('dispensary', disp.id, disp.name)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {dispensaries.length > 0 && !dispensariesLoading && (
                                <Pagination
                                    currentPage={dispPage}
                                    totalPages={dispTotalPages}
                                    onPageChange={setDispPage}
                                    itemsPerPage={10}
                                    totalItems={totalDispItems}
                                    className="mt-4"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>


                {/* Leads Tab */}
                <TabsContent value="leads" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Inbound Platform Leads</CardTitle>
                            <CardDescription>
                                B2B prospects captured via Agent Playground and claim flows.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Filters */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search by email or company..."
                                    value={leadSearch}
                                    onChange={(e) => setLeadSearch(e.target.value)}
                                    className="max-w-xs"
                                />
                                <Button onClick={handleLeadSearch}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Table */}
                            {leadsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : leads.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No leads found. Check Agent Playground activity.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead>Source</TableHead>
                                            <TableHead>Demos</TableHead>
                                            <TableHead>Captured</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedLeads.map((lead) => (
                                            <TableRow key={lead.id}>
                                                <TableCell className="font-medium">
                                                    <div>{lead.email}</div>
                                                </TableCell>
                                                <TableCell>{lead.company}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{lead.source}</Badge>
                                                </TableCell>
                                                <TableCell>{lead.demoCount}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(lead.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {leads.length > 0 && !leadsLoading && (
                                <Pagination
                                    currentPage={leadsPage}
                                    totalPages={leadsTotalPages}
                                    onPageChange={setLeadsPage}
                                    itemsPerPage={10}
                                    totalItems={totalLeadsItems}
                                    className="mt-4"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* NY Outreach Tab */}
                <TabsContent value="ny-outreach" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>NY Licensed Dispensaries — Outreach Pipeline</CardTitle>
                            <CardDescription>
                                {totalOutreachItems} NY OCMRETL licensees imported from state records. Track contact status and notes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Data Quality Banner */}
                            {dataQuality && (
                                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            Data Quality
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleRunDedup} disabled={dedupLoading}>
                                                {dedupLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                                Run Dedup &amp; Score
                                            </Button>
                                            {(dataQuality.dupCount ?? 0) > 0 && (
                                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleBulkDeleteNY('duplicates')} disabled={bulkDeleteLoading === 'duplicates'}>
                                                    {bulkDeleteLoading === 'duplicates' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                    Delete {dataQuality.dupCount} Dupes
                                                </Button>
                                            )}
                                            {(dataQuality.noEmailCount ?? 0) > 0 && (
                                                <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => handleBulkDeleteNY('no_email')} disabled={bulkDeleteLoading === 'no_email'}>
                                                    {bulkDeleteLoading === 'no_email' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                    Delete {dataQuality.noEmailCount} No-Email
                                                </Button>
                                            )}
                                            {(dataQuality.incompleteCount ?? 0) > 0 && (
                                                <Button size="sm" variant="outline" className="h-7 text-xs text-orange-600 border-orange-200" onClick={() => handleBulkDeleteNY('incomplete')} disabled={bulkDeleteLoading === 'incomplete'}>
                                                    {bulkDeleteLoading === 'incomplete' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                    Delete {dataQuality.incompleteCount} Incomplete
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                        <span><span className="font-medium text-foreground">{dataQuality.totalLeads}</span> total leads</span>
                                        <span className={`font-medium ${(dataQuality.dupCount ?? 0) > 0 ? 'text-red-500' : 'text-green-600'}`}>{dataQuality.dupCount ?? '—'} dupes</span>
                                        <span className={`font-medium ${(dataQuality.noEmailCount ?? 0) > 0 ? 'text-amber-500' : 'text-green-600'}`}>{dataQuality.noEmailCount ?? '—'} no email</span>
                                        <span>Avg score: <span className={`font-medium ${(dataQuality.avgScore ?? 0) < 50 ? 'text-red-500' : (dataQuality.avgScore ?? 0) < 70 ? 'text-amber-500' : 'text-green-600'}`}>{dataQuality.avgScore ?? '—'}%</span></span>
                                    </div>
                                </div>
                            )}
                            {dataQualityLoading && !dataQuality && (
                                <div className="h-16 bg-muted rounded-lg animate-pulse" />
                            )}

                            {/* Filters */}
                            <div className="flex gap-2 flex-wrap">
                                <Input
                                    placeholder="Search by name or city..."
                                    value={outreachSearch}
                                    onChange={(e) => setOutreachSearch(e.target.value)}
                                    className="max-w-xs"
                                    onKeyDown={(e) => e.key === 'Enter' && loadOutreachLeads()}
                                />
                                <Select value={outreachFilter} onValueChange={setOutreachFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Leads</SelectItem>
                                        <SelectItem value="has_email">Has Email</SelectItem>
                                        <SelectItem value="no_email">No Email</SelectItem>
                                        <SelectItem value="contacted">Contacted (Draft Sent)</SelectItem>
                                        <SelectItem value="responded">Responded</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={loadOutreachLeads}>
                                    <Search className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" onClick={loadOutreachLeads} disabled={outreachLoading}>
                                    <RefreshCw className={`h-4 w-4 ${outreachLoading ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>

                            {/* Table */}
                            {outreachLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : outreachLeads.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No leads found. Use the Outreach tab to import NY licensed dispensaries.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Dispensary</TableHead>
                                            <TableHead>City</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Quality</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Outreach</TableHead>
                                            <TableHead>Notes</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedOutreachLeads.map((lead) => (
                                            <TableRow key={lead.id} className={lead.isDuplicate ? 'opacity-50' : ''}>
                                                <TableCell className="font-medium max-w-[180px]">
                                                    <div className="flex items-center gap-1">
                                                        <span className="truncate">{lead.dispensaryName}</span>
                                                        {lead.isDuplicate && (
                                                            <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-red-500 border-red-300 shrink-0" title={`Duplicate of: ${lead.duplicateOf || 'another lead'}`}>DUP</Badge>
                                                        )}
                                                    </div>
                                                    {lead.websiteUrl && (
                                                        <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer"
                                                            className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                            <Globe className="h-3 w-3" />
                                                            {lead.websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                                        </a>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">{lead.city || '—'}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {lead.contactName || '—'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {lead.email ? (
                                                        <a href={`mailto:${lead.email}`} className="text-blue-500 hover:underline">
                                                            {lead.email}
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">No email</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {lead.dataQualityScore !== undefined ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${lead.dataQualityScore >= 70 ? 'bg-green-500' : lead.dataQualityScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${lead.dataQualityScore}%` }}
                                                                />
                                                            </div>
                                                            <span className={`text-xs font-medium ${lead.dataQualityScore >= 70 ? 'text-green-600' : lead.dataQualityScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                                                                {lead.dataQualityScore}%
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {lead.status === 'responded' ? (
                                                        <Badge className="bg-green-100 text-green-800 text-xs">Responded</Badge>
                                                    ) : lead.status === 'not_interested' ? (
                                                        <Badge className="bg-red-100 text-red-800 text-xs">Not Interested</Badge>
                                                    ) : lead.status === 'researched' ? (
                                                        <Badge className="bg-purple-100 text-purple-800 text-xs">Researched</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-xs">New</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {lead.outreachSent ? (
                                                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                                                            Sent
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">Not contacted</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-[200px]">
                                                    <div className="space-y-1">
                                                        {lead.notes && (
                                                            <p className="text-xs text-muted-foreground truncate">{lead.notes}</p>
                                                        )}
                                                        <div className="flex gap-1">
                                                            <Input
                                                                placeholder="Add note..."
                                                                value={noteInputs[lead.id] || ''}
                                                                onChange={(e) => setNoteInputs(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                                                className="h-6 text-xs px-2"
                                                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote(lead.id)}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => handleAddNote(lead.id)}
                                                            >
                                                                <MessageSquare className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            onClick={() => handleMarkStatus(lead.id, 'responded')}
                                                            title="Mark as Responded"
                                                        >
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Replied
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleMarkStatus(lead.id, 'not_interested')}
                                                            title="Mark as Not Interested"
                                                        >
                                                            <ThumbsDown className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {outreachLeads.length > 0 && !outreachLoading && (
                                <Pagination
                                    currentPage={outreachPage}
                                    totalPages={outreachTotalPages}
                                    onPageChange={setOutreachPage}
                                    itemsPerPage={25}
                                    totalItems={totalOutreachItems}
                                    className="mt-4"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
