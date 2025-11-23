
// src/app/dashboard/playbooks/components/agent-builder.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function AgentBuilder() {
    return (
        <Card className="bg-muted/40 border-dashed">
            <CardHeader>
                <CardTitle className="text-xl">Build Your AI Agent Workforce</CardTitle>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="relative">
                        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="e.g., Send a daily summary of cannabis industry news to my email."
                            className="pl-10 h-11"
                        />
                         <Button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 h-9">
                            Create Agent
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
