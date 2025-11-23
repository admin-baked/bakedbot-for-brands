// app/menu/[brandId]/page.tsx
import { DemoMenuPage } from '@/components/demo-menu-page';

type MenuPageProps = {
  params: { brandId: string };
};

export default function BrandMenuPage({ params }: MenuPageProps) {
  const brandId = params.brandId ?? 'default';

  return <DemoMenuPage brandId={brandId} />;
}
