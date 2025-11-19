// functions/src/index.ts

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

const allowCors = (res: any) => {
  // CORS for direct testing in browser; Next.js calls don't strictly need this,
  // but it doesn't hurt.
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-control-allow-methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

export const health = onRequest((req, res) => {
  if (req.method === "OPTIONS") {
    allowCors(res);
    res.status(204).send("");
    return;
  }

  allowCors(res);
  res.json({
    ok: true,
    service: "cannmenus-proxy",
    time: new Date().toISOString(),
  });
});

// --- brands stub ---
export const brands = onRequest((req, res) => {
  if (req.method === "OPTIONS") {
    allowCors(res);
    res.status(204).send("");
    return;
  }

  allowCors(res);

  const search = (req.query.search as string) ?? "";
  logger.info("CannMenus brands search", { search });

  res.json({
    source: "firebase-functions:brands (stub)",
    query: search,
    items: [], // later this will be the list from CannMenus
  });
});

// --- retailers stub ---
export const retailers = onRequest((req, res) => {
  if (req.method === "OPTIONS") {
    allowCors(res);
    res.status(204).send("");
    return;
  }

  allowCors(res);

  const search = (req.query.search as string) ?? "";
  logger.info("CannMenus retailers search", { search });

  res.json({
    source: "firebase-functions:retailers (stub)",
    query: search,
    items: [],
  });
});

// --- products stub ---
export const products = onRequest((req, res) => {
  if (req.method === "OPTIONS") {
    allowCors(res);
    res.status(204).send("");
    return;
  }

  allowCors(res);

  const search = (req.query.search as string) ?? "";
  const brandId = (req.query.brandId as string) ?? "";
  const retailerId = (req.query.retailerId as string) ?? "";

  logger.info("CannMenus products search", { search, brandId, retailerId });

  res.json({
    source: "firebase-functions:products (stub)",
    query: { search, brandId, retailerId },
    items: [],
  });
});
