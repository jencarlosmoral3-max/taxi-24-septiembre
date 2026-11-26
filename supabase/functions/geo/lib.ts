// Proxy geo provider-agnostic: la app solo ve {id,name,address,lat,lng} / {name,address} / {distance_m,duration_s,suggested_fare_cents}.
// Proveedor: Geoapify (plan gratis: 3000 créditos/día, API key en el secret GEOAPIFY_API_KEY). Photon y Nominatim públicos
// responden 403 a las IPs de Supabase Edge, así que no son opción. La key viaja en la URL: la URL nunca se loguea ni se lanza en errores.
// La cuota por usuario (consume_geo_quota) y la caché acotan el consumo; si el volumen crece, cambiar de plan/proveedor aquí sin tocar la app.

export type Fetch = typeof fetch;
export type Place = { id: string; name: string; address: string; lat: number; lng: number };

const API = "https://api.geoapify.com/v1";
const T_GEO = 4000, T_ROUTE = 5000;
const BBOX = { minLng: -63.4, maxLng: -62.95, minLat: -18.05, maxLat: -17.55 }; // Santa Cruz metro
const DEFAULT_BIAS = { lat: -17.7833, lng: -63.1821 };

export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const inBolivia = (lat: number, lng: number) => lat >= -23 && lat <= -9 && lng >= -70 && lng <= -57;
const inMetro = (lat: number, lng: number) =>
  lat >= BBOX.minLat && lat <= BBOX.maxLat && lng >= BBOX.minLng && lng <= BBOX.maxLng;

function coord(v: unknown): { lat: number; lng: number } {
  const o = v as { lat?: unknown; lng?: unknown } | null;
  if (!o || !isNum(o.lat) || !isNum(o.lng) || !inBolivia(o.lat, o.lng)) throw new HttpError(400, "invalid_input");
  return { lat: o.lat, lng: o.lng };
}

// El mensaje del error nunca incluye la URL (lleva la apiKey): ni el de fetch ni el cuerpo de la respuesta.
async function getJson(f: Fetch, url: string, timeout: number): Promise<unknown> {
  let r: Response;
  try {
    r = await f(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(timeout) });
  } catch (e) {
    throw new Error(`upstream fetch failed (${(e as Error)?.name ?? "error"})`);
  }
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  try {
    return await r.json();
  } catch (e) {
    throw new Error(`upstream bad body (${(e as Error)?.name ?? "error"})`);
  }
}

// Viajes interurbanos: suggest_fare los rechazaría igual (> 200 km por carretera); se corta antes de llamar al upstream.
const MAX_ROUTE_KM = 150;
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// deno-lint-ignore no-explicit-any
type Any = any;
export type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

// Cobra 1 crédito del tope global; se llama solo antes de un fetch real a Geoapify (caché miss).
async function takeCredit(rpc: Rpc): Promise<void> {
  const { error } = await rpc("consume_geo_upstream_credit");
  if (error) throw error.message.includes("rate_limited") ? new HttpError(429, "rate_limited") : new HttpError(500, "internal_error");
}

// shortcut: per-isolate cache, lost on cold start; move to DB/KV if traffic grows
const cache = new Map<string, { exp: number; v: unknown }>();
const CACHE_MAX = 500;
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.v as T;
  const v = await fn();
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!); // FIFO
  cache.set(key, { exp: Date.now() + ttlMs, v });
  return v;
}
export const clearCache = () => cache.clear();
const r5 = (n: number) => n.toFixed(5);
const r2 = (n: number) => n.toFixed(2); // ~1 km
const join = (...p: unknown[]) => p.filter((x) => typeof x === "string" && x).join(", ");

function fromGeoapify(j: Any): Place[] {
  const out: Place[] = [];
  for (const p of Array.isArray(j?.results) ? j.results : []) {
    if (typeof p?.lat !== "number" || typeof p?.lon !== "number") continue;
    const lat: number = p.lat, lng: number = p.lon;
    if (!isNum(lat) || !isNum(lng)) continue;
    const street = join(p.street, p.housenumber).replace(", ", " ");
    const name = p.name || street || String(p.formatted ?? "").split(",")[0].trim();
    if (!name) continue;
    out.push({
      id: String(p.place_id ?? `${lat},${lng}`),
      name: String(name),
      address: join(street !== name ? street : "", p.suburb ?? p.district, p.city) || String(p.formatted ?? ""),
      lat, lng,
    });
  }
  return out;
}

async function search(f: Fetch, rpc: Rpc, key: string, b: Any): Promise<{ places: Place[] }> {
  const q = typeof b.q === "string" ? b.q.trim() : "";
  if (q.length < 3 || q.length > 100) throw new HttpError(400, "invalid_input");
  let bias = DEFAULT_BIAS;
  if (b.lat !== undefined || b.lng !== undefined) bias = coord(b);
  const blat = r2(bias.lat), blng = r2(bias.lng); // no se confía en que la app ya redondee
  const ck = `s:${q.toLowerCase().replace(/\s+/g, " ")}:${blat}:${blng}`;
  return await cached(ck, 10 * 60_000, async () => {
    await takeCredit(rpc);
    try {
      const rect = `${BBOX.minLng},${BBOX.minLat},${BBOX.maxLng},${BBOX.maxLat}`;
      const u = `${API}/geocode/autocomplete?text=${encodeURIComponent(q)}&filter=rect:${rect}&bias=proximity:${blng},${blat}&limit=6&lang=es&format=json&apiKey=${encodeURIComponent(key)}`;
      return { places: fromGeoapify(await getJson(f, u, T_GEO)).filter((p) => inMetro(p.lat, p.lng)) };
    } catch (e) {
      console.error("geo upstream", "search", String(e));
      throw new HttpError(502, "upstream_error");
    }
  });
}

async function reverse(f: Fetch, rpc: Rpc, key: string, b: Any): Promise<{ name: string; address: string }> {
  const { lat, lng } = coord(b);
  return await cached(`r:${r5(lat)}:${r5(lng)}`, 10 * 60_000, async () => {
    await takeCredit(rpc);
    try {
      const p = fromGeoapify(await getJson(f, `${API}/geocode/reverse?lat=${lat}&lon=${lng}&lang=es&format=json&apiKey=${encodeURIComponent(key)}`, T_GEO))[0];
      if (p) return { name: p.name, address: p.address };
    } catch (e) { console.error("geo upstream", "reverse", String(e)); }
    throw new HttpError(502, "upstream_error");
  });
}

async function route(f: Fetch, rpc: Rpc, key: string, b: Any) {
  const from = coord(b.from), to = coord(b.to);
  if (km(from, to) > MAX_ROUTE_KM) throw new HttpError(422, "invalid_route");
  const ck = `o:${r5(from.lat)},${r5(from.lng)};${r5(to.lat)},${r5(to.lng)}`;
  const leg = await cached(ck, 60 * 60_000, async () => {
    await takeCredit(rpc);
    try {
      const j = await getJson(f, `${API}/routing?waypoints=${from.lat},${from.lng}|${to.lat},${to.lng}&mode=drive&format=json&apiKey=${encodeURIComponent(key)}`, T_ROUTE) as Any;
      const leg = j?.results?.[0];
      if (!leg) throw new Error("empty route"); // no se cachea un resultado vacío
      return leg;
    } catch (e) {
      console.error("geo upstream", "route", String(e));
      throw new HttpError(502, "upstream_error");
    }
  }) as Any;
  if (!isNum(leg.distance) || !isNum(leg.time)) throw new HttpError(502, "upstream_error");
  const distance_m = Math.round(leg.distance), duration_s = Math.round(leg.time);
  const { data, error } = await rpc("suggest_fare", { p_distance_m: distance_m, p_duration_s: duration_s });
  if (error?.message?.includes("invalid_route")) throw new HttpError(422, "invalid_route");
  if (error || !isNum(data)) throw new HttpError(500, "internal_error");
  return { distance_m, duration_s, suggested_fare_cents: data };
}

export type Deps = {
  fetch: Fetch;
  geoapifyKey: string; // vacío = no configurado
  // Devuelve el id del usuario autenticado o null (anon key sola, token inválido).
  getUserId: (authHeader: string) => Promise<string | null>;
  rpcFor: (authHeader: string) => Rpc;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

export async function handle(req: Request, d: Deps): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey" } });
  }
  try {
    if (req.method !== "POST") throw new HttpError(405, "method_not_allowed");
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ") || !(await d.getUserId(auth))) throw new HttpError(401, "unauthorized");
    if (!d.geoapifyKey) { console.error("geo: GEOAPIFY_API_KEY missing"); throw new HttpError(500, "internal_error"); }
    const rpc = d.rpcFor(auth);
    const text = await req.text();
    if (text.length > 2048) throw new HttpError(400, "invalid_input");
    let b: Any;
    try { b = JSON.parse(text); } catch { throw new HttpError(400, "invalid_input"); }
    if (!b || typeof b !== "object" || !["search", "reverse", "route"].includes(b.op)) throw new HttpError(400, "invalid_input");
    // La cuota por usuario se cobra solo con cuerpo válido y op conocida.
    const quota = await rpc("consume_geo_quota");
    if (quota.error) throw new HttpError(quota.error.message.includes("rate_limited") ? 429 : 500, quota.error.message.includes("rate_limited") ? "rate_limited" : "internal_error");
    switch (b.op) {
      case "search": return json(200, await search(d.fetch, rpc, d.geoapifyKey, b));
      case "reverse": return json(200, await reverse(d.fetch, rpc, d.geoapifyKey, b));
      case "route": return json(200, await route(d.fetch, rpc, d.geoapifyKey, b));
      default: throw new HttpError(400, "invalid_input");
    }
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.code });
    console.error("geo: internal error"); // nunca se reenvía el detalle
    return json(500, { error: "internal_error" });
  }
}
