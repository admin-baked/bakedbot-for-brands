import { ReceiptUploader } from '@/components/loyalty/receipt-uploader';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Scan Receipt | Loyalty',
    description: 'Upload your receipt to earn points.',
};

export default function ScanPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">Receipt Rewards</h1>
            <ReceiptUploader />
        </main>
    );
}
