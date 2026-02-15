'use client';



import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, ShieldAlert, Search } from 'lucide-react';
import { auditContent, type AuditResult } from './actions';
import { COMPLIANCE_RULES, JURISDICTIONS } from '@/data/compliance-rules';

export default function CompliancePage() {
    const [jurisdiction, setJurisdiction] = useState('CA');
    const [content, setContent] = useState('');
    const [result, setResult] = useState<AuditResult | null>(null);
    const [isAuditing, setIsAuditing] = useState(false);

    const handleAudit = async () => {
        setIsAuditing(true);
        try {
            const res = await auditContent(content, jurisdiction);
            setResult(res);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAuditing(false);
        }
    };

    const activeRules = COMPLIANCE_RULES.filter(r => r.jurisdiction === jurisdiction || r.jurisdiction === 'Federal');

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Compliance (Deebo)</h1>
                <p className="text-muted-foreground">
                    Ensure your marketing and packaging meets state regulations.
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="w-[200px]">
                    <Label htmlFor="jurisdiction" className="mb-2 block">Jurisdiction</Label>
                    <Select value={jurisdiction} onValueChange={setJurisdiction}>
                        <SelectTrigger id="jurisdiction">
                            <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                            {JURISDICTIONS.map(j => (
                                <SelectItem key={j} value={j}>{j}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs defaultValue="auditor" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="auditor">Content Auditor</TabsTrigger>
                    <TabsTrigger value="rules">Active Rules</TabsTrigger>
                </TabsList>

                <TabsContent value="auditor" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Content Checker</CardTitle>
                            <CardDescription>
                                Paste your email copy, SMS text, or website content here to check for compliance violations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="E.g. Get free weed at our new store!"
                                className="min-h-[150px]"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                            <Button onClick={handleAudit} disabled={isAuditing || !content}>
                                {isAuditing ? 'Analyzing...' : 'Audit Content'}
                            </Button>

                            {result && (
                                <div className="mt-6 space-y-4">
                                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold">{result.score}/100</div>
                                            <div className="text-xs text-muted-foreground">Compliance Score</div>
                                        </div>
                                        <div className="h-10 w-px bg-border" />
                                        <div>
                                            {result.passed ? (
                                                <div className="flex items-center gap-2 text-green-600 font-medium">
                                                    <CheckCircle2 className="h-5 w-5" /> No Violations Found
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-600 font-medium">
                                                    <AlertTriangle className="h-5 w-5" /> Violations Detected
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {result.violations.map((v, i) => (
                                        <Alert key={i} variant={v.severity === 'High' ? 'destructive' : 'default'} className={v.severity === 'High' ? '' : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-900 dark:text-yellow-200'}>
                                            <ShieldAlert className="h-4 w-4" />
                                            <AlertTitle className="font-bold">{v.severity} Severity: {v.description}</AlertTitle>
                                            <AlertDescription>
                                                <p>{v.reason}</p>
                                                <p className="mt-1 text-xs opacity-80">Matched: "{v.match}"</p>
                                            </AlertDescription>
                                        </Alert>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="rules">
                    <Card>
                        <CardHeader>
                            <CardTitle>Rule Pack: {jurisdiction}</CardTitle>
                            <CardDescription>All active rules enforcing {jurisdiction} and Federal regulations.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {activeRules.map((rule) => (
                                    <div key={rule.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {rule.description}
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${rule.severity === 'High' ? 'bg-red-100 text-red-700 border-red-200' :
                                                        rule.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                            'bg-blue-100 text-blue-700 border-blue-200'
                                                    }`}>
                                                    {rule.severity}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">{rule.reason}</p>
                                            {rule.keywords && (
                                                <div className="text-xs text-muted-foreground mt-2">
                                                    Restricted: {rule.keywords.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
