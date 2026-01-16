// src/app/super-admin/page.tsx
/**
 * Super Admin login page
 * Provides magic button access for whitelisted super admin emails
 */

import SuperAdminLogin from '@/components/super-admin-login';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SuperAdminPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="absolute top-4 left-4">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Home
                </Link>
            </div>

            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-white mb-2">🔐 Super Admin</h1>
                <p className="text-slate-400">BakedBot Internal Access</p>
            </div>

            <SuperAdminLogin />
        </div>
    );
}
