'use client';

/**
 * Social & Ads Connections — Super User Only
 *
 * One page to connect all RTRVR-authenticated services.
 * Agents (Craig, Leo) can act on any connected account.
 */

import { ServiceConnectionCard } from '@/components/settings/service-connection-card';
import { SERVICE_REGISTRY } from '@/server/services/rtrvr/service-registry';

const SERVICES = Object.values(SERVICE_REGISTRY);

export default function ConnectionsPage() {
    return (
        <div className="max-w-2xl space-y-6 p-6">
            <div>
                <h1 className="text-xl font-semibold">Social & Ads Connections</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Connect your accounts so Craig and Leo can post, message, and run ads on your behalf.
                    Credentials are used once to log in — only session cookies are stored.
                </p>
            </div>

            <div className="space-y-4">
                {SERVICES.map(service => (
                    <ServiceConnectionCard
                        key={service.id}
                        serviceId={service.id}
                        displayName={service.displayName}
                        loginUrl={service.loginUrl}
                        sessionCookies={service.sessionCookies}
                        agents={service.agents}
                        capabilities={service.capabilities}
                    />
                ))}
            </div>
        </div>
    );
}
