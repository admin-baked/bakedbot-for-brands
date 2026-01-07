
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Book, Shield, Microscope, Sparkles, FileText, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export function SuperUserKnowledgeBase() {
    const [searchQuery, setSearchQuery] = useState('');

    // Mock Data for "Visual" MVP (will connect to real archival search later)
    const recentFindings = [
        { id: '1', title: 'CA Prop 64 Compliance - labeling', tags: ['#compliance', '#CA', '#labeling'], date: '2024-01-15' },
        { id: '2', title: 'Terpene Entourage Effect Study (2023)', tags: ['#research', '#terpenes', '#science'], date: '2024-01-10' },
        { id: '3', title: 'Tax Code 280E Analysis', tags: ['#compliance', '#finance', '#tax'], date: '2023-12-28' },
    ];

    const roachPlaybooks = [
        { id: 'deep-audit', title: 'Deep Compliance Audit', icon: Shield, desc: 'Scan all brand assets against state regulations.' },
        { id: 'market-dive', title: 'Global Market Deep Dive', icon: GlobeIcon, desc: 'Analyze pricing and trends in a specific region.' },
        { id: 'academic-lit', title: 'Academic Literature Review', icon: Book, desc: 'Find and summarize latest papers on a topic.' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                     <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Microscope className="h-6 w-6 text-emerald-600" />
                        Roach's Library
                     </h2>
                     <p className="text-muted-foreground">Super User Semantic Knowledge Graph & Research Center.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <FileText className="h-4 w-4" />
                        View Research Briefs
                    </Button>
                    <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                        <Sparkles className="h-4 w-4" />
                        New Deep Research
                    </Button>
                </div>
            </div>

            {/* Playbooks Row */}
            <div className="grid gap-4 md:grid-cols-3">
                {roachPlaybooks.map((pb) => (
                    <Card key={pb.id} className="hover:bg-muted/50 cursor-pointer transition-colors border-l-4 border-l-emerald-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <pb.icon className="h-4 w-4 text-emerald-600" />
                                {pb.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">{pb.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Library View */}
            <Card>
                <CardHeader>
                    <CardTitle>Semantic Knowledge Graph</CardTitle>
                    <CardDescription>Search across {recentFindings.length * 100}+ indexed compliance and research nodes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by topic, regulation, or citation..." 
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="secondary">Filter</Button>
                    </div>

                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="all">All Nodes</TabsTrigger>
                            <TabsTrigger value="compliance">Compliance</TabsTrigger>
                            <TabsTrigger value="academic">Academic</TabsTrigger>
                            <TabsTrigger value="market">Market Data</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="all" className="space-y-4">
                            {recentFindings.map((item) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={item.id} 
                                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors"
                                >
                                    <div className="space-y-1">
                                        <div className="font-medium flex items-center gap-2">
                                            {item.title}
                                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50" />
                                        </div>
                                        <div className="flex gap-2">
                                            {item.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="text-[10px] h-5">{tag}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {item.date}
                                    </div>
                                </motion.div>
                            ))}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

function GlobeIcon(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    )
}
