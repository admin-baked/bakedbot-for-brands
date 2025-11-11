
// Minimal types to avoid importing Firestore types here
type AnyQuery = {
  _query?: any;            // Query internals
  _aggregateQuery?: any;   // AggregationQuery internals
  _path?: { canonicalString?: string };
  path?: { canonicalString?: string };
};

export function getPathFromQuery(input: unknown): string {
  try {
    const q = input as AnyQuery;

    // 1) AggregationQuery (e.g., count(query))
    const ag = q?._aggregateQuery;
    const agGroup = ag?.query?.collectionGroup;
    if (agGroup) return `**/${agGroup}`;
    const agCanon = ag?.query?.path?.canonicalString;
    if (agCanon) return agCanon;

    // 2) Normal Query
    const qq = q?._query;
    const group = qq?.collectionGroup;
    if (group) return `**/${group}`;
    const qCanon = qq?.path?.canonicalString;
    if (qCanon) return qCanon;

    // 3) Collection / Document reference
    const pCanon = q?._path?.canonicalString ?? q?.path?.canonicalString;
    if (pCanon) return pCanon;
  } catch {
    // ignore
  }
  return "unknown/path";
}
