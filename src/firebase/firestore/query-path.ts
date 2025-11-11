
// Minimal types to avoid importing Firestore types here
type AnyQuery = {
  _query?: any;            // Query internals
  _aggregateQuery?: any;   // AggregationQuery internals
  _path?: { canonicalString?: string | (() => string) };
  path?: { canonicalString?: string | (() => string) };
};

function canon(p: any): string | undefined {
  const v = p?.canonicalString;
  if (typeof v === "function") {
    try { return v.call(p); } catch {}
  }
  if (typeof v === "string" && v) return v;
  return undefined;
}

export function getPathFromQuery(input: unknown): string {
  try {
    const q = input as AnyQuery;

    // 1) AggregationQuery (e.g., count(query))
    const ag = q?._aggregateQuery;
    const agGroup = ag?.query?.collectionGroup;
    if (agGroup) return `**/${agGroup}`;
    const agCanon = canon(ag?.query?.path);
    if (agCanon) return agCanon;

    // 2) Normal Query
    const qq = q?._query;
    const group = qq?.collectionGroup;
    if (group) return `**/${group}`;
    const qCanon = canon(qq?.path);
    if (qCanon) return qCanon;

    // 3) Collection / Document refs
    const pCanon = canon(q?._path) ?? canon(q?.path);
    if (pCanon) return pCanon;
  } catch {}
  return "unknown/path";
}
