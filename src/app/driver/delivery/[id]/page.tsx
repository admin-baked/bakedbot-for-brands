import { DriverDeliveryDetailsClient } from './client';

export default async function DriverDeliveryDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <DriverDeliveryDetailsClient deliveryId={id} />;
}
