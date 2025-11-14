// This file acts as a centralized re-exporter for domain types.
// It allows other modules to import types from a consistent path,
// even though the source of truth is in `src/firebase/converters.ts`.

export type {
  Product,
  Location,
  OrderDoc,
  Review,
  UserInteraction,
} from '@/firebase/converters';
