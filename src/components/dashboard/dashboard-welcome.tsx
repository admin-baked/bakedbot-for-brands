
'use client';

import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { Lightbulb } from 'lucide-react';


export default function DashboardWelcome() {
  const { navLinks } = useDashboardConfig();

  const accessibleFeatures = navLinks.filter(link => !link.hidden && link.href !== '/dashboard');

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome to your Dashboard
        </h2>
        <p className="text-muted-foreground">
          Here are some quick links to get you started.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {accessibleFeatures.map((feature) => {
            const Icon = (LucideIcons as any)[feature.icon || 'Folder'];
            return (
                 <Link key={feature.href} href={feature.href} className="group">
                    <Card className="h-full transition-all group-hover:border-primary group-hover:shadow-lg">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Icon className="h-8 w-8 text-primary" />
                        <CardTitle>{feature.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                    </Card>
                </Link>
            )
        })}
      </div>
       <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900">
        <CardHeader className="flex flex-row items-center gap-4">
          <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-blue-900 dark:text-blue-300">Did you know?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-300/80">
            You can quickly toggle the sidebar by pressing <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>B
            </kbd> (or <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            Ctrl+B
            </kbd> on Windows).
        </CardContent>
      </Card>
    </div>
  );
}
