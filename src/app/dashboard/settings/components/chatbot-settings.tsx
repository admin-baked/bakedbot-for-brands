'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ChatbotSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Chatbot Configuration</CardTitle>
                <CardDescription>
                    Customize the personality and behavior of your AI Budtender.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="base-prompt">Base Prompt</Label>
                    <Textarea 
                        id="base-prompt"
                        placeholder="e.g., You are Smokey, a friendly and knowledgeable AI budtender. Your goal is to help users discover the best cannabis products for them. Keep your tone light, informative, and a little playful."
                        rows={5}
                    />
                    <p className="text-xs text-muted-foreground">
                        This base prompt sets the core personality of your chatbot.
                    </p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="welcome-message">Welcome Message</Label>
                    <Textarea 
                        id="welcome-message"
                        placeholder="Hello! I'm Smokey, your AI budtender. Browse our products above and ask me anything about them!"
                        rows={3}
                    />
                     <p className="text-xs text-muted-foreground">
                        The first message your chatbot sends when a user opens it.
                    </p>
                </div>
            </CardContent>
            <CardFooter>
                <Button>Save Chatbot Settings</Button>
            </CardFooter>
        </Card>
    )
}
