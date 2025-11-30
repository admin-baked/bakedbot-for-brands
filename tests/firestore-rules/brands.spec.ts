// [AI-THREAD P0-TEST-FIRESTORE-RULES]
// [Dev1-Claude @ 2025-11-30]:
//   Firestore security rules tests for brands collection.
//   Tests role-based access control: owner, brand manager, customer, unauthorized.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  setupTestEnv,
  teardownTestEnv,
  clearFirestore,
  getUnauthenticatedFirestore,
  getCustomerFirestore,
  getBrandFirestore,
  getOwnerFirestore,
  assertSucceeds,
  assertFails,
} from './setup';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

describe('Firestore Rules: brands collection', () => {
  beforeAll(async () => {
    await setupTestEnv();
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  const testBrand = {
    name: '40 Tons',
    description: 'Premium cannabis brand',
    license: 'CA-12345',
    state: 'CA',
    createdAt: new Date(),
  };

  describe('Read Access', () => {
    it('should allow unauthenticated users to read brand profiles', async () => {
      const db = getUnauthenticatedFirestore();
      const brandRef = doc(db, 'brands', 'brand-001');

      await assertSucceeds(getDoc(brandRef));
    });

    it('should allow customer to read brand profiles', async () => {
      const db = getCustomerFirestore('customer-001');
      const brandRef = doc(db, 'brands', 'brand-001');

      await assertSucceeds(getDoc(brandRef));
    });

    it('should allow brand manager to read their own brand', async () => {
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const brandRef = doc(db, 'brands', 'brand-001');

      await assertSucceeds(getDoc(brandRef));
    });

    it('should allow brand manager to read other brands', async () => {
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const brandRef = doc(db, 'brands', 'brand-002');

      await assertSucceeds(getDoc(brandRef));
    });

    it('should allow owner to read all brands', async () => {
      const db = getOwnerFirestore('owner-001');
      const brandRef = doc(db, 'brands', 'brand-001');

      await assertSucceeds(getDoc(brandRef));
    });
  });

  describe('Create Access', () => {
    it('should deny unauthenticated users from creating brands', async () => {
      const db = getUnauthenticatedFirestore();
      const brandRef = doc(db, 'brands', 'brand-new');

      await assertFails(setDoc(brandRef, testBrand));
    });

    it('should deny customers from creating brands', async () => {
      const db = getCustomerFirestore('customer-001');
      const brandRef = doc(db, 'brands', 'brand-new');

      await assertFails(setDoc(brandRef, testBrand));
    });

    it('should deny brand managers from creating brands', async () => {
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const brandRef = doc(db, 'brands', 'brand-new');

      await assertFails(setDoc(brandRef, testBrand));
    });

    it('should allow owner to create brands', async () => {
      const db = getOwnerFirestore('owner-001');
      const brandRef = doc(db, 'brands', 'brand-new');

      await assertSucceeds(setDoc(brandRef, testBrand));
    });
  });

  describe('Update Access', () => {
    it('should deny unauthenticated users from updating brands', async () => {
      const db = getUnauthenticatedFirestore();
      const brandRef = doc(db, 'brands', 'brand-001');

      await assertFails(updateDoc(brandRef, { description: 'Updated' }));
    });

    it('should deny customers from updating brands', async () => {
      const db = getCustomerFirestore('customer-001');
      const brandRef = doc(db, 'brands', 'brand-001');

      await assertFails(updateDoc(brandRef, { description: 'Updated' }));
    });

    it('should allow brand manager to update their own brand', async () => {
      // First, create the brand as owner
      const ownerDb = getOwnerFirestore('owner-001');
      const brandRef = doc(ownerDb, 'brands', 'brand-001');
      await setDoc(brandRef, testBrand);

      // Now try to update as brand manager
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const brandRef2 = doc(db, 'brands', 'brand-001');

      await assertSucceeds(updateDoc(brandRef2, { description: 'Updated by brand manager' }));
    });

    it('should deny brand manager from updating other brands', async () => {
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const brandRef = doc(db, 'brands', 'brand-002');

      await assertFails(updateDoc(brandRef, { description: 'Unauthorized update' }));
    });

    it('should allow owner to update any brand', async () => {
      // First, create the brand
      const db = getOwnerFirestore('owner-001');
      const brandRef = doc(db, 'brands', 'brand-001');
      await setDoc(brandRef, testBrand);

      // Now update it
      await assertSucceeds(updateDoc(brandRef, { description: 'Updated by owner' }));
    });
  });

  describe('Delete Access', () => {
    it('should deny unauthenticated users from deleting brands', async () => {
      const db = getUnauthenticatedFirestore();
      const brandRef = doc(db, 'brands', 'brand-001');

      await assertFails(deleteDoc(brandRef));
    });

    it('should deny customers from deleting brands', async () => {
      const db = getCustomerFirestore('customer-001');
      const brandRef = doc(db, 'brands', 'brand-001');

      await assertFails(deleteDoc(brandRef));
    });

    it('should deny brand managers from deleting their own brand', async () => {
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const brandRef = doc(db, 'brands', 'brand-001');

      await assertFails(deleteDoc(brandRef));
    });

    it('should allow owner to delete brands', async () => {
      // First, create the brand
      const db = getOwnerFirestore('owner-001');
      const brandRef = doc(db, 'brands', 'brand-001');
      await setDoc(brandRef, testBrand);

      // Now delete it
      await assertSucceeds(deleteDoc(brandRef));
    });
  });
});
