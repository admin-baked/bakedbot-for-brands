
// --- Helper Components ---

function StepsList({ steps }: { steps: ToolCallStep[] }) {
    if (!steps || steps.length === 0) return null;

    return (
        <div className="space-y-2 mt-2 text-xs">
            {steps.map((step, i) => (
                <div key={i} className="border rounded p-2 bg-muted/50">
                    <div className="flex items-center gap-2 font-medium">
                        {step.status === 'in-progress' && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                        {step.status === 'completed' && <Check className="h-3 w-3 text-green-500" />}
                        {step.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-500" />}
                        <span className="font-mono text-xs">{step.toolName || 'tool'}</span>
                    </div>
                    {/* step.args does not exist on ToolCallStep in this file, description does */}
                    <div className="ml-5 text-[10px] text-muted-foreground">{step.description}</div>
                </div>
            ))}
        </div>
    );
}

function CreativeLoader({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-dashed border-primary/30 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="relative">
                {/* Spinning Ring */}
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <div className="absolute -inset-1 rounded-full border border-purple-200 animate-pulse" />
                
                {/* Smokey Icon Center */}
                <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-emerald-100 to-purple-100 flex items-center justify-center overflow-hidden p-1">
                     <img 
                        src="/assets/agents/smokey-main.png" 
                        alt="Smokey" 
                        className="h-full w-full object-contain animate-bounce" 
                        style={{ animationDuration: '2s' }}
                    />
                </div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
                    {label}
                </span>
                <span className="text-[10px] text-muted-foreground">This may take a few seconds</span>
            </div>
        </div>
    );
}

function ThinkingIndicator({ level = 'balanced', duration }: { level?: 'fast' | 'balanced' | 'deep'; duration?: number }) {
    const labels = {
        fast: 'Thinking fast...',
        balanced: 'Reasoning...',
        deep: 'Deep thinking...'
    };

    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground italic p-2">
            <Sparkles className="h-3 w-3 animate-pulse text-purple-400" />
            <span>{labels[level]} {duration ? `(${duration}ms)` : ''}</span>
        </div>
    );
}
