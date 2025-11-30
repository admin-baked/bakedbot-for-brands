// [AI-THREAD P0-TEST-FIRESTORE-RULES]
// [Dev1-Claude @ 2025-11-30]:
//   Firestore security rules tests for products and public collections.
//   Tests public read access and brand-manager write access.

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

describe('Firestore Rules: products collection', () => {
  beforeAll(async () => {
    await setupTestEnv();
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  const testProduct = {
    name: 'Blue Dream',
    brandId: 'brand-001',
    category: 'flower',
    price: 35.99,
    thcPercent: 22,
    strainType: 'hybrid',
    createdAt: new Date(),
  };

  describe('Read Access (Public)', () => {
    it('should allow unauthenticated users to read products', async () => {
      const db = getUnauthenticatedFirestore();
      const productRef = doc(db, 'products', 'prod-001');

      await assertSucceeds(getDoc(productRef));
    });

    it('should allow customers to read products', async () => {
      const db = getCustomerFirestore('customer-001');
      const productRef = doc(db, 'products', 'prod-001');

      await assertSucceeds(getDoc(productRef));
    });

    it('should allow brand managers to read all products', async () => {
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const productRef = doc(db, 'products', 'prod-001');

      await assertSucceeds(getDoc(productRef));
    });
  });

  describe('Create Access', () => {
    it('should deny unauthenticated users from creating products', async () => {
      const db = getUnauthenticatedFirestore();
      const productRef = doc(db, 'products', 'prod-new');

      await assertFails(setDoc(productRef, testProduct));
    });

    it('should deny customers from creating products', async () => {
      const db = getCustomerFirestore('customer-001');
      const productRef = doc(db, 'products', 'prod-new');

      await assertFails(setDoc(productRef, testProduct));
    });

    it('should allow brand manager to create products for their brand', async () => {
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const productRef = doc(db, 'products', 'prod-new');

      await assertSucceeds(setDoc(productRef, testProduct));
    });

    it('should deny brand manager from creating products for other brands', async () => {
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const productRef = doc(db, 'products', 'prod-new');

      await assertFails(setDoc(productRef, {
        ...testProduct,
        brandId: 'brand-002',
      }));
    });
  });

  describe('Update Access', () => {
    it('should allow brand manager to update their own products', async () => {
      // First create product as brand manager
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const productRef = doc(db, 'products', 'prod-001');
      await setDoc(productRef, testProduct);

      // Now update it
      await assertSucceeds(updateDoc(productRef, { price: 39.99 }));
    });

    it('should deny brand manager from updating other brands products', async () => {
      // Create product for brand-002
      const ownerDb = getOwnerFirestore('owner-001');
      const productRef = doc(ownerDb, 'products', 'prod-002');
      await setDoc(productRef, {
        ...testProduct,
        brandId: 'brand-002',
      });

      // Try to update as brand-001 manager
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const productRef2 = doc(db, 'products', 'prod-002');

      await assertFails(updateDoc(productRef2, { price: 39.99 }));
    });

    it('should deny customers from updating products', async () => {
      const db = getCustomerFirestore('customer-001');
      const productRef = doc(db, 'products', 'prod-001');

      await assertFails(updateDoc(productRef, { price: 39.99 }));
    });
  });

  describe('Delete Access', () => {
    it('should allow brand manager to delete their own products', async () => {
      // First create product
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const productRef = doc(db, 'products', 'prod-001');
      await setDoc(productRef, testProduct);

      // Now delete it
      await assertSucceeds(deleteDoc(productRef));
    });

    it('should deny brand manager from deleting other brands products', async () => {
      // Create product for brand-002
      const ownerDb = getOwnerFirestore('owner-001');
      const productRef = doc(ownerDb, 'products', 'prod-002');
      await setDoc(productRef, {
        ...testProduct,
        brandId: 'brand-002',
      });

      // Try to delete as brand-001 manager
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const productRef2 = doc(db, 'products', 'prod-002');

      await assertFails(deleteDoc(productRef2));
    });
  });
});

describe('Firestore Rules: public collections', () => {
  beforeAll(async () => {
    await setupTestEnv();
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  describe('dispensaries collection', () => {
    it('should allow anyone to read dispensaries', async () => {
      const db = getUnauthenticatedFirestore();
      const dispRef = doc(db, 'dispensaries', 'disp-001');

      await assertSucceeds(getDoc(dispRef));
    });

    it('should deny client-side writes to dispensaries', async () => {
      const db = getOwnerFirestore('owner-001');
      const dispRef = doc(db, 'dispensaries', 'disp-001');

      await assertFails(setDoc(dispRef, { name: 'Test Dispensary' }));
    });
  });

  describe('categories collection', () => {
    it('should allow anyone to read categories', async () => {
      const db = getUnauthenticatedFirestore();
      const catRef = doc(db, 'categories', 'cat-001');

      await assertSucceeds(getDoc(catRef));
    });

    it('should deny all writes to categories', async () => {
      const db = getOwnerFirestore('owner-001');
      const catRef = doc(db, 'categories', 'cat-001');

      await assertFails(setDoc(catRef, { name: 'Flower' }));
    });
  });

  describe('coupons collection', () => {
    it('should allow anyone to read coupons', async () => {
      const db = getUnauthenticatedFirestore();
      const couponRef = doc(db, 'coupons', 'coupon-001');

      await assertSucceeds(getDoc(couponRef));
    });

    it('should deny all writes to coupons', async () => {
      const db = getOwnerFirestore('owner-001');
      const couponRef = doc(db, 'coupons', 'coupon-001');

      await assertFails(setDoc(couponRef, { code: 'SAVE20' }));
    });
  });

  describe('retailers collection (CannMenus)', () => {
    it('should allow anyone to read retailers', async () => {
      const db = getUnauthenticatedFirestore();
      const retailerRef = doc(db, 'retailers', 'retailer-001');

      await assertSucceeds(getDoc(retailerRef));
    });

    it('should deny all writes to retailers', async () => {
      const db = getOwnerFirestore('owner-001');
      const retailerRef = doc(db, 'retailers', 'retailer-001');

      await assertFails(setDoc(retailerRef, { name: 'Test Retailer' }));
    });
  });
});
