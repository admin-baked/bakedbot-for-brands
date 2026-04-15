// Force dynamic rendering — admin pages require auth and live Firestore data
export const dynamic = 'force-dynamic';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-muted/40 p-6">
            <div className="mx-auto max-w-7xl">
                {children}
            </div>
        </div>
    );
}
