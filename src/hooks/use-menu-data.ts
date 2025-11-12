
'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { productConverter } from '@/firebase/converters';
import type { Product, Location } from '@/lib/types';
import { useUser } from '@/firebase/auth/use-user';
import { useDemoMode } from '@/context/demo-mode';
import { DEMO_PRODUCTS, DEMO_LOCATIONS } from '@/demo/demo-data';

export function useMenuData() {
  const { isDemo } = useDemoMode();
  const { user } = useUser();
  const fb = useFirebase();
  const db = fb?.firestore;

  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);


  // keep brandId in lockstep with auth claims
  useEffect(() => {
    let cancelled = false;
    async function readClaims() {
      if (!user) {
        if (!cancelled) setBrandId(null);
        return;
      }
      const token = await user.getIdTokenResult();
      if (!cancelled) setBrandId((token.claims.brandId as string) ?? null);
    }
    readClaims();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!mounted) {
      // on the very first hydration pass, do nothing; wait one tick
      return;
    }
    // whenever demo flag OR brandId flips, resubscribe/serve demo
    if (!db) return;
    let unsubProducts: (() => void) | null = null;
    let unsubLocations: (() => void) | null = null;
    setLoading(true);

    if (isDemo) {
      setProducts(DEMO_PRODUCTS as Product[]);
      setLocations(DEMO_LOCATIONS as Location[]);
      setLoading(false);
      // ensure previous live subscriptions are torn down
      return () => {
        unsubProducts?.();
        unsubLocations?.();
      };
    }

    // Live Firestore
    if (!brandId) {
      // no brand yet; show empty but loaded state
      setProducts([]);
      setLocations([]);
      setLoading(false);
      return;
    }

    const productsRef = collection(db, 'products').withConverter(productConverter);
    const qProducts = query(productsRef, where('brandId', '==', brandId));
    unsubProducts = onSnapshot(qProducts, (snap) => {
      setProducts(snap.docs.map((d) => d.data()));
    });

    const locationsRef = collection(db, 'locations'); // add converter if you have one
    const qLocations = query(locationsRef, where('brandId', '==', brandId));
    unsubLocations = onSnapshot(qLocations, (snap) => {
      setLocations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });

    // when both first snapshots land we’ll flip loading off—simplify by timing out
    const t = setTimeout(() => setLoading(false), 250);
    return () => {
      clearTimeout(t);
      unsubProducts?.();
      unsubLocations?.();
    };
  }, [db, isDemo, brandId, mounted]);

  return useMemo(
    () => ({ products, locations, isLoading: loading, isDemo }),
    [products, locations, loading, isDemo]
  );
}
