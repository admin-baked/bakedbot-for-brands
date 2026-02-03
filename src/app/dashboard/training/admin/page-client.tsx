/**
 * Training Admin Dashboard - Client Component
 *
 * Interactive admin interface for managing training program.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { TrainingCohort, TrainingSubmission } from '@/types/training';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    TrendingUp,
    FileText,
    Calendar,
    BarChart3,
    UserPlus,
} from 'lucide-react';

interface TrainingAdminClientProps {
    cohorts: TrainingCohort[];
    recentSubmissions: TrainingSubmission[];
    stats: {
        totalCohorts: number;
        activeParticipants: number;
        totalSubmissions: number;
        approvedSubmissions: number;
        approvalRate: number;
    };
}

export function TrainingAdminClient({ cohorts, recentSubmissions, stats }: TrainingAdminClientProps) {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Training Admin</h1>
                    <p className="text-muted-foreground mt-2">Manage cohorts and monitor intern progress</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/training/admin/new-cohort">
                        <UserPlus className="mr-2 h-4 w-4" />
                        New Cohort
                    </Link>
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Cohorts</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCohorts}</div>
                        <p className="text-xs text-muted-foreground">
                            {cohorts.filter((c) => c.status === 'active').length} currently active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Interns</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeParticipants}</div>
                        <p className="text-xs text-muted-foreground">Currently enrolled</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.approvedSubmissions}</div>
                        <p className="text-xs text-muted-foreground">{stats.approvalRate}% approval rate</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">Coming soon</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
                    <TabsTrigger value="submissions">Recent Submissions</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <Alert>
                        <BarChart3 className="h-4 w-4" />
                        <AlertDescription>
                            This is the admin dashboard for managing the training program. Use the tabs above to
                            view cohorts, submissions, and analytics.
                        </AlertDescription>
                    </Alert>

                    {/* Active Cohorts */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Cohorts</CardTitle>
                            <CardDescription>Currently running training cohorts</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {cohorts.filter((c) => c.status === 'active').length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No active cohorts. Create one to get started.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {cohorts
                                        .filter((c) => c.status === 'active')
                                        .slice(0, 5)
                                        .map((cohort) => (
                                            <div
                                                key={cohort.id}
                                                className="flex items-center justify-between p-3 border rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-medium">{cohort.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {cohort.participantIds.length} / {cohort.maxParticipants}{' '}
                                                        participants
                                                    </p>
                                                </div>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/dashboard/training/admin/cohorts/${cohort.id}`}>
                                                        View
                                                    </Link>
                                                </Button>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Cohorts Tab */}
                <TabsContent value="cohorts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Cohorts</CardTitle>
                            <CardDescription>Manage training cohorts and enrollments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {cohorts.map((cohort) => (
                                    <Card key={cohort.id}>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-base">{cohort.name}</CardTitle>
                                                    <CardDescription>
                                                        <Calendar className="inline h-3 w-3 mr-1" />
                                                        Started{' '}
                                                        {new Date(
                                                            cohort.startDate.seconds * 1000
                                                        ).toLocaleDateString()}
                                                    </CardDescription>
                                                </div>
                                                <Badge
                                                    variant={
                                                        cohort.status === 'active'
                                                            ? 'default'
                                                            : cohort.status === 'completed'
                                                            ? 'secondary'
                                                            : 'outline'
                                                    }
                                                >
                                                    {cohort.status}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm">
                                                    <Users className="inline h-4 w-4 mr-1" />
                                                    {cohort.participantIds.length} / {cohort.maxParticipants}{' '}
                                                    participants
                                                </div>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/dashboard/training/admin/cohorts/${cohort.id}`}>
                                                        Manage
                                                    </Link>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Submissions Tab */}
                <TabsContent value="submissions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Submissions</CardTitle>
                            <CardDescription>Latest 50 submissions across all cohorts</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {recentSubmissions.map((sub) => (
                                    <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">
                                                Challenge: {sub.challengeId.split('-')[0]} Week{' '}
                                                {sub.challengeId.match(/\d+/)?.[0]}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                <Clock className="inline h-3 w-3 mr-1" />
                                                {new Date(sub.submittedAt.seconds * 1000).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {sub.status === 'approved' && (
                                                <Badge className="bg-green-600">
                                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                                    Approved
                                                </Badge>
                                            )}
                                            {sub.status === 'needs_revision' && (
                                                <Badge variant="destructive">
                                                    <XCircle className="mr-1 h-3 w-3" />
                                                    Needs Work
                                                </Badge>
                                            )}
                                            {sub.status === 'reviewing' && (
                                                <Badge variant="secondary">
                                                    <Clock className="mr-1 h-3 w-3" />
                                                    Reviewing
                                                </Badge>
                                            )}
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/dashboard/training/submissions/${sub.id}`}>View</Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Analytics Coming Soon</CardTitle>
                            <CardDescription>Detailed analytics and reporting features</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 py-4">
                                <div className="text-sm text-muted-foreground">
                                    <h3 className="font-medium text-foreground mb-2">Planned Features:</h3>
                                    <ul className="space-y-1 ml-4">
                                        <li>• Completion rate by week</li>
                                        <li>• Average review scores by challenge</li>
                                        <li>• Time to completion metrics</li>
                                        <li>• Cohort comparison charts</li>
                                        <li>• Individual intern progress tracking</li>
                                        <li>• Challenge difficulty analysis</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
