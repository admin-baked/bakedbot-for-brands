// src/app/dashboard/playbooks/page.tsx
import AgentBuilder from "./components/agent-builder";
import { PlaybookCard, Playbook } from "./components/playbook-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

// Placeholder data based on the screenshot
const placeholderPlaybooks: Playbook[] = [
    { id: '1', title: 'abandon-browse-cart-saver', type: 'signal', tags: ['retention', 'recovery', 'sms', 'email', 'on-site'], enabled: true },
    { id: '2', title: 'competitor-price-drop-watch', type: 'signal', tags: ['competitive', 'pricing', 'experiments'], enabled: true },
    { id: '3', title: 'new-subscriber-welcome-series', type: 'automation', tags: ['email', 'onboarding', 'engagement'], enabled: true },
    { id: '4', title: 'win-back-lapsed-customers', type: 'signal', tags: ['retention', 'sms', 'discounts'], enabled: false },
];


export default function PlaybooksPage() {
  return (
    <div className="flex flex-col gap-8">
      <AgentBuilder />
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search playbooks..." className="pl-10" />
            </div>
            <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">Status:</div>
                <Button variant="secondary" size="sm">All</Button>
                <Button variant="ghost" size="sm">Active</Button>
                <Button variant="ghost" size="sm">Disabled</Button>
            </div>
             <Button variant="outline">Create Manually</Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {placeholderPlaybooks.map(playbook => (
                <PlaybookCard key={playbook.id} playbook={playbook} />
            ))}
        </div>

      </div>
    </div>
  );
}
