import { TrackDeliveryPageClient } from './client';

export default async function TrackDeliveryPage({
    params,
}: {
    params: Promise<{ deliveryId: string }>;
}) {
    const { deliveryId } = await params;
    return <TrackDeliveryPageClient deliveryId={deliveryId} />;
}
