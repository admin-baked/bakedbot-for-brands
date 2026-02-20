'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useOptionalFirebase } from '@/firebase/use-optional-firebase';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { logger } from '@/lib/logger';

export function useBrandId() {
    const { user, isUserLoading } = useUser();
    const firebase = useOptionalFirebase();
    const [brandId, setBrandId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isUserLoading) return;

        const fetchBrandId = async () => {
            if (!user) {
                setBrandId(null);
                setLoading(false);
                return;
            }

            // 1. Check Custom Claims — priority order matches CLAUDE.md orgId resolution.
            //    Brand admins have brandId; dispensary admins have orgId/currentOrgId/locationId.
            if ((user as any).brandId) {
                setBrandId((user as any).brandId);
                setLoading(false);
                return;
            }
            if ((user as any).orgId) {
                setBrandId((user as any).orgId);
                setLoading(false);
                return;
            }
            if ((user as any).currentOrgId) {
                setBrandId((user as any).currentOrgId);
                setLoading(false);
                return;
            }
            if ((user as any).locationId) {
                setBrandId((user as any).locationId);
                setLoading(false);
                return;
            }

            // 2. Query Firestore if firebase is available
            if (firebase?.firestore) {
                try {
                    // Try finding brand owned by user
                    const brandsRef = collection(firebase.firestore, 'brands');
                    const q = query(brandsRef, where('ownerId', '==', user.uid), limit(1));
                    const snapshot = await getDocs(q);

                    if (!snapshot.empty) {
                        setBrandId(snapshot.docs[0].id);
                    } else {
                        // Fallback: Check user profile for locationId (for dispensaries)
                        try {
                            const db = firebase.firestore;
                            if (db) {
                                const userDoc = await getDoc(doc(db, 'users', user.uid));
                                if (userDoc.exists()) {
                                    const userData = userDoc.data();
                                    if (userData.locationId) {
                                        setBrandId(userData.locationId);
                                        setLoading(false);
                                        return;
                                    }
                                }
                            }
                        } catch (e) { logger.warn('[useBrandId] Error fetching user profile fallback', { error: e instanceof Error ? e.message : String(e) }); }

                        // Fallback for demo or dev
                        // If user role is brand but no brand found, maybe use demo?
                        const role = (user as any).role;
                        if (role === 'brand') {
                            // Possibly set a demo ID or null
                        }
                    }
                } catch (error: any) {
                    // Suppress permission errors (common for non-brand users)
                    if (error?.code !== 'permission-denied') {
                        logger.warn('[useBrandId] Error fetching brand ID:', { error: error instanceof Error ? error.message : String(error) });
                    }
                }
            }

            setLoading(false);
        };

        fetchBrandId();
    }, [user, isUserLoading, firebase]);

    return { brandId, loading };
}
