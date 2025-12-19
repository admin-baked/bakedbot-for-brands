// [AI-THREAD P0-TEST-FIRESTORE-RULES]
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
    setupTestEnv,
    teardownTestEnv,
    clearFirestore,
    getUnauthenticatedFirestore,
    getCustomerFirestore,
    getOwnerFirestore,
    getOrgFirestore,
    assertSucceeds,
    assertFails,
} from './setup';
import { doc, getDoc, setDoc } from 'firebase/firestore';

describe('Firestore Rules: organizations collection', () => {
    beforeAll(async () => {
        await setupTestEnv();
    });

    afterAll(async () => {
        await teardownTestEnv();
    });

    beforeEach(async () => {
        await clearFirestore();

        // Seed an organization as owner
        const db = getOwnerFirestore('owner-001');
        await setDoc(doc(db, 'organizations', 'org-123'), {
            name: 'Test Org',
            ownerId: 'user-456',
            billing: { planId: 'free', status: 'active' }
        });
    });

    describe('Read Access', () => {
        it('should deny unauthenticated users from reading organizations', async () => {
            const db = getUnauthenticatedFirestore();
            const orgRef = doc(db, 'organizations', 'org-123');
            await assertFails(getDoc(orgRef));
        });

        it('should allow the ownerId of the organization to read', async () => {
            // isOwner helper in rules checks request.auth.uid == userId, but for orgs 
            // we check resource.data.ownerId == request.auth.uid or token.orgId
            const db = getCustomerFirestore('user-456'); // UID matches ownerId
            const orgRef = doc(db, 'organizations', 'org-123');
            await assertSucceeds(getDoc(orgRef));
        });

        it('should allow a user with matching orgId claim to read', async () => {
            const db = getOrgFirestore('user-789', 'org-123');
            const orgRef = doc(db, 'organizations', 'org-123');
            await assertSucceeds(getDoc(orgRef));
        });

        it('should allow global owner to read any organization', async () => {
            const db = getOwnerFirestore('global-owner');
            const orgRef = doc(db, 'organizations', 'org-123');
            await assertSucceeds(getDoc(orgRef));
        });

        it('should deny a user from a different organization', async () => {
            const db = getOrgFirestore('user-other', 'org-other');
            const orgRef = doc(db, 'organizations', 'org-123');
            await assertFails(getDoc(orgRef));
        });
    });

    describe('Write Access', () => {
        it('should deny regular users from writing to organizations', async () => {
            const db = getOrgFirestore('user-456', 'org-123');
            const orgRef = doc(db, 'organizations', 'org-123');
            await assertFails(setDoc(orgRef, { name: 'Hacked' }, { merge: true }));
        });

        it('should allow global owner to write to organizations', async () => {
            const db = getOwnerFirestore('global-owner');
            const orgRef = doc(db, 'organizations', 'org-123');
            await assertSucceeds(setDoc(orgRef, { name: 'Updated' }, { merge: true }));
        });
    });
});
