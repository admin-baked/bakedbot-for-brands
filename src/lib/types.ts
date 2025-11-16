
// This file acts as a centralized re-exporter for domain types.
// It allows other modules to import types from a consistent path,
// even though the source of truth is in `src/types/domain.ts`.

export type {
  Product,
  Retailer,
  OrderDoc,
  Review,
  UserInteraction,
} from '@/types/domain';

    