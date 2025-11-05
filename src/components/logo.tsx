import { Bot } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="Smokey AI Home">
      <Bot className="h-8 w-8 text-primary" />
      <h1 className="text-xl font-bold tracking-tighter text-foreground">
        Smokey AI
      </h1>
    </div>
  );
}
