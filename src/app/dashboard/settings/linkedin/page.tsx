'use client';

import { ServiceConnectionCard } from '@/components/settings/service-connection-card';
import { SERVICE_REGISTRY } from '@/server/services/rtrvr/service-registry';

export default function LinkedInSettingsPage() {
    const service = SERVICE_REGISTRY['linkedin'];
    return (
        <div className="max-w-2xl space-y-6 p-6">
            <div>
                <h1 className="text-xl font-semibold">LinkedIn</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Connect your LinkedIn account so Craig can post to your feed and Leo can message leads on your behalf.
                </p>
            </div>
            <ServiceConnectionCard
                serviceId="linkedin"
                displayName={service.displayName}
                loginUrl={service.loginUrl}
                sessionCookies={service.sessionCookies}
                agents={service.agents}
                capabilities={service.capabilities}
            />
        </div>
    );
}
