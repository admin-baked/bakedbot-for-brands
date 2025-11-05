'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChatbotSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Chatbot Configuration</CardTitle>
                <CardDescription>
                    Additional chatbot settings and behaviors will appear here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                    <p className="text-sm text-muted-foreground">Coming Soon</p>
                </div>
            </CardContent>
        </Card>
    )
}
