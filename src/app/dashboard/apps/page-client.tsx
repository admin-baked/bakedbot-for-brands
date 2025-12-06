'use client';

import { AppDefinition } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Heart, Mail, FileCheck, Plug, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ICON_MAP: any = {
    Store: Store,
    Heart: Heart,
    Mail: Mail,
    FileCheck: FileCheck
};

export default function AppsPageClient({ apps }: { apps: AppDefinition[] }) {
    const router = useRouter();

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">App Store</h1>
                <p className="text-muted-foreground">Extend BakedBot with POS integrations and third-party tools.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.map(app => {
                    const Icon = ICON_MAP[app.icon] || Plug;
                    return (
                        <Card key={app.id} className="flex flex-col hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row gap-4 items-start">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Icon className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">{app.name}</CardTitle>
                                        {app.installed && <Badge variant="secondary" className="text-xs">Installed</Badge>}
                                    </div>
                                    <Badge variant="outline" className="capitalize text-[10px]">{app.category}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-sm text-muted-foreground">{app.description}</p>
                            </CardContent>
                            <CardFooter>
                                {app.installed ? (
                                    <Link href={app.configUrl || '#'} className="w-full">
                                        <Button variant="outline" className="w-full">
                                            <Settings className="mr-2 h-4 w-4" /> Configure
                                        </Button>
                                    </Link>
                                ) : (
                                    <Link href={app.configUrl || '#'} className="w-full">
                                        <Button className="w-full" disabled={!app.configUrl}>
                                            {app.configUrl ? 'Install' : 'Waitlist'}
                                        </Button>
                                    </Link>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
