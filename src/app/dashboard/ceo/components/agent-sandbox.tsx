
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Play, Terminal, Database, Copy } from 'lucide-react';
import { listAgentsAction, listToolsAction, executeToolAction } from '@/server/actions/super-admin/sandbox';
import { seedSandboxData } from '@/server/actions/super-admin/seed-sandbox'; // Add Import
import { AgentCapability } from '@/server/agents/agent-definitions';
import { ToolDefinition } from '@/types/agent-toolkit';
import { useToast } from '@/hooks/use-toast';

export function AgentSandbox() {
    const [agents, setAgents] = useState<AgentCapability[]>([]);
    const [tools, setTools] = useState<Partial<ToolDefinition>[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<string>('');
    const [selectedTool, setSelectedTool] = useState<string>('');
    const [inputs, setInputs] = useState<string>('{}');
    const [output, setOutput] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [executionTime, setExecutionTime] = useState<number>(0);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Load capabilities on mount
        const loadData = async () => {
            try {
                const [agentList, toolList] = await Promise.all([
                    listAgentsAction(),
                    listToolsAction()
                ]);
                setAgents(agentList);
                setTools(toolList);
            } catch (err: any) {
                console.error('Failed to load sandbox data:', err);
                setError(err.message || 'Failed to load configuration. You may need to relogin.');
            }
        };
        loadData();
    }, []);

    const handleToolChange = (toolName: string) => {
        setSelectedTool(toolName);
        const tool = tools.find(t => t.name === toolName);
        if (tool?.inputSchema) {
            // Generate a primitive skeleton from schema
            const skeleton = generateSkeleton(tool.inputSchema);
            setInputs(JSON.stringify(skeleton, null, 2));
        } else {
            setInputs('{}');
        }
    };

    const generateSkeleton = (schema: any) => {
        if (!schema || schema.type !== 'object' || !schema.properties) return {};
        const obj: any = {};
        for (const [key, value] of Object.entries(schema.properties as any)) {
            const prop = value as any;
            if (prop.type === 'string') obj[key] = "string";
            else if (prop.type === 'number') obj[key] = 0;
            else if (prop.type === 'boolean') obj[key] = false;
            else if (prop.type === 'array') obj[key] = [];
            else obj[key] = null;
        }
        return obj;
    };

    const { toast } = useToast();

    const [elapsedTime, setElapsedTime] = useState<number>(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (loading) {
            const startTime = Date.now();
            setElapsedTime(0);
            interval = setInterval(() => {
                setElapsedTime(Date.now() - startTime);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleExecute = async () => {
        setLoading(true);
        setOutput(null);
        const start = Date.now();
        try {
            const parsedInputs = JSON.parse(inputs);
            const result = await executeToolAction({
                toolName: selectedTool,
                inputs: parsedInputs,
                agentId: selectedAgent,
                tenantId: 'sandbox-brand-id' // Could be made selectable
            });
            setOutput(result);
        } catch (e: any) {
            setOutput({ success: false, error: e.message });
        } finally {
            const finalDuration = Date.now() - start;
            setExecutionTime(finalDuration);
            setLoading(false);
        }
    };

    const handleCopyReport = () => {
        const agentName = agents.find(a => a.id === selectedAgent)?.name || selectedAgent || 'Unknown Agent';
        const report = `
## 🐞 Agent Debug Report
**Agent:** ${agentName}
**Tool:** ${selectedTool || 'None'}
**Execution Time:** ${executionTime}ms
**Status:** ${output?.success ? 'Success' : (output ? 'Failed' : 'Not Run')}

### Inputs
\`\`\`json
${inputs}
\`\`\`

### Output
\`\`\`json
${output ? JSON.stringify(output.result || output, null, 2) : 'null'}
\`\`\`
`.trim();
        
        navigator.clipboard.writeText(report);
        toast({
            title: "Report Copied",
            description: "Debug report copied to clipboard.",
        });
    };

    const formatDuration = (ms: number) => {
        return (ms / 1000).toFixed(1) + 's';
    };

    const [seeding, setSeeding] = useState(false);

    const handleSeedData = async () => {
        if (!confirm('This will generate 50+ synthetic orders in "sandbox-demo-brand". Continue?')) return;
        setSeeding(true);
        try {
            const result = await seedSandboxData();
            toast({
                title: "Data Seeded",
                description: result.message,
            });
        } catch (e: any) {
            toast({
                title: "Seeding Failed",
                description: e.message,
                variant: 'destructive'
            });
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Control Panel */}
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Configuration</CardTitle>
                            <CardDescription>Select identity and capability to test</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSeedData}
                            disabled={seeding}
                            title="Seed synthetic data"
                        >
                            <Database className="mr-2 h-4 w-4" />
                            {seeding ? 'Seeding...' : 'Seed Data'}
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label>Agent Identity</Label>
                            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an Agent" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.map(agent => (
                                        <SelectItem key={agent.id} value={agent.id}>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{agent.name}</Badge>
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{agent.specialty}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Tool / Capability</Label>
                            <Select value={selectedTool} onValueChange={handleToolChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a Tool" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {tools.map(tool => (
                                        <SelectItem key={tool.name} value={tool.name || ''}>
                                            <span className="font-mono text-xs mr-2">{tool.name}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedTool && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {tools.find(t => t.name === selectedTool)?.description}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Inputs (JSON)</Label>
                            <div className="border rounded-md font-mono text-sm">
                                <Textarea
                                    value={inputs}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputs(e.target.value)}
                                    className="min-h-[200px] bg-muted/50 border-0 focus-visible:ring-0 resize-none font-mono"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            className="w-full" 
                            onClick={handleExecute} 
                            disabled={loading || !selectedTool}
                            size="lg"
                        >
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Executing ({formatDuration(elapsedTime)})</>
                            ) : (
                                <><Play className="mr-2 h-4 w-4" /> Execute Run</>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Results Panel */}
            <div className="space-y-6 h-full flex flex-col">
                <Card className="flex-1 flex flex-col min-h-[500px]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">Execution Output</CardTitle>
                            {output && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6" 
                                    onClick={handleCopyReport}
                                    title="Copy Debug Report"
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                        <Badge variant={output ? (output.success && output.result.status === 'success' ? 'default' : 'destructive') : 'outline'}>
                            {output ? (output.success ? output.result.status.toUpperCase() : 'ERROR') : 'IDLE'}
                        </Badge>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 relative">
                        {output ? (
                            <div className="absolute inset-0 p-4 overflow-auto bg-slate-950 text-slate-50 font-mono text-xs space-y-2">
                                <div className="flex border-b border-slate-800 pb-2 mb-2 items-center justify-between text-slate-400">
                                    <span>Result Payload</span>
                                    <span>{executionTime}ms</span>
                                </div>
                                <pre className="whitespace-pre-wrap break-all">
                                    {JSON.stringify(output.result || output, null, 2)}
                                </pre>
                                
                                {/* Image Viewer for Base64/URL outputs */}
                                {output?.result?.data?.imageUrl && (
                                    <div className="mt-4 border-t border-slate-800 pt-4">
                                        <p className="text-slate-400 mb-2">Image Preview:</p>
                                        <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900 inline-block">
                                            <img 
                                                src={output.result.data.imageUrl} 
                                                alt="Tool Output" 
                                                className="max-w-full h-auto max-h-[400px] object-contain" 
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                                <Terminal className="h-12 w-12 opacity-20" />
                                <p className="text-sm">Ready to execute. Select a tool to begin.</p>
                            </div>
                        )}
                    </CardContent>
                    {output && output.result?.data?.message && (
                        <div className="p-4 border-t bg-muted/20">
                            <span className="text-sm font-medium">Human Readable: </span>
                            <span className="text-sm text-muted-foreground">{output.result.data.message}</span>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
