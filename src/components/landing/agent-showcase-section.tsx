'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { agents } from '@/config/agents';
import { Bot, Shield, Mail, BarChart3, Search, ShoppingBag } from 'lucide-react';

const agentIcons: Record<string, any> = {
    'smokey': Bot,
    'deebo': Shield,
    'craig': Mail,
    'pops': BarChart3,
    'ezal': Search,
    'money-mike': ShoppingBag
};

export function AgentShowcaseSection() {
    // Filter to core agents we want to showcase
    const showcaseAgents = agents.filter(a => ['smokey', 'deebo', 'craig', 'pops'].includes(a.id));

    return (
        <section id="product" className="py-24 bg-secondary/5">
            <div className="container px-4 mx-auto">
                <div className="flex flex-col items-center text-center space-y-4 mb-16">
                    <Badge variant="outline" className="px-4 py-1 text-base border-primary/20 text-primary">
                        Your Autonomous Workforce
                    </Badge>
                    <h2 className="text-4xl font-bold tracking-tight sm:text-5xl font-teko uppercase">
                        Meet the Crew
                    </h2>
                    <p className="max-w-[700px] text-lg text-muted-foreground">
                        Stop trying to do it all yourself. Our specialized AI agents handle marketing, compliance, and analytics 24/7.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {showcaseAgents.map((agent) => {
                        const Icon = agentIcons[agent.id] || Bot;
                        return (
                            <Card key={agent.id} className="relative overflow-hidden border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Icon className="w-24 h-24" />
                                </div>
                                <CardHeader>
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <CardTitle className="text-2xl font-teko uppercase">{agent.name}</CardTitle>
                                    <CardDescription>{agent.title}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {agent.description}
                                    </p>
                                    <div className="flex items-center text-xs text-muted-foreground">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2" />
                                        {agent.primaryMetricLabel}: <span className="font-semibold ml-1">{agent.primaryMetricValue}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
