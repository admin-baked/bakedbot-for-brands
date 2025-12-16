'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Play, AlertCircle, CheckCircle } from 'lucide-react';
import { runDispensaryScan, runBrandScan } from '@/server/actions/page-generation';
import { deleteAllPages } from '@/server/actions/delete-pages';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2 } from 'lucide-react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getJobHistory, JobRecord } from '@/server/actions/job-history';
import { RefreshCcw, Clock, CheckCircle2, XCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';

export default function OperationsTab() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [batchSize, setBatchSize] = useState('50');
    const [dryRun, setDryRun] = useState(true);
    const [jobType, setJobType] = useState('dispensaries'); // dispensaries | brands

    const [result, setResult] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);
    const [history, setHistory] = useState<JobRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const data = await getJobHistory();
            setHistory(data);
        } catch (e: any) {
            console.error(e);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadHistory();
    }, []);

    const handleDeleteAll = async () => {
        setDeleting(true);
        try {
            const res = await deleteAllPages();
            if (res.success) {
                toast({
                    title: "Pages Deleted",
                    description: "All generated pages and metadata have been removed.",
                });
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: error.message,
            });
        } finally {
            setDeleting(false);
        }
    };

    const handleRunJob = async () => {
        setLoading(true);
        setResult(null);
        try {
            const limit = parseInt(batchSize, 10);
            let res;

            if (jobType === 'dispensaries') {
                res = await runDispensaryScan(limit, dryRun);
            } else {
                res = await runBrandScan(limit, dryRun);
            }

            setResult(res);

            if (res.success) {
                toast({
                    title: "Job Completed",
                    description: `Processed ${res.itemsFound} items. Created ${res.pagesCreated} pages.`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Job Failed",
                    description: res.errors.join(', '),
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Batch Page Generator</CardTitle>
                        <CardDescription>
                            Create verified SEO pages for Dispensaries and Brands in batches.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Job Type</Label>
                            <Select value={jobType} onValueChange={setJobType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dispensaries">Dispensaries & ZIPs</SelectItem>
                                    <SelectItem value="brands">Brands</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Batch Size</Label>
                            <Select value={batchSize} onValueChange={setBatchSize}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="50">50 Items</SelectItem>
                                    <SelectItem value="100">100 Items</SelectItem>
                                    <SelectItem value="500">500 Items</SelectItem>
                                    <SelectItem value="1000">1000 Items</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Dry Run Mode</Label>
                                <div className="text-sm text-muted-foreground">
                                    Simulate the scan without creating pages in Firestore.
                                </div>
                            </div>
                            <Switch checked={dryRun} onCheckedChange={setDryRun} />
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleRunJob}
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {!loading && <Play className="mr-2 h-4 w-4" />}
                            Start Batch Job
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Job Status</CardTitle>
                        <CardDescription>
                            Output logs and results.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!result && !loading && (
                            <div className="text-center text-sm text-muted-foreground py-10">
                                Ready to start.
                            </div>
                        )}

                        {loading && (
                            <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Processing batch... do not close this tab.</p>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-4">
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {result.success ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                    <span className="font-medium">{result.success ? 'Success' : 'Failed'}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border p-3">
                                        <div className="text-sm font-medium text-muted-foreground">Items Found</div>
                                        <div className="text-2xl font-bold">{result.itemsFound}</div>
                                    </div>
                                    <div className="rounded-lg border p-3">
                                        <div className="text-sm font-medium text-muted-foreground">Pages Created</div>
                                        <div className="text-2xl font-bold">{result.pagesCreated}</div>
                                    </div>
                                </div>

                                {result.errors && result.errors.length > 0 && (
                                    <Alert variant="destructive">
                                        <AlertTitle>Errors Occurred</AlertTitle>
                                        <AlertDescription className="max-h-[200px] overflow-y-auto">
                                            <ul className="list-disc pl-4 space-y-1">
                                                {result.errors.map((err: string, i: number) => (
                                                    <li key={i} className="text-xs">{err}</li>
                                                ))}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Batch History</CardTitle>
                        <CardDescription>Recent page generation jobs.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={loadHistory} disabled={historyLoading}>
                        <RefreshCcw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Pages</TableHead>
                                    <TableHead>Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                            No jobs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    history.map((job) => (
                                        <TableRow key={job.id}>
                                            <TableCell>
                                                {job.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                                                {job.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                                {job.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                                            </TableCell>
                                            <TableCell className="capitalize">{job.type}</TableCell>
                                            <TableCell>{job.result?.itemsFound ?? '-'}</TableCell>
                                            <TableCell>{job.result?.pagesCreated ?? '-'}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">
                                                {job.startedAt ? formatDistanceToNow(job.startedAt, { addSuffix: true }) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>


            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        Desctructive actions for data management.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="font-medium">Delete All Generated Pages</div>
                            <div className="text-sm text-muted-foreground">
                                Permanently remove all SEO pages and metadata. This cannot be undone.
                            </div>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={deleting || loading}>
                                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete All Pages
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action will permanently delete all generated pages from the database.
                                        This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700">
                                        Yes, Delete Everything
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
