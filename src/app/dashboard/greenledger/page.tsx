import { requireUser } from '@/server/auth/auth';
import { getBrandOffers, getBrandGreenLedgerSummary } from '@/server/services/greenledger';
import { getMarketplaceOffers, getMyAdvances, getDispensaryGreenLedgerSummary } from '@/server/services/greenledger';
import BrandGreenLedger from './components/brand-greenledger';
import DispensaryGreenLedger from './components/dispensary-greenledger';

export default async function GreenLedgerPage() {
  const user = await requireUser();
  const role = user.role;

  // Brand org view
  if (role === 'brand_admin' || (role === 'super_user' && user.orgType === 'brand')) {
    const orgId = user.currentOrgId ?? user.orgId ?? '';
    const [offers, advances, summary] = await Promise.all([
      getBrandOffers(orgId).catch(() => []),
      import('@/server/services/greenledger').then((m) =>
        m.getBrandAdvances(orgId).catch(() => []),
      ),
      getBrandGreenLedgerSummary(orgId).catch(() => null),
    ]);
    return <BrandGreenLedger offers={offers} advances={advances} summary={summary} />;
  }

  // Dispensary org view (default for dispensary_admin + super_user on dispensary)
  const orgId = user.currentOrgId ?? user.orgId ?? '';
  const [marketplace, myAdvances, summary] = await Promise.all([
    getMarketplaceOffers(orgId).catch(() => []),
    getMyAdvances(orgId).catch(() => []),
    getDispensaryGreenLedgerSummary(orgId).catch(() => null),
  ]);

  return (
    <DispensaryGreenLedger
      marketplace={marketplace}
      myAdvances={myAdvances}
      summary={summary}
    />
  );
}
