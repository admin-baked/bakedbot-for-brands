// src/components/footer.tsx
import { SmokeyControlCenter } from '@/components/home/smokey-control-center';

export function Footer() {
  return (
    <footer className="w-full border-t bg-slate-50/50">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center gap-8 mb-8">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Powered by Smokey</p>
          <div className="w-full max-w-md transform hover:scale-105 transition-transform duration-300">
            <SmokeyControlCenter />
          </div>
        </div>
        <div className="text-xs text-center text-gray-500 border-t pt-8">
          © {new Date().getFullYear()} BakedBot AI – Agentic Commerce OS for Cannabis
        </div>
      </div>
    </footer>
  );
}
