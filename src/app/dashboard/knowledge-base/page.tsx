'use client';

import { useUserRole } from '@/hooks/use-user-role';
import { BrandKnowledgeBase } from '../playbooks/components/brand-knowledge-base';
import { DispensaryKnowledgeBase } from '@/components/dashboard/dispensary-knowledge-base';
import { Loader2, BookOpen } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';

export default function KnowledgeBasePage() {
    const { role, isLoading: isRoleLoading } = useUserRole();
    const { user, isUserLoading } = useUser();

    const isLoading = isRoleLoading || isUserLoading;

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // 1. Brand View
    if (role === 'brand') {
        const brandId = (user as any)?.brandId || user?.uid;
        
        if (!brandId) {
             return (
                <div className="flex h-[50vh] w-full items-center justify-center flex-col gap-4">
                    <p className="text-muted-foreground">Could not identify brand context.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div>
                     <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
                     <p className="text-muted-foreground">Manage your brand's context and training data.</p>
                </div>
                <BrandKnowledgeBase brandId={brandId} />
            </div>
        );
    }

    // 2. Dispensary View
    if (role === 'dispensary') {
         // Dispensary user likely has user.dispensaryId or fallback.
         // Assuming user.uid as fallback for now similar to brand.
         // Real dispensary ID logic might need to be verified.
         // dashboard-switcher uses: (user as any)?.brandId || user?.uid || 'unknown-dispensary';
         // Wait, dashboard-switcher uses brandId prop for DispensaryDashboardClient too, which is confusing but consistent.
         // I'll stick to a similar pattern but look for dispensaryId first.
         const dispensaryId = (user as any)?.dispensaryId || (user as any)?.brandId || user?.uid;

         if (!dispensaryId) {
            return (
               <div className="flex h-[50vh] w-full items-center justify-center flex-col gap-4">
                   <p className="text-muted-foreground">Could not identify dispensary context.</p>
               </div>
           );
       }

         return (
             <div className="space-y-6">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
                     <p className="text-muted-foreground">Manage your dispensary's context and training data.</p>
                </div>
                 <DispensaryKnowledgeBase dispensaryId={dispensaryId} />
             </div>
         )
    }

    // 3. Fallback / Other Roles
    return (
         <div className="flex h-full w-full items-center justify-center flex-col gap-4 py-20 text-center">
             <BookOpen className="h-12 w-12 text-muted-foreground/50" />
             <h2 className="text-xl font-semibold">Knowledge Base</h2>
             <p className="text-muted-foreground max-w-sm">
                 This feature is not available for your current role ({role}).
             </p>
         </div>
    );
}
