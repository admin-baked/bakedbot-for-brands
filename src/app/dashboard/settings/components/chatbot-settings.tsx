'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/hooks/use-store";

export default function ChatbotSettings() {
    const { chatbotMode, setChatbotMode } = useStore();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Chatbot Configuration</CardTitle>
                <CardDescription>
                    Choose the type of chatbot experience for your customers.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup
                    value={chatbotMode}
                    onValueChange={(value: 'simple' | 'checkout') => setChatbotMode(value)}
                    className="gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="simple" id="simple" />
                        <Label htmlFor="simple" className="flex flex-col gap-1">
                            <span className="font-semibold">Simple Chat</span>
                            <span className="font-normal text-muted-foreground">A classic conversational experience for product recommendations.</span>
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="checkout" id="checkout" />
                        <Label htmlFor="checkout" className="flex flex-col gap-1">
                             <span className="font-semibold">Checkout Assistant</span>
                            <span className="font-normal text-muted-foreground">An interactive experience that allows users to add items to a cart and proceed to checkout.</span>
                        </Label>
                    </div>
                </RadioGroup>
            </CardContent>
        </Card>
    )
}
