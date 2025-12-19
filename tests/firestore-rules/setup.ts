// [AI-THREAD P0-TEST-FIRESTORE-RULES]
// [Dev1-Claude @ 2025-11-30]:
//   Firebase emulator test setup for Firestore security rules.
//   Provides utility functions for creating test contexts with different roles.

import { initializeTestEnvironment, RulesTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { setLogLevel } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Suppress Firebase logs during tests
setLogLevel('error');

let testEnv: RulesTestEnvironment;

/**
 * Initialize Firebase emulator test environment
 */
export async function setupTestEnv() {
  testEnv = await initializeTestEnvironment({
    projectId: 'bakedbot-test',
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });

  return testEnv;
}

/**
 * Cleanup test environment after tests
 */
export async function teardownTestEnv() {
  if (testEnv) {
    await testEnv.cleanup();
  }
}

/**
 * Clear all Firestore data between tests
 */
export async function clearFirestore() {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
}

/**
 * Get Firestore instance for unauthenticated user
 */
export function getUnauthenticatedFirestore() {
  return testEnv.unauthenticatedContext().firestore();
}

/**
 * Get Firestore instance for authenticated user (customer role)
 */
export function getCustomerFirestore(uid: string) {
  return testEnv.authenticatedContext(uid, {
    role: 'customer',
  }).firestore();
}

/**
 * Get Firestore instance for brand manager
 */
export function getBrandFirestore(uid: string, brandId: string) {
  return testEnv.authenticatedContext(uid, {
    role: 'brand',
    brandId,
  }).firestore();
}

/**
 * Get Firestore instance for dispensary manager
 */
export function getDispensaryFirestore(uid: string, locationId: string) {
  return testEnv.authenticatedContext(uid, {
    role: 'dispensary',
    locationId,
  }).firestore();
}

/**
 * Get Firestore instance for owner/admin
 */
export function getOwnerFirestore(uid: string) {
  return testEnv.authenticatedContext(uid, {
    role: 'owner',
  }).firestore();
}

/**
 * Get Firestore instance with organization claim
 */
export function getOrgFirestore(uid: string, orgId: string) {
  return testEnv.authenticatedContext(uid, {
    orgId,
  }).firestore();
}

/**
 * Helper to assert read succeeds
 */
export { assertSucceeds };

/**
 * Helper to assert read/write fails
 */
export { assertFails };

/**
 * Get test environment instance (for advanced usage)
 */
export function getTestEnv() {
  return testEnv;
}
