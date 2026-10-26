import { getStore } from "@netlify/blobs";

const KEY = "wishlist-state";
const MAX_BYTES = 500_000;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  const store = getStore("wishlist");

  if (req.method === "GET") {
    const state = await store.get(KEY, { type: "json" });
    return json(state ?? null);
  }

  if (req.method === "PUT") {
    const text = await req.text();
    if (text.length > MAX_BYTES) return json({ error: "too large" }, 413);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "bad json" }, 400);
    }
    if (!Array.isArray(body.items) || typeof body.ownerName !== "string") {
      return json({ error: "bad shape" }, 400);
    }
    const state = { items: body.items, ownerName: body.ownerName, version: body.version ?? 0, knownIds: Array.isArray(body.knownIds) ? body.knownIds : [], trash: Array.isArray(body.trash) ? body.trash.slice(0, 100) : [], updatedAt: Date.now() };
    await store.setJSON(KEY, state);
    return json(state);
  }

  return json({ error: "method not allowed" }, 405);
};

export const config = { path: "/api/state" };
