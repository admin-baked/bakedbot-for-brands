
'use client';

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: any; reset: () => void }) {
  useEffect(() => {
    console.error("Global Error Boundary Caught:", error);
    // Auto-recover on stale-chunk errors
    if (error?.name === 'ChunkLoadError' || /Loading chunk \d+ failed/i.test(String(error))) {
      // Force a full reload to fetch the new build's manifest/chunks
      window.location.reload();
    }
  }, [error]);

  return (
    <html>
      <body className="p-6">
        <h1 className="text-xl font-semibold">Something went sideways.</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Trying to recover…
        </p>
        <button className="mt-4 border rounded px-3 py-1" onClick={() => reset()}>
          Retry
        </button>
      </body>
    </html>
  );
}
