// This component was incorrectly configured as a route segment.
// The exports for `dynamic` and `revalidate` have been removed to fix a build error.

import DispensaryLoginForm from './components/login-form';

export default function DispensaryLoginPage() {
    return <DispensaryLoginForm />;
}
