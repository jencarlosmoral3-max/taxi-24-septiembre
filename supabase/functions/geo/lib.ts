// Proxy geo provider-agnostic: la app solo ve {id,name,address,lat,lng} / {name,address} / {distance_m,duration_s,suggested_fare_cents}.
// Uso justo (MVP, proveedores OSM gratuitos): Photon y OSRM públicos sin SLA, Nominatim máx. 1 req/s con User-Agent propio.
// La cuota por usuario (consume_geo_quota) acota el tráfico; si el volumen crece, cambiar a Google/instancia propia aquí sin tocar la app.

export type Fetch = typeof fetch;
export type Place = { id: string; name: string; address: string; lat: number; lng: number };

const UA = "Vyro/0.1 (demo; +https://github.com)";
const TIMEOUT_MS = 8000;
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

async function getJson(f: Fetch, url: string): Promise<unknown> {
  const r = await f(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return await r.json();
}

// deno-lint-ignore no-explicit-any
type Any = any;
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

async function search(f: Fetch, b: Any): Promise<{ places: Place[] }> {
  const q = typeof b.q === "string" ? b.q.trim() : "";
  if (q.length < 3 || q.length > 100) throw new HttpError(400, "invalid_input");
  let bias = DEFAULT_BIAS;
  if (b.lat !== undefined || b.lng !== undefined) bias = coord(b);
  const inBox = (p: Place) => inMetro(p.lat, p.lng);
  try {
    // Sin lang=es: Photon solo admite default/en/de/fr/it y devolvería 400 (shortcut: nombres en idioma local del mapa).
    const u = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${bias.lat}&lon=${bias.lng}&limit=6`;
    const places = fromPhoton(await getJson(f, u)).filter(inBox);
    if (places.length) return { places };
  } catch { /* cae a Nominatim */ }
  try {
    const vb = `${BBOX.minLng},${BBOX.maxLat},${BBOX.maxLng},${BBOX.minLat}`;
    const u = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=bo&viewbox=${vb}&bounded=1&format=jsonv2&limit=6&accept-language=es`;
    return { places: fromNominatim(await getJson(f, u)).filter(inBox) };
  } catch {
    throw new HttpError(502, "upstream_error");
  }
}

async function reverse(f: Fetch, b: Any): Promise<{ name: string; address: string }> {
  const { lat, lng } = coord(b);
  try {
    const p = fromPhoton(await getJson(f, `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`))[0];
    if (p) return { name: p.name, address: p.address };
  } catch { /* cae a Nominatim */ }
  try {
    const j = await getJson(f, `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=es`) as Any;
    if (j?.display_name) return { name: String(j.name || String(j.display_name).split(",")[0]), address: String(j.display_name) };
  } catch { /* 502 abajo */ }
  throw new HttpError(502, "upstream_error");
}

export type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

async function route(f: Fetch, rpc: Rpc, b: Any) {
  const from = coord(b.from), to = coord(b.to);
  let leg: Any;
  try {
    const j = await getJson(f, `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`) as Any;
    leg = j?.code === "Ok" ? j.routes?.[0] : null;
  } catch {
    throw new HttpError(502, "upstream_error");
  }
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
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey" } });
  }
  try {
    if (req.method !== "POST") throw new HttpError(405, "method_not_allowed");
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ") || !(await d.getUserId(auth))) throw new HttpError(401, "unauthorized");
    const rpc = d.rpcFor(auth);
    const quota = await rpc("consume_geo_quota");
    if (quota.error) throw new HttpError(quota.error.message.includes("rate_limited") ? 429 : 500, quota.error.message.includes("rate_limited") ? "rate_limited" : "internal_error");
    if (Number(req.headers.get("content-length") ?? 0) > 2048) throw new HttpError(400, "invalid_input");
    let b: Any;
    try { b = await req.json(); } catch { throw new HttpError(400, "invalid_input"); }
    if (!b || typeof b !== "object") throw new HttpError(400, "invalid_input");
    switch (b.op) {
      case "search": return json(200, await search(d.fetch, b));
      case "reverse": return json(200, await reverse(d.fetch, b));
      case "route": return json(200, await route(d.fetch, rpc, b));
      default: throw new HttpError(400, "invalid_input");
    }
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.code });
    console.error("geo: internal error"); // nunca se reenvía el detalle
    return json(500, { error: "internal_error" });
  }
}
