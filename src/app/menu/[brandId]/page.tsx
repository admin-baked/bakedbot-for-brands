// app/menu/[brandId]/page.tsx
import { MenuPage } from '@/components/menu-page';

type MenuPageProps = {
  params: { brandId: string };
};

export default function BrandMenuPage({ params }: MenuPageProps) {
  const brandId = params.brandId ?? 'default';
  return <MenuPage brandId={brandId} />;
}
