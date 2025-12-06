
'use client';

import FelishaErrorBoundary from "@/components/error-reporting/error-boundary";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <FelishaErrorBoundary error={error} reset={reset} />;
}
