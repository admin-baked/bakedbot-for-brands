import ScanPageClient from './page-client';

interface ScanPageProps {
    params: Promise<{ orderId: string }>;
}

export default async function ScanPage({ params }: ScanPageProps) {
    const { orderId } = await params;
    return <ScanPageClient orderId={orderId} />;
}

export const metadata = {
    title: 'Order Pickup | BakedBot',
    description: 'Scan order QR code to manage pickup',
};
