// This page now simply renders the default layout's children.
// The data fetching is handled by the root /menu/layout.tsx
import MenuPageContents from '@/app/menu/page';

export default function BrandMenuPage() {
  return <MenuPageContents />;
}
