// Task Dashboard Page - main interface for creating and viewing tasks

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, MessageSquare, Zap } from 'lucide-react';

export default function TasksPage() {
    const [input, setInput] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [intent, setIntent] = useState<'task' | 'chat' | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setIsCreating(true);

        try {
            // First, classify intent
            const intentResponse = await fetch('/api/route-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input })
            });

            const { intent: detectedIntent } = await intentResponse.json();
            setIntent(detectedIntent);

            if (detectedIntent === 'task') {
                // Create task
                const response = await fetch('/api/tasks/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input,
                        userId: 'current-user', // TODO: Get from auth context
                        executeImmediately: false
                    })
                });

                const { task } = await response.json();

                // Save to session storage for the detail page to pick up
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(`task_${task.id}`, JSON.stringify(task));
                }

                // Navigate to task execution view
                router.push(`/dashboard/tasks/${task.id}`);
            } else {
                // Route to chat
                router.push(`/dashboard/chat?q=${encodeURIComponent(input)}`);
            }
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Create Agent Task</h1>
                <p className="text-muted-foreground">
                    Describe what you want to accomplish, and our agents will break it down into steps
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        Natural Language Task Creation
                    </CardTitle>
                    <CardDescription>
                        Describe your goal in plain English. Our AI will assign the right agents and tools.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Textarea
                            placeholder="Example: Create a campaign to research dispensaries in New York and email them about our new products..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            rows={6}
                            className="resize-none"
                        />

                        {intent && (
                            <div className="flex items-center gap-2 text-sm">
                                {intent === 'task' ? (
                                    <>
                                        <Zap className="h-4 w-4 text-purple-500" />
                                        <span className="text-purple-600 dark:text-purple-400">
                                            Detected: Multi-step task
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <MessageSquare className="h-4 w-4 text-blue-500" />
                                        <span className="text-blue-600 dark:text-blue-400">
                                            Detected: Simple question
                                        </span>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                disabled={isCreating || !input.trim()}
                                className="flex-1"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Creating Task Plan...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Create Task
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Examples */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Example Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {[
                        'Create a campaign to email NY dispensaries about our new product line',
                        'Research competitors and create a plan to grow margins by 15% in 30 days',
                        'Find high-margin products and create promotional pricing strategy',
                        'Analyze customer retention data and design a VIP loyalty program'
                    ].map((example, i) => (
                        <button
                            key={i}
                            onClick={() => setInput(example)}
                            className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
                        >
                            {example}
                        </button>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
