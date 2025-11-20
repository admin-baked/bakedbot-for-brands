
// This component is no longer used and will be removed in a future cleanup.
// All settings UI has been moved to the /account route.
// A new BillingForm component has been added.
import { BillingForm } from "./billing-form";

export default function SettingsTab() {
  const organizationId = "org_123";
  const locationCount = 3;

  return (
    <div className="space-y-8">
      <BillingForm
        organizationId={organizationId}
        locationCount={locationCount}
      />
    </div>
  );
}
