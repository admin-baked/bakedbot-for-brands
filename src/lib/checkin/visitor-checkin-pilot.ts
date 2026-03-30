const THRIVE_VISITOR_CHECKIN_BRAND_SLUG = 'thrivesyracuse';
const THRIVE_VISITOR_CHECKIN_ORG_ID = 'org_thrive_syracuse';

interface VisitorCheckinPilotArgs {
  brandSlug: string;
  brandOrgId?: string | null;
  brandId?: string | null;
  originalBrandId?: string | null;
}

export function getVisitorCheckinPilotOrgId({
  brandSlug,
  brandOrgId,
  brandId,
  originalBrandId,
}: VisitorCheckinPilotArgs): string | null {
  const matchingOrgId = [brandOrgId, brandId, originalBrandId].find(
    (value) => value === THRIVE_VISITOR_CHECKIN_ORG_ID,
  );

  if (matchingOrgId) {
    return THRIVE_VISITOR_CHECKIN_ORG_ID;
  }

  return brandSlug === THRIVE_VISITOR_CHECKIN_BRAND_SLUG
    ? THRIVE_VISITOR_CHECKIN_ORG_ID
    : null;
}

export function isVisitorCheckinPilot(args: VisitorCheckinPilotArgs): boolean {
  return getVisitorCheckinPilotOrgId(args) !== null;
}
