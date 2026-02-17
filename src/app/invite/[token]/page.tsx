import { JoinPageClient } from './client';

export default async function JoinPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    return <JoinPageClient invitationToken={token} />;
}
