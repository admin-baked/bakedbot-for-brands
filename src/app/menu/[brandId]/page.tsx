
// This page now simply renders the default layout's children.
// The actual content is in /menu/page.tsx
// The data fetching is handled by the root /menu/layout.tsx
import MenuPageContents from '../page';

export default function BrandMenuPage() {
  return <MenuPageContents />;
}
