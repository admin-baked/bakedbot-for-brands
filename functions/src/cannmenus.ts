// functions/src/cannmenus.ts
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const CANNMENUS_API_KEY = defineSecret("CANNMENUS_API_KEY");
const BASE_URL = "https://api.cannmenus.com";

// Simple Firestore cache (per endpoint + params)
async function getOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const ref = db.collection("_cache").doc(key);
  const snap = await ref.get();
  const now = Date.now();

  if (snap.exists) {
    const { value, expiresAt } = snap.data() as any;
    if (expiresAt && expiresAt > now) {
      return value as T;
    }
  }

  const value = await fetcher();
  await ref.set(
    {
      value,
      expiresAt: now + ttlSeconds * 1000,
      updatedAt: now,
    },
    { merge: true }
  );
  return value;
}

async function cannMenusGet(
  path: string,
  params: Record<string, any>,
  token: string,
  retries = 3
): Promise<any> {
  const url = new URL(path, BASE_URL);

  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      v.forEach((val) => url.searchParams.append(k, String(val)));
    } else {
      url.searchParams.set(k, String(v));
    }
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const resp = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Token": token,
        "User-Agent": "BakedBot-Brands/1.0",
      },
    });

    const text = await resp.text();
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      // ignore JSON parse issues; we'll surface the text in the error
    }

    if (resp.ok) return body;

    // Retry 429 + 5xx
    if ((resp.status === 429 || resp.status >= 500) && attempt < retries) {
      await new Promise((r) => setTimeout(r, 300 * attempt));
      continue;
    }

    throw new Error(
      `CannMenus ${resp.status} ${resp.statusText}: ${text.slice(0, 300)}`
    );
  }

  // This should be unreachable
  throw new Error("CannMenus request failed after retries");
}

// GET /brands – proxy to CannMenus /v1/brands
export const brands = onRequest(
  { secrets: [CANNMENUS_API_KEY], cors: true },
  async (req, res) => {
    try {
      const search = (req.query.search as string) || "";
      const key = `brands:${search}`;
      const data = await getOrFetch(key, 60 * 60 * 24, () =>
        cannMenusGet("/v1/brands", { search }, CANNMENUS_API_KEY.value())
      );
      res.json({ ok: true, data });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);

// GET /retailers – proxy to CannMenus /v1/retailers
export const retailers = onRequest(
  { secrets: [CANNMENUS_API_KEY], cors: true },
  async (req, res) => {
    try {
      const search = (req.query.search as string) || "";
      const key = `retailers:${search}`;
      const data = await getOrFetch(key, 60 * 60 * 24, () =>
        cannMenusGet("/v1/retailers", { search }, CANNMENUS_API_KEY.value())
      );
      res.json({ ok: true, data });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);

// GET /products – proxy to CannMenus /v2/products for a single retailer
// (we'll extend this later to support brand/geo fanout)
export const products = onRequest(
  { secrets: [CANNMENUS_API_KEY], cors: true },
  async (req, res) => {
    try {
      const retailerId = req.query.retailerId as string | undefined;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 100);

      if (!retailerId) {
        res
          .status(400)
          .json({ ok: false, error: "retailerId query param is required" });
        return;
      }

      const token = CANNMENUS_API_KEY.value();
      const key = `products:${retailerId}:p${page}:l${limit}`;

      const data = await getOrFetch(key, 60 * 60 * 4, () =>
        cannMenusGet(
          "/v2/products",
          { retailers: retailerId, page, limit },
          token
        )
      );

      res.json({ ok: true, data });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);
