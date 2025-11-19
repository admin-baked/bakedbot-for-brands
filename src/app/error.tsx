
'use client';

import { useEffect } from "react";

export default function Error({ error, reset }: { error: any; reset: () => void }) {
  useEffect(() => {
    console.error("Local Error Boundary Caught:", error);
  }, [error]);

  return (
    <div className="p-6">
        <h1 className="text-xl font-semibold">Something went wrong here.</h1>
        <p className="text-sm text-muted-foreground mt-2">
            An error occurred within this part of the application.
        </p>
        <button className="mt-4 border rounded px-3 py-1" onClick={() => reset()}>
          Retry
        </button>
    </div>
  );
}
