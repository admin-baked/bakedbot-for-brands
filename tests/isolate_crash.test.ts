
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('firebase-admin/firestore', () => ({ Firestore: jest.fn() }));
jest.mock('@/firebase/server-client', () => ({ createServerClient: jest.fn() }));
jest.mock('@/server/auth/auth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/pos/adapters/dutchie', () => ({ DutchieClient: jest.fn() }));

import { syncMenu } from '@/app/dashboard/menu/actions';

describe('Isolation Check', () => {
    it('loads module', () => {
        expect(syncMenu).toBeDefined();
    });
});
