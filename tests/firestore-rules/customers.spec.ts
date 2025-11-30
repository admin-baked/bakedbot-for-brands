// [AI-THREAD P0-TEST-FIRESTORE-RULES]
// [Dev1-Claude @ 2025-11-30]:
//   Firestore security rules tests for customers collection.
//   Tests that customers can only access their own data.

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
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

describe('Firestore Rules: customers collection', () => {
  beforeAll(async () => {
    await setupTestEnv();
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  const testCustomer = {
    email: 'customer@example.com',
    dateOfBirth: '1990-01-01',
    state: 'CA',
    hasMedicalCard: false,
    createdAt: new Date(),
  };

  describe('Read Access', () => {
    it('should deny unauthenticated users from reading customer profiles', async () => {
      const db = getUnauthenticatedFirestore();
      const customerRef = doc(db, 'customers', 'customer-001');

      await assertFails(getDoc(customerRef));
    });

    it('should allow customer to read their own profile', async () => {
      // First create the customer profile as owner
      const ownerDb = getOwnerFirestore('owner-001');
      const customerRef = doc(ownerDb, 'customers', 'customer-001');
      await setDoc(customerRef, testCustomer);

      // Now try to read as customer
      const db = getCustomerFirestore('customer-001');
      const customerRef2 = doc(db, 'customers', 'customer-001');

      await assertSucceeds(getDoc(customerRef2));
    });

    it('should deny customer from reading other customer profiles', async () => {
      const db = getCustomerFirestore('customer-001');
      const customerRef = doc(db, 'customers', 'customer-002');

      await assertFails(getDoc(customerRef));
    });

    it('should deny brand managers from reading customer profiles', async () => {
      const db = getBrandFirestore('brand-manager-001', 'brand-001');
      const customerRef = doc(db, 'customers', 'customer-001');

      await assertFails(getDoc(customerRef));
    });

    it('should deny dispensary managers from reading customer profiles', async () => {
      const db = getDispensaryFirestore('disp-manager-001', 'location-001');
      const customerRef = doc(db, 'customers', 'customer-001');

      await assertFails(getDoc(customerRef));
    });

    it('should allow owner to read all customer profiles', async () => {
      // First create the customer profile
      const db = getOwnerFirestore('owner-001');
      const customerRef = doc(db, 'customers', 'customer-001');
      await setDoc(customerRef, testCustomer);

      // Now read it
      await assertSucceeds(getDoc(customerRef));
    });
  });

  describe('Create Access', () => {
    it('should deny unauthenticated users from creating customer profiles', async () => {
      const db = getUnauthenticatedFirestore();
      const customerRef = doc(db, 'customers', 'customer-new');

      await assertFails(setDoc(customerRef, testCustomer));
    });

    it('should allow customer to create their own profile', async () => {
      const db = getCustomerFirestore('customer-new');
      const customerRef = doc(db, 'customers', 'customer-new');

      await assertSucceeds(setDoc(customerRef, testCustomer));
    });

    it('should deny customer from creating other customer profiles', async () => {
      const db = getCustomerFirestore('customer-001');
      const customerRef = doc(db, 'customers', 'customer-002');

      await assertFails(setDoc(customerRef, testCustomer));
    });
  });

  describe('Update Access', () => {
    it('should allow customer to update their own profile', async () => {
      // First create the profile
      const db = getCustomerFirestore('customer-001');
      const customerRef = doc(db, 'customers', 'customer-001');
      await setDoc(customerRef, testCustomer);

      // Now update it
      await assertSucceeds(updateDoc(customerRef, { hasMedicalCard: true }));
    });

    it('should deny customer from updating other customer profiles', async () => {
      // First create a profile as owner
      const ownerDb = getOwnerFirestore('owner-001');
      const customerRef = doc(ownerDb, 'customers', 'customer-002');
      await setDoc(customerRef, testCustomer);

      // Now try to update as different customer
      const db = getCustomerFirestore('customer-001');
      const customerRef2 = doc(db, 'customers', 'customer-002');

      await assertFails(updateDoc(customerRef2, { hasMedicalCard: true }));
    });
  });

  describe('Delete Access', () => {
    it('should allow customer to delete their own profile', async () => {
      // First create the profile
      const db = getCustomerFirestore('customer-001');
      const customerRef = doc(db, 'customers', 'customer-001');
      await setDoc(customerRef, testCustomer);

      // Now delete it
      await assertSucceeds(deleteDoc(customerRef));
    });

    it('should deny customer from deleting other customer profiles', async () => {
      const db = getCustomerFirestore('customer-001');
      const customerRef = doc(db, 'customers', 'customer-002');

      await assertFails(deleteDoc(customerRef));
    });

    it('should allow owner to delete customer profiles', async () => {
      // First create the profile
      const db = getOwnerFirestore('owner-001');
      const customerRef = doc(db, 'customers', 'customer-001');
      await setDoc(customerRef, testCustomer);

      // Now delete it
      await assertSucceeds(deleteDoc(customerRef));
    });
  });
});
