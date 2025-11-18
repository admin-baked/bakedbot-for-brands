import { redirect } from 'next/navigation';

// This page now acts as a redirect to the dynamic brand route [brandId].
// This ensures that old URLs or tests pointing to `/menu/default` still work
// by routing them to the new canonical URL structure.
export default function MenuDefaultRedirect() {
  redirect('/menu/default');
}
