'use client';

/**
 * Smokey Recommends: Playbook Cards
 * 
 * Displays recommended playbooks with On/Off toggle.
 * When enabled, triggers setup wizard for permissions + configuration.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Zap, AlertTriangle, Star, TrendingUp, Package, Users, Store, BarChart3, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { PlaybookSetupWizard, PlaybookConfig } from './playbook-setup-wizard';

// =============================================================================
// TYPES
// =============================================================================

export type PlaybookPermission = 
    | 'email'
    | 'sms'
    | 'pos_integration'
    | 'crm'
    | 'google_business'
    | 'push_notifications'
    | 'wholesale'
    | 'traceability'
    | 'scanner'
    | 'location'
    | 'notifications'
    | 'preferences';

export interface SetupQuestion {
    id: string;
    label: string;
    type: 'text' | 'select' | 'number' | 'time' | 'multi-select';
    placeholder?: string;
    options?: { value: string; label: string }[];
    required?: boolean;
    defaultValue?: string | number;
}

export interface RecommendedPlaybook {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    agents: string[];
    trigger: string;
    permissions: PlaybookPermission[];
    setupQuestions: SetupQuestion[];
    category: 'intel' | 'marketing' | 'ops' | 'loyalty';
    audience: 'dispensary' | 'brand' | 'customer';
}

// =============================================================================
// MVP PLAYBOOKS DATA
// =============================================================================

export const SMOKEY_RECOMMENDS_PLAYBOOKS: RecommendedPlaybook[] = [
    {
        id: 'competitor_price_match',
        name: 'Competitor Price Match Alert',
        description: 'Get notified when competitors undercut your prices on key products',
        icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
        agents: ['Ezal', 'Money Mike'],
        trigger: 'Daily',
        permissions: [],
        category: 'intel',
        audience: 'dispensary',
        setupQuestions: [
            {
                id: 'competitors',
                label: 'Which competitors to watch?',
                type: 'multi-select',
                options: [], // Populated dynamically
                required: true,
            },
            {
                id: 'threshold',
                label: 'Alert when price difference exceeds',
                type: 'select',
                options: [
                    { value: '5', label: '$5 or more' },
                    { value: '10', label: '$10 or more' },
                    { value: '15', label: '$15 or more' },
                ],
                defaultValue: '5',
            },
        ],
    },
    {
        id: 'review_response',
        name: 'Review Response Autopilot',
        description: 'Auto-generate responses to new Google & Weedmaps reviews',
        icon: <Star className="h-5 w-5 text-yellow-500" />,
        agents: ['Smokey', 'Deebo'],
        trigger: 'On new review',
        permissions: ['google_business'],
        category: 'marketing',
        audience: 'dispensary',
        setupQuestions: [
            {
                id: 'auto_post',
                label: 'Posting mode',
                type: 'select',
                options: [
                    { value: 'auto', label: 'Auto-post responses' },
                    { value: 'approve', label: 'Send for approval first' },
                ],
                defaultValue: 'approve',
            },
            {
                id: 'tone',
                label: 'Response tone',
                type: 'select',
                options: [
                    { value: 'friendly', label: 'Friendly & Casual' },
                    { value: 'professional', label: 'Professional' },
                    { value: 'enthusiastic', label: 'Enthusiastic' },
                ],
                defaultValue: 'friendly',
            },
        ],
    },
    {
        id: 'win_back_campaign',
        name: 'Win-Back Campaign',
        description: 'Auto-reach customers who haven\'t visited in 30+ days',
        icon: <Users className="h-5 w-5 text-purple-500" />,
        agents: ['Mrs. Parker', 'Craig'],
        trigger: 'Weekly',
        permissions: ['crm', 'email'],
        category: 'loyalty',
        audience: 'dispensary',
        setupQuestions: [
            {
                id: 'inactive_days',
                label: 'Days before considered inactive',
                type: 'number',
                placeholder: '30',
                defaultValue: 30,
            },
            {
                id: 'offer',
                label: 'Win-back offer',
                type: 'select',
                options: [
                    { value: '10_percent', label: '10% off next purchase' },
                    { value: '15_percent', label: '15% off next purchase' },
                    { value: '20_percent', label: '20% off next purchase' },
                    { value: 'free_item', label: 'Free item (specify in message)' },
                ],
                defaultValue: '15_percent',
            },
        ],
    },
    {
        id: 'weekly_top_sellers',
        name: 'Weekly Top Sellers Report',
        description: 'Email digest of your best-performing products every Monday',
        icon: <TrendingUp className="h-5 w-5 text-green-500" />,
        agents: ['Pops', 'Money Mike'],
        trigger: 'Mondays 9 AM',
        permissions: ['pos_integration', 'email'],
        category: 'ops',
        audience: 'dispensary',
        setupQuestions: [
            {
                id: 'top_count',
                label: 'How many products to include?',
                type: 'select',
                options: [
                    { value: '5', label: 'Top 5' },
                    { value: '10', label: 'Top 10' },
                    { value: '15', label: 'Top 15' },
                ],
                defaultValue: '10',
            },
            {
                id: 'include_margins',
                label: 'Include margin data?',
                type: 'select',
                options: [
                    { value: 'yes', label: 'Yes, show margins' },
                    { value: 'no', label: 'No, just sales data' },
                ],
                defaultValue: 'yes',
            },
        ],
    },
    {
        id: 'low_stock_alert',
        name: 'Low Stock Alert',
        description: 'Get notified when popular products drop below threshold',
        icon: <Package className="h-5 w-5 text-red-500" />,
        agents: ['Pops', 'Smokey'],
        trigger: 'Hourly check',
        permissions: ['pos_integration'],
        category: 'ops',
        audience: 'dispensary',
        setupQuestions: [
            {
                id: 'threshold',
                label: 'Alert when stock falls below',
                type: 'number',
                placeholder: '10',
                defaultValue: 10,
            },
            {
                id: 'categories',
                label: 'Categories to monitor',
                type: 'multi-select',
                options: [
                    { value: 'flower', label: 'Flower' },
                    { value: 'concentrates', label: 'Concentrates' },
                    { value: 'edibles', label: 'Edibles' },
                    { value: 'vapes', label: 'Vapes' },
                    { value: 'all', label: 'All categories' },
                ],
            },
        ],
    },

    // BRAND PLAYBOOKS
    {
        id: 'price_violation_map',
        name: 'Price Violation Watch (MAP)',
        description: 'Alert when retailers list products below MAP',
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
        agents: ['Money Mike', 'Ezal'],
        trigger: 'Daily',
        permissions: ['scanner'],
        category: 'intel',
        audience: 'brand',
        setupQuestions: [
            {
                id: 'map_price',
                label: 'MAP Price ($)',
                type: 'number',
                placeholder: '25.00',
                required: true,
            },
            {
                id: 'variance_percent',
                label: 'Allowed Variance (%)',
                type: 'number',
                placeholder: '5',
                defaultValue: 5,
            },
        ],
    },
    {
        id: 'new_store_opener',
        name: 'New Store Opener',
        description: 'Auto-send intro kits to new licenses in territory',
        icon: <Store className="h-5 w-5 text-blue-500" />,
        agents: ['Deebo', 'Craig'],
        trigger: 'Weekly',
        permissions: ['email'],
        category: 'marketing',
        audience: 'brand',
        setupQuestions: [
            {
                id: 'territory',
                label: 'Territory State',
                type: 'select',
                options: [
                    { value: 'CA', label: 'California' },
                    { value: 'CO', label: 'Colorado' },
                    { value: 'MI', label: 'Michigan' },
                    { value: 'MA', label: 'Massachusetts' },
                ],
                defaultValue: 'CA',
            },
            {
                id: 'send_email',
                label: 'Send emails automatically?',
                type: 'select',
                options: [
                    { value: 'true', label: 'Yes, auto-send' },
                    { value: 'false', label: 'No, draft only' },
                ],
                defaultValue: 'false',
            },
        ],
    },
    {
        id: 'retailer_stockout',
        name: 'Retailer Stockout Alert',
        description: 'Notify sales rep when a partner menu is missing SKUs',
        icon: <Package className="h-5 w-5 text-orange-500" />,
        agents: ['Pops', 'Craig'],
        trigger: 'Daily',
        permissions: ['scanner'],
        category: 'ops',
        audience: 'brand',
        setupQuestions: [
            {
                id: 'threshold',
                label: 'Alert threshold (units)',
                type: 'number',
                placeholder: '0',
                defaultValue: 0,
            },
        ],
    },
    {
        id: 'shelf_space_alert',
        name: 'Competitor Shelf Space Alert',
        description: 'Track competitor product launches at your accounts',
        icon: <Search className="h-5 w-5 text-purple-500" />,
        agents: ['Ezal'],
        trigger: 'Weekly',
        permissions: ['scanner'],
        category: 'intel',
        audience: 'brand',
        setupQuestions: [
            {
                id: 'competitors',
                label: 'Competitors to watch',
                type: 'multi-select',
                options: [
                    { value: 'stiiizy', label: 'STIIIZY' },
                    { value: 'jeetert', label: 'Jeeter' },
                    { value: 'wyld', label: 'Wyld' },
                    { value: 'kiva', label: 'Kiva' },
                ], 
            },
        ],
    },
    {
        id: 'slow_mover_alert',
        name: 'Slow Mover Alert',
        description: 'Identify accounts with low velocity / no reorder',
        icon: <BarChart3 className="h-5 w-5 text-yellow-600" />,
        agents: ['Pops'],
        trigger: 'Weekly',
        permissions: ['wholesale'],
        category: 'ops',
        audience: 'brand',
        setupQuestions: [
            {
                id: 'days_without_reorder',
                label: 'Days without reorder',
                type: 'number',
                placeholder: '45',
                defaultValue: 45,
            },
        ],
    },
    // CONSUMER PLAYBOOKS
    {
        id: 'deal_hunter',
        name: 'Deal Hunter',
        description: 'Alerts on deals for favorite brands nearby',
        icon: <ShoppingBag className="h-5 w-5 text-green-500" />,
        agents: ['Money Mike', 'Ezal'],
        trigger: 'Daily',
        permissions: ['location', 'notifications'],
        category: 'marketing',
        audience: 'customer',
        setupQuestions: [
            {
                id: 'brands',
                label: 'Favorite Brands',
                type: 'multi-select',
                options: [
                    { value: 'stiiizy', label: 'STIIIZY' },
                    { value: 'wyld', label: 'Wyld' },
                    { value: 'kiva', label: 'Kiva' },
                    { value: 'cbx', label: 'CBX' },
                ], 
            },
            {
                id: 'max_distance',
                label: 'Max Distance (miles)',
                type: 'number',
                placeholder: '10',
                defaultValue: 10,
            },
        ],
    },
    {
        id: 'fresh_drop',
        name: 'Fresh Drop Alert',
        description: 'Notify when new hyped strains land nearby',
        icon: <Zap className="h-5 w-5 text-yellow-500" />,
        agents: ['Ezal', 'Smokey'],
        trigger: 'Hourly',
        permissions: ['location', 'notifications'],
        category: 'marketing',
        audience: 'customer',
        setupQuestions: [
            {
                id: 'strains',
                label: 'Strains/Keywords to Watch',
                type: 'text',
                placeholder: 'e.g. Wedding Cake, Blue Dream',
            },
        ],
    },
    {
        id: 're_up_reminder',
        name: 'The Re-Up Reminder',
        description: 'Personal nudge before you run dry',
        icon: <Package className="h-5 w-5 text-purple-500" />,
        agents: ['Pops', 'Mrs. Parker'],
        trigger: 'Smart Prediction',
        permissions: ['preferences'],
        category: 'loyalty',
        audience: 'customer',
        setupQuestions: [
            {
                id: 'usage_rate',
                label: 'Weekly Consumption (g)',
                type: 'number',
                placeholder: '3.5',
                defaultValue: 3.5,
            },
        ],
    },
    {
        id: 'consumption_journal',
        name: 'Consumption Journal',
        description: 'Prompt to rate yesterday\'s purchase',
        icon: <Star className="h-5 w-5 text-yellow-400" />,
        agents: ['Smokey'],
        trigger: 'Post-Visit',
        permissions: ['notifications'],
        category: 'loyalty',
        audience: 'customer',
        setupQuestions: [
            {
                id: 'time',
                label: 'Preferred Prompt Time',
                type: 'select',
                options: [
                    { value: 'morning', label: 'Morning (10 AM)' },
                    { value: 'evening', label: 'Evening (7 PM)' },
                ],
                defaultValue: 'evening',
            },
        ],
    },
    {
        id: 'strain_of_week',
        name: 'Strain of the Week',
        description: 'Weekly curated pick based on your taste',
        icon: <Sparkles className="h-5 w-5 text-blue-400" />,
        agents: ['Smokey'],
        trigger: 'Fridays',
        permissions: ['preferences'],
        category: 'intel',
        audience: 'customer',
        setupQuestions: [],
    },
];

// =============================================================================
// PERMISSION LABELS
// =============================================================================

const PERMISSION_LABELS: Record<PlaybookPermission, string> = {
    email: 'Email',
    sms: 'SMS',
    pos_integration: 'POS Integration',
    crm: 'Customer Data',
    google_business: 'Google Business',
    push_notifications: 'Push Notifications',
    wholesale: 'Wholesale Platform',
    traceability: 'State Traceability',
    scanner: 'Menu Scanner',
    location: 'Location Services',
    notifications: 'Push Notifications',
    preferences: 'Taste Profile',
};

// =============================================================================
// COMPONENT: SmokeyRecommendsCard
// =============================================================================

interface SmokeyRecommendsCardProps {
    playbook: RecommendedPlaybook;
    isEnabled: boolean;
    onToggle: (enabled: boolean, config?: PlaybookConfig) => void;
    onEdit: () => void;
}

export function SmokeyRecommendsCard({
    playbook,
    isEnabled,
    onToggle,
    onEdit,
}: SmokeyRecommendsCardProps) {
    const [showWizard, setShowWizard] = useState(false);

    const handleToggle = (checked: boolean) => {
        if (checked && !isEnabled) {
            // Opening - show wizard to collect config
            setShowWizard(true);
        } else if (!checked && isEnabled) {
            // Turning off
            onToggle(false);
        }
    };

    const handleWizardComplete = (config: PlaybookConfig) => {
        setShowWizard(false);
        onToggle(true, config);
    };

    const handleWizardCancel = () => {
        setShowWizard(false);
    };

    return (
        <>
            <Card className={`transition-all ${isEnabled ? 'border-primary/50 bg-primary/5' : ''}`}>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                                {playbook.icon}
                            </div>
                            <div>
                                <CardTitle className="text-base">{playbook.name}</CardTitle>
                                <CardDescription className="text-sm mt-1">
                                    {playbook.description}
                                </CardDescription>
                            </div>
                        </div>
                        <Switch
                            checked={isEnabled}
                            onCheckedChange={handleToggle}
                            aria-label={`Toggle ${playbook.name}`}
                        />
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                {playbook.trigger}
                            </Badge>
                            {playbook.agents.map(agent => (
                                <Badge key={agent} variant="outline" className="text-xs">
                                    {agent}
                                </Badge>
                            ))}
                        </div>
                        {isEnabled && (
                            <Button variant="ghost" size="sm" onClick={onEdit}>
                                <Settings2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    {playbook.permissions.length > 0 && (
                        <div className="mt-3 text-xs text-muted-foreground">
                            Requires: {playbook.permissions.map(p => PERMISSION_LABELS[p]).join(', ')}
                        </div>
                    )}
                </CardContent>
            </Card>

            {showWizard && (
                <PlaybookSetupWizard
                    playbook={playbook}
                    open={showWizard}
                    onComplete={handleWizardComplete}
                    onCancel={handleWizardCancel}
                />
            )}
        </>
    );
}

// =============================================================================
// COMPONENT: SmokeyRecommendsSection
// =============================================================================

interface SmokeyRecommendsSectionProps {
    enabledPlaybooks: Record<string, PlaybookConfig>;
    onPlaybookToggle: (playbookId: string, enabled: boolean, config?: PlaybookConfig) => void;
    onPlaybookEdit: (playbookId: string) => void;
}

export function SmokeyRecommendsSection({
    enabledPlaybooks,
    onPlaybookToggle,
    onPlaybookEdit,
}: SmokeyRecommendsSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <div>
                        <h2 className="text-lg font-semibold">Smokey Recommends</h2>
                        <p className="text-xs text-muted-foreground">Automated Agent Playbooks</p>
                    </div>
                </div>
            </div>
            
            <Tabs defaultValue="dispensary" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="dispensary" className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        Dispensary
                    </TabsTrigger>
                    <TabsTrigger value="brand" className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Brand / CPG
                    </TabsTrigger>
                    <TabsTrigger value="customer" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Customer
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="dispensary">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {SMOKEY_RECOMMENDS_PLAYBOOKS
                            .filter(p => p.audience === 'dispensary')
                            .map(playbook => (
                            <SmokeyRecommendsCard
                                key={playbook.id}
                                playbook={playbook}
                                isEnabled={!!enabledPlaybooks[playbook.id]}
                                onToggle={(enabled, config) => onPlaybookToggle(playbook.id, enabled, config)}
                                onEdit={() => onPlaybookEdit(playbook.id)}
                            />
                        ))}
                    </div>
                </TabsContent>
                
                <TabsContent value="brand">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {SMOKEY_RECOMMENDS_PLAYBOOKS
                            .filter(p => p.audience === 'brand')
                            .map(playbook => (
                            <SmokeyRecommendsCard
                                key={playbook.id}
                                playbook={playbook}
                                isEnabled={!!enabledPlaybooks[playbook.id]}
                                onToggle={(enabled, config) => onPlaybookToggle(playbook.id, enabled, config)}
                                onEdit={() => onPlaybookEdit(playbook.id)}
                            />
                        ))}
                    </div>
                </TabsContent>
                
                <TabsContent value="customer">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {SMOKEY_RECOMMENDS_PLAYBOOKS
                            .filter(p => p.audience === 'customer')
                            .map(playbook => (
                            <SmokeyRecommendsCard
                                key={playbook.id}
                                playbook={playbook}
                                isEnabled={!!enabledPlaybooks[playbook.id]}
                                onToggle={(enabled, config) => onPlaybookToggle(playbook.id, enabled, config)}
                                onEdit={() => onPlaybookEdit(playbook.id)}
                            />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
