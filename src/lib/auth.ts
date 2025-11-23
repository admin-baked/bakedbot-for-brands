export type AppUser = {
  uid: string;
  email: string | null;
  role: 'brand' | 'dispensary' | 'admin';
  brandId?: string;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  // Dev bypass: pretend we’re logged in during rebuild
  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true') {
    return {
      uid: 'dev-user',
      email: 'dev@bakedbot.ai',
      role: 'brand',
      brandId: 'dev-brand',
    };
  }

  // TODO: real Firebase/whatever later
  return null;
}
