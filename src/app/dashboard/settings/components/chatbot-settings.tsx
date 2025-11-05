
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/hooks/use-store";

export default function ChatbotSettings() {
    const { chatExperience, setChatExperience } = useStore();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Chatbot Configuration</CardTitle>
                <CardDescription>
                    Customize the personality and behavior of your AI Budtender.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-3">
                    <Label>Chat Experience</Label>
                    <RadioGroup 
                        value={chatExperience} 
                        onValueChange={(value) => setChatExperience(value as 'default' | 'classic')}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem value="default" id="default-experience" className="peer sr-only" />
                            <Label htmlFor="default-experience" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                Default
                                <span className="mt-2 text-xs font-normal text-center text-muted-foreground">Includes a horizontally scrollable product browser.</span>
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="classic" id="classic-experience" className="peer sr-only" />
                            <Label htmlFor="classic-experience" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                Classic
                                <span className="mt-2 text-xs font-normal text-center text-muted-foreground">A simple, conversation-focused chat experience.</span>
                             </Label>
                        </div>
                    </RadioGroup>
                </div>
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
