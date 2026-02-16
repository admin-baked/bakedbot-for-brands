'use client';

/**
 * Heartbeat Diagnostic Panel
 *
 * Shows heartbeat system status with diagnostic info and magic fix button
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Info,
    Loader2,
    RefreshCw,
    Wrench,
    XCircle,
} from 'lucide-react';
import { diagnoseHeartbeat, fixHeartbeat } from '@/server/actions/heartbeat';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticIssue {
    severity: 'critical' | 'warning' | 'info';
    category: string;
    message: string;
    autoFixable: boolean;
}

export function HeartbeatDiagnosticPanel() {
    const [loading, setLoading] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [diagnostic, setDiagnostic] = useState<{
        healthy?: boolean;
        issues?: DiagnosticIssue[];
        info?: string[];
    } | null>(null);
    const [fixes, setFixes] = useState<string[]>([]);
    const { toast } = useToast();

    const runDiagnostic = async () => {
        setLoading(true);
        setFixes([]);
        try {
            const result = await diagnoseHeartbeat();
            if (result.success) {
                setDiagnostic({
                    healthy: result.healthy,
                    issues: result.issues,
                    info: result.info,
                });

                if (result.healthy) {
                    toast({
                        title: 'Heartbeat System Healthy',
                        description: 'No issues detected',
                    });
                } else {
                    const criticalCount = result.issues?.filter(i => i.severity === 'critical').length || 0;
                    const warningCount = result.issues?.filter(i => i.severity === 'warning').length || 0;
                    toast({
                        title: 'Issues Detected',
                        description: `${criticalCount} critical, ${warningCount} warnings`,
                        variant: criticalCount > 0 ? 'destructive' : 'default',
                    });
                }
            } else {
                toast({
                    title: 'Diagnostic Failed',
                    description: result.error || 'Unknown error',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Diagnostic Failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const runFix = async () => {
        setFixing(true);
        try {
            const result = await fixHeartbeat();
            if (result.success) {
                setFixes(result.fixes || []);
                toast({
                    title: 'Heartbeat Fixed!',
                    description: `Applied ${result.fixes?.length || 0} fix(es)`,
                });

                // Re-run diagnostic after fix
                setTimeout(() => runDiagnostic(), 1000);
            } else {
                toast({
                    title: 'Fix Failed',
                    description: result.error || 'Unknown error',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Fix Failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive',
            });
        } finally {
            setFixing(false);
        }
    };

    const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
        switch (severity) {
            case 'critical':
                return <XCircle className="w-4 h-4 text-destructive" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
            case 'info':
                return <Info className="w-4 h-4 text-blue-600" />;
        }
    };

    const getSeverityBadge = (severity: 'critical' | 'warning' | 'info') => {
        const variants = {
            critical: 'destructive' as const,
            warning: 'secondary' as const,
            info: 'outline' as const,
        };
        return (
            <Badge variant={variants[severity]} className="text-xs">
                {severity}
            </Badge>
        );
    };

    const criticalIssues = diagnostic?.issues?.filter(i => i.severity === 'critical') || [];
    const warnings = diagnostic?.issues?.filter(i => i.severity === 'warning') || [];
    const infoIssues = diagnostic?.issues?.filter(i => i.severity === 'info') || [];
    const autoFixableCount = diagnostic?.issues?.filter(i => i.autoFixable).length || 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Heartbeat Diagnostic
                        </CardTitle>
                        <CardDescription>
                            Check and fix heartbeat system issues
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={runDiagnostic}
                            disabled={loading || fixing}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            <span className="ml-2">Run Diagnostic</span>
                        </Button>
                        {diagnostic && !diagnostic.healthy && autoFixableCount > 0 && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={runFix}
                                disabled={loading || fixing}
                            >
                                {fixing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Wrench className="w-4 h-4" />
                                )}
                                <span className="ml-2">Magic Fix</span>
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Status Badge */}
                {diagnostic && (
                    <div className="flex items-center gap-2">
                        {diagnostic.healthy ? (
                            <>
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-green-600">
                                    Heartbeat System Healthy
                                </span>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-5 h-5 text-destructive" />
                                <span className="text-sm font-medium text-destructive">
                                    Issues Detected
                                </span>
                            </>
                        )}
                    </div>
                )}

                {/* Fixes Applied */}
                {fixes.length > 0 && (
                    <Alert>
                        <CheckCircle2 className="w-4 h-4" />
                        <AlertDescription>
                            <div className="font-medium mb-2">✨ Applied {fixes.length} fix(es):</div>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {fixes.map((fix, i) => (
                                    <li key={i}>{fix}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Critical Issues */}
                {criticalIssues.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-destructive" />
                            <span className="text-sm font-medium">
                                Critical Issues ({criticalIssues.length})
                            </span>
                        </div>
                        <div className="space-y-2 pl-6">
                            {criticalIssues.map((issue, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                    {getSeverityIcon(issue.severity)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">[{issue.category}]</span>
                                            {issue.autoFixable && (
                                                <Badge variant="outline" className="text-xs">
                                                    Auto-fixable ✨
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground">{issue.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Warnings */}
                {warnings.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium">
                                Warnings ({warnings.length})
                            </span>
                        </div>
                        <div className="space-y-2 pl-6">
                            {warnings.map((issue, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                    {getSeverityIcon(issue.severity)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">[{issue.category}]</span>
                                            {issue.autoFixable && (
                                                <Badge variant="outline" className="text-xs">
                                                    Auto-fixable ✨
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground">{issue.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info */}
                {infoIssues.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium">
                                Information ({infoIssues.length})
                            </span>
                        </div>
                        <div className="space-y-2 pl-6">
                            {infoIssues.map((issue, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                    {getSeverityIcon(issue.severity)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">[{issue.category}]</span>
                                            {issue.autoFixable && (
                                                <Badge variant="outline" className="text-xs">
                                                    Auto-fixable ✨
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground">{issue.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* System Info */}
                {diagnostic?.info && diagnostic.info.length > 0 && (
                    <div className="rounded-lg bg-muted p-3 space-y-1">
                        <div className="text-sm font-medium mb-2">System Information</div>
                        {diagnostic.info.map((info, i) => (
                            <div key={i} className="text-sm text-muted-foreground">
                                • {info}
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!diagnostic && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Click "Run Diagnostic" to check heartbeat system status</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
