'use client';

// TEMP SAFE VERSION FOR PUBLIC DEMO
// This intentionally does NOT use useFirebase or any context.
// It avoids the "useFirebase must be used within a FirebaseProvider" crash.

type DispensaryLocatorProps = {
  // keep the shape wide open for now so we don't break callers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export default function DispensaryLocator(_props: DispensaryLocatorProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-slate-100">Find a dispensary</span>
        <span className="text-xs text-slate-500">Demo mode</span>
      </div>

      <p className="mb-3 text-xs text-slate-400">
        This is a public demo of the headless menu. Retailer selection and
        favorites are disabled here but fully functional in the logged-in app.
      </p>

      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400">
            Select a retailer
          </label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500"
            disabled
          >
            <option>Retailer selection disabled in demo</option>
          </select>
        </div>

        <p className="text-[11px] text-slate-500">
          Want to see this wired to your live retailers, favorites, and
          inventory? Log in to your brand dashboard or book a setup call.
        </p>
      </div>
    </div>
  );
}
