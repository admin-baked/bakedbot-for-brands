
// This page now simply renders the default layout's children.
// The actual content is in /menu/(default)/page.tsx
// The data fetching is handled by the root /menu/layout.tsx

import DefaultMenuPageContents from '../(default)/page';

export default function BrandMenuPage() {
  return <DefaultMenuPageContents />;
}
