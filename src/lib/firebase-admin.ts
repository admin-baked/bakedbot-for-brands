import 'server-only';
import { getAdminAuth, getAdminFirestore, getAdminStorage } from '@/firebase/admin';

export function getFirestore() {
  return getAdminFirestore();
}

export function getAuth() {
  return getAdminAuth();
}

export function getStorage() {
  return getAdminStorage();
}

