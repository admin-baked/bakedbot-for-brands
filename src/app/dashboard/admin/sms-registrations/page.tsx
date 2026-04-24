import { redirect } from 'next/navigation';
import { requireSuperUser } from '@/server/auth/auth';
import { getAllSmsRegistrations } from '@/server/actions/sms-registration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Building2, User, Phone } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
    submitted: 'default',
    ready: 'secondary',
    draft: 'outline',
};

export default async function SmsRegistrationsPage() {
    try {
        await requireSuperUser();
    } catch {
        redirect('/dashboard');
    }

    const registrations = await getAllSmsRegistrations();

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">SMS / 10DLC Registrations</h1>
                <p className="text-muted-foreground mt-2">
                    All orgs with SMS registration data. {registrations.length} total.
                </p>
            </div>

            {registrations.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No SMS registrations submitted yet.
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4">
                {registrations.map(({ orgId, data }) => (
                    <Card key={orgId}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        {data.legalName || orgId}
                                        {data.dba && data.dba !== data.legalName && (
                                            <span className="text-muted-foreground font-normal text-sm">({data.dba})</span>
                                        )}
                                    </CardTitle>
                                    <CardDescription className="mt-1 font-mono text-xs">{orgId}</CardDescription>
                                </div>
                                <Badge variant={STATUS_VARIANT[data.status] ?? 'outline'}>
                                    {data.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {/* Business */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <Info label="EIN" value={data.ein} />
                                <Info label="Entity" value={data.entityType} />
                                <Info label="State" value={data.state} />
                                <Info label="Website" value={data.website} />
                            </div>

                            {/* Contact */}
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-3.5 w-3.5 shrink-0" />
                                <span>{data.contactFirstName} {data.contactLastName}</span>
                                {data.contactTitle && <span className="text-xs">· {data.contactTitle}</span>}
                                <span className="text-xs">· {data.contactEmail}</span>
                                {data.contactPhone && <span className="text-xs">· {data.contactPhone}</span>}
                            </div>

                            {/* Campaign */}
                            <div className="rounded-md bg-muted/40 p-3 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="font-medium">{data.campaignName}</span>
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">{data.useCase}</Badge>
                                </div>
                                {data.campaignDescription && (
                                    <p className="text-xs text-muted-foreground pl-5">{data.campaignDescription}</p>
                                )}
                                {data.sampleMessage1 && (
                                    <p className="text-xs text-muted-foreground pl-5 border-l-2 border-muted ml-2">
                                        &ldquo;{data.sampleMessage1.slice(0, 120)}{data.sampleMessage1.length > 120 ? '…' : ''}&rdquo;
                                    </p>
                                )}
                            </div>

                            {/* Provider */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    Area code: {data.preferredAreaCode || 'any'}
                                </span>
                                <span>Account: {data.providerAccountEmail}</span>
                                {data.providerApiKey && (
                                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                                        API key set
                                    </span>
                                )}
                            </div>

                            {data.submittedAt && (
                                <p className="text-xs text-muted-foreground">
                                    Last updated: {new Date(data.submittedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium truncate">{value}</p>
        </div>
    );
}
