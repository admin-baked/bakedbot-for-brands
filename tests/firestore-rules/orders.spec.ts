// [AI-THREAD P0-TEST-FIRESTORE-RULES]
// [Dev1-Claude @ 2025-11-30]:
//   Firestore security rules tests for orders collection.
//   Tests multi-role access: customer, brand, dispensary, owner.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  setupTestEnv,
  teardownTestEnv,
  clearFirestore,
  getUnauthenticatedFirestore,
  getCustomerFirestore,
  getBrandFirestore,
  getDispensaryFirestore,
  getOwnerFirestore,
  assertSucceeds,
  assertFails,
} from './setup';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

describe('Firestore Rules: orders collection', () => {
  beforeAll(async () => {
    await setupTestEnv();
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  const testOrder = {
    userId: 'customer-001',
    retailerId: 'location-001',
    brandId: 'brand-001',
    items: [{ productId: 'prod-001', quantity: 1 }],
    total: 49.99,
    status: 'pending',
    createdAt: new Date(),
  };

  describe('Create Access', () => {
    it('should allow anyone to create orders (via secure server action)', async () => {
      // Orders are created through server actions, but client can initiate
      const db = getCustomerFirestore('customer-001');
      const orderRef = doc(db, 'orders', 'order-001');

      await assertSucceeds(setDoc(orderRef, testOrder));
    });

    it('should allow unauthenticated users to create orders (for guest checkout)', async () => {
      const db = getUnauthenticatedFirestore();
      const orderRef = doc(db, 'orders', 'order-guest');

      await assertSucceeds(setDoc(orderRef, {
        ...testOrder,
        userId: 'guest',
      }));
    });
  });

  describe('Read Access - Customer', () => {
    it('should allow customer to read their own orders', async () => {
      // First create order
      const ownerDb = getOwnerFirestore('owner-001');
      const orderRef = doc(ownerDb, 'orders', 'order-001');
      await setDoc(orderRef, testOrder);

      // Now read as customer
      const db = getCustomerFirestore('customer-001');
      const orderRef2 = doc(db, 'orders', 'order-001');

      await assertSucceeds(getDoc(orderRef2));
    });

    it('should deny customer from reading other customers orders', async () => {
      // Create order for customer-002
      const ownerDb = getOwnerFirestore('owner-001');
      const orderRef = doc(ownerDb, 'orders', 'order-002');
      await setDoc(orderRef, {
        ...testOrder,
        userId: 'customer-002',
      });

      // Try to read as customer-001
      const db = getCustomerFirestore('customer-001');
      const orderRef2 = doc(db, 'orders', 'order-002');

      await assertFails(getDoc(orderRef2));
    });
  });

  describe('Read Access - Dispensary', () => {
    it('should allow dispensary manager to read orders for their location', async () => {
      // First create order
      const ownerDb = getOwnerFirestore('owner-001');
      const orderRef = doc(ownerDb, 'orders', 'order-001');
      await setDoc(orderRef, testOrder);

      // Now read as dispensary manager
      const db = getDispensaryFirestore('disp-manager-001', 'location-001');
      const orderRef2 = doc(db, 'orders', 'order-001');

      await assertSucceeds(getDoc(orderRef2));
    });

    it('should deny dispensary manager from reading orders for other locations', async () => {
      // Create order for location-002
      const ownerDb = getOwnerFirestore('owner-001');
      const orderRef = doc(ownerDb, 'orders', 'order-002');
      await setDoc(orderRef, {
        ...testOrder,
        retailerId: 'location-002',
      });

      // Try to read as dispensary manager for location-001
      const db = getDispensaryFirestore('disp-manager-001', 'location-001');
      const orderRef2 = doc(db, 'orders', 'order-002');

      await assertFails(getDoc(orderRef2));
    });
  });

  describe('Read Access - Brand', () => {
    it('should allow brand manager to read orders containing their products', async () => {
      // First create order
      const ownerDb = getOwnerFirestore('owner-001');
      const orderRef = doc(ownerDb, 'orders', 'order-001');
      await setDoc(orderRef, testOrder);

      // Now read as brand manager
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const orderRef2 = doc(db, 'orders', 'order-001');

      await assertSucceeds(getDoc(orderRef2));
    });

    it('should deny brand manager from reading orders without their products', async () => {
      // Create order for brand-002
      const ownerDb = getOwnerFirestore('owner-001');
      const orderRef = doc(ownerDb, 'orders', 'order-002');
      await setDoc(orderRef, {
        ...testOrder,
        brandId: 'brand-002',
      });

      // Try to read as brand manager for brand-001
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const orderRef2 = doc(db, 'orders', 'order-002');

      await assertFails(getDoc(orderRef2));
    });
  });

  describe('Read Access - Owner', () => {
    it('should allow owner to read all orders', async () => {
      // First create order
      const db = getOwnerFirestore('owner-001');
      const orderRef = doc(db, 'orders', 'order-001');
      await setDoc(orderRef, testOrder);

      // Now read it
      await assertSucceeds(getDoc(orderRef));
    });
  });

  describe('Update Access', () => {
    it('should allow customer to update their own orders', async () => {
      // First create order
      const ownerDb = getOwnerFirestore('owner-001');
      const orderRef = doc(ownerDb, 'orders', 'order-001');
      await setDoc(orderRef, testOrder);

      // Now update as customer
      const db = getCustomerFirestore('customer-001');
      const orderRef2 = doc(db, 'orders', 'order-001');

      await assertSucceeds(updateDoc(orderRef2, { notes: 'Please deliver to back door' }));
    });

    it('should allow dispensary manager to update orders for their location', async () => {
      // First create order
      const ownerDb = getOwnerFirestore('owner-001');
      const orderRef = doc(ownerDb, 'orders', 'order-001');
      await setDoc(orderRef, testOrder);

      // Now update as dispensary manager
      const db = getDispensaryFirestore('disp-manager-001', 'location-001');
      const orderRef2 = doc(db, 'orders', 'order-001');

      await assertSucceeds(updateDoc(orderRef2, { status: 'confirmed' }));
    });

    it('should allow brand manager to update orders containing their products', async () => {
      // First create order
      const ownerDb = getOwnerFirestore('owner-001');
      const orderRef = doc(ownerDb, 'orders', 'order-001');
      await setDoc(orderRef, testOrder);

      // Now update as brand manager
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const orderRef2 = doc(db, 'orders', 'order-001');

      await assertSucceeds(updateDoc(orderRef2, { brandNotes: 'Prioritize this order' }));
    });

    it('should deny customer from updating other customers orders', async () => {
      // Create order for customer-002
      const ownerDb = getOwnerFirestore('owner-001');
      const orderRef = doc(ownerDb, 'orders', 'order-002');
      await setDoc(orderRef, {
        ...testOrder,
        userId: 'customer-002',
      });

      // Try to update as customer-001
      const db = getCustomerFirestore('customer-001');
      const orderRef2 = doc(db, 'orders', 'order-002');

      await assertFails(updateDoc(orderRef2, { status: 'cancelled' }));
    });

    it('should allow owner to update any order', async () => {
      // First create order
      const db = getOwnerFirestore('owner-001');
      const orderRef = doc(db, 'orders', 'order-001');
      await setDoc(orderRef, testOrder);

      // Now update it
      await assertSucceeds(updateDoc(orderRef, { status: 'completed' }));
    });
  });

  describe('Unauthenticated Access', () => {
    it('should deny unauthenticated users from reading orders', async () => {
      const db = getUnauthenticatedFirestore();
      const orderRef = doc(db, 'orders', 'order-001');

      await assertFails(getDoc(orderRef));
    });
  });
});
