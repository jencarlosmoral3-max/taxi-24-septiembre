// Proxy geo provider-agnostic: la app solo ve {id,name,address,lat,lng} / {name,address} / {distance_m,duration_s,suggested_fare_cents}.
// Uso justo (MVP, proveedores OSM gratuitos): Photon y OSRM públicos sin SLA, Nominatim máx. 1 req/s con User-Agent propio.
// La cuota por usuario (consume_geo_quota) acota el tráfico; si el volumen crece, cambiar a Google/instancia propia aquí sin tocar la app.

export type Fetch = typeof fetch;
export type Place = { id: string; name: string; address: string; lat: number; lng: number };

const UA = "Vyro/0.1 (+https://github.com/jencarlosmoral3-max/taxi-24-septiembre)";
const T_PHOTON = 3000, T_NOMINATIM = 4000, T_OSRM = 5000;
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

async function getJson(f: Fetch, url: string, timeout: number): Promise<unknown> {
  const r = await f(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return await r.json();
}

// deno-lint-ignore no-explicit-any
type Any = any;

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
const join = (...p: unknown[]) => p.filter((x) => typeof x === "string" && x).join(", ");

function fromPhoton(j: Any): Place[] {
  const out: Place[] = [];
  for (const ft of j?.features ?? []) {
    const [lng, lat] = ft?.geometry?.coordinates ?? [];
    const p = ft?.properties ?? {};
    if (!isNum(lat) || !isNum(lng)) continue;
    const street = join(p.street, p.housenumber).replace(", ", " ");
    const name = p.name ?? street;
    if (!name) continue;
    out.push({
      id: `${p.osm_type ?? "x"}${p.osm_id ?? `${lat},${lng}`}`,
      name: String(name),
      address: join(street !== name ? street : "", p.district, p.city, p.state),
      lat, lng,
    });
  }
  return out;
}

function fromNominatim(j: Any): Place[] {
  const out: Place[] = [];
  for (const it of Array.isArray(j) ? j : []) {
    const lat = Number(it?.lat), lng = Number(it?.lon);
    if (!isNum(lat) || !isNum(lng) || !it?.display_name) continue;
    out.push({
      id: `n${it.place_id}`,
      name: String(it.name || String(it.display_name).split(",")[0]),
      address: String(it.display_name),
      lat, lng,
    });
  }
  return out;
}

// Nominatim prohíbe autocompletado: la búsqueda usa solo Photon (bbox + sesgo); Nominatim queda para reverse.
async function search(f: Fetch, b: Any): Promise<{ places: Place[] }> {
  const q = typeof b.q === "string" ? b.q.trim() : "";
  if (q.length < 3 || q.length > 100) throw new HttpError(400, "invalid_input");
  let bias = DEFAULT_BIAS;
  if (b.lat !== undefined || b.lng !== undefined) bias = coord(b);
  const key = `s:${q.toLowerCase().replace(/\s+/g, " ")}:${r5(bias.lat)}:${r5(bias.lng)}`;
  return await cached(key, 10 * 60_000, async () => {
    try {
      // Sin lang=es: Photon solo admite default/en/de/fr/it y devolvería 400.
      const bbox = `${BBOX.minLng},${BBOX.minLat},${BBOX.maxLng},${BBOX.maxLat}`;
      const u = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${bias.lat}&lon=${bias.lng}&bbox=${bbox}&limit=6`;
      return { places: fromPhoton(await getJson(f, u, T_PHOTON)).filter((p) => inMetro(p.lat, p.lng)) };
    } catch {
      throw new HttpError(502, "upstream_error");
    }
  });
}

async function reverse(f: Fetch, rpc: Rpc, b: Any): Promise<{ name: string; address: string }> {
  const { lat, lng } = coord(b);
  return await cached(`r:${r5(lat)}:${r5(lng)}`, 10 * 60_000, async () => {
    try {
      const p = fromPhoton(await getJson(f, `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, T_PHOTON))[0];
      if (p) return { name: p.name, address: p.address };
    } catch { /* cae a Nominatim */ }
    // Respaldo bajo compuerta global de 1 req/s; sin slot se omite.
    try {
      if (await slot(rpc, "nominatim")) {
        const j = await getJson(f, `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=es`, T_NOMINATIM) as Any;
        if (j?.display_name) return { name: String(j.name || String(j.display_name).split(",")[0]), address: String(j.display_name) };
      }
    } catch { /* 502 abajo */ }
    throw new HttpError(502, "upstream_error");
  });
}

export type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

async function slot(rpc: Rpc, provider: string): Promise<boolean> {
  const { data, error } = await rpc("geo_upstream_slot", { p_provider: provider });
  return !error && data === true;
}

async function route(f: Fetch, rpc: Rpc, b: Any) {
  const from = coord(b.from), to = coord(b.to);
  const key = `o:${r5(from.lat)},${r5(from.lng)};${r5(to.lat)},${r5(to.lng)}`;
  const leg = await cached(key, 60 * 60_000, async () => {
    if (!(await slot(rpc, "osrm"))) {
      await new Promise((r) => setTimeout(r, 1000));
      if (!(await slot(rpc, "osrm"))) throw new HttpError(503, "busy");
    }
    try {
      const j = await getJson(f, `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`, T_OSRM) as Any;
      return j?.code === "Ok" ? j.routes?.[0] : null;
    } catch {
      throw new HttpError(502, "upstream_error");
    }
  }) as Any;
  if (!leg || !isNum(leg.distance) || !isNum(leg.duration)) throw new HttpError(502, "upstream_error");
  const distance_m = Math.round(leg.distance), duration_s = Math.round(leg.duration);
  const { data, error } = await rpc("suggest_fare", { p_distance_m: distance_m, p_duration_s: duration_s });
  if (error?.message?.includes("invalid_route")) throw new HttpError(422, "invalid_route");
  if (error || !isNum(data)) throw new HttpError(500, "internal_error");
  return { distance_m, duration_s, suggested_fare_cents: data };
}

export type Deps = {
  fetch: Fetch;
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
    const rpc = d.rpcFor(auth);
    const quota = await rpc("consume_geo_quota");
    if (quota.error) throw new HttpError(quota.error.message.includes("rate_limited") ? 429 : 500, quota.error.message.includes("rate_limited") ? "rate_limited" : "internal_error");
    const text = await req.text();
    if (text.length > 2048) throw new HttpError(400, "invalid_input");
    let b: Any;
    try { b = JSON.parse(text); } catch { throw new HttpError(400, "invalid_input"); }
    if (!b || typeof b !== "object") throw new HttpError(400, "invalid_input");
    switch (b.op) {
      case "search": return json(200, await search(d.fetch, b));
      case "reverse": return json(200, await reverse(d.fetch, rpc, b));
      case "route": return json(200, await route(d.fetch, rpc, b));
      default: throw new HttpError(400, "invalid_input");
    }
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.code });
    console.error("geo: internal error"); // nunca se reenvía el detalle
    return json(500, { error: "internal_error" });
  }
}
