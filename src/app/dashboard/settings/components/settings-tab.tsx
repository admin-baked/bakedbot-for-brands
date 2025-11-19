// src/app/dashboard/settings/components/settings-tab.tsx
import type { Brand } from '@/types/domain';

type SettingsTabProps = {
  brand: Brand;
};

export default function SettingsTab({ brand }: SettingsTabProps) {
  // You can use `brand` now, or just leave it unused for the moment.
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Settings coming soon.
      </div>

      <div className="rounded-md border bg-muted/40 p-4 text-xs text-muted-foreground">
        <div className="font-medium mb-1">Brand debug info</div>
        <pre className="whitespace-pre-wrap break-words">
          {JSON.stringify(brand, null, 2)}
        </pre>
      </div>
    </div>
  );
}
