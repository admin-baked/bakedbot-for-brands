#!/usr/bin/env tsx
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const [, , orgId, daysArg] = process.argv;
const lookbackDays = daysArg ? Number(daysArg) : 365;

if (!orgId) {
  console.error('Usage: tsx scripts/run-backfill-sales.ts <orgId> [days]');
  process.exit(1);
}

if (!Number.isFinite(lookbackDays) || lookbackDays <= 0) {
  console.error('Days must be a positive number');
  process.exit(1);
}

async function main() {
  const { backfillHistoricalSalesData } = await import('../src/server/services/order-analytics');
  const result = await backfillHistoricalSalesData(orgId, lookbackDays);
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
