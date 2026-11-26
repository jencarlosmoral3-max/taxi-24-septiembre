import { clearCache, handle, type Deps } from "./lib.ts";

const eq = (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

function mk(routes: Record<string, () => Response>, opts: { user?: string | null; quota?: string; slot?: boolean } = {}) {
  clearCache();
  const calls: string[] = [];
  const d: Deps = {
    fetch: ((u: string) => {
      calls.push(String(u));
      const k = Object.keys(routes).find((p) => String(u).includes(p));
      return Promise.resolve(k ? routes[k]() : new Response("x", { status: 500 }));
    }) as typeof fetch,
    getUserId: () => Promise.resolve(opts.user === undefined ? "u1" : opts.user),
    rpcFor: () => (fn, args) => Promise.resolve(
      fn === "consume_geo_quota"
        ? { data: null, error: opts.quota ? { message: opts.quota } : null }
        : fn === "geo_upstream_slot"
        ? { data: opts.slot ?? true, error: null }
        : { data: Math.ceil(((args!.p_distance_m as number) / 1000) * 3) * 100, error: null },
    ),
  };
  return { d, calls };
}
const post = (body: unknown, auth = "Bearer t") =>
  new Request("http://x/geo", { method: "POST", headers: { Authorization: auth }, body: JSON.stringify(body) });
const J = (o: unknown) => new Response(JSON.stringify(o));

const photon = J({ features: [
  { geometry: { coordinates: [-63.18, -17.78] }, properties: { osm_type: "N", osm_id: 1, name: "Plaza 24", street: "Calle Libertad", city: "Santa Cruz" } },
  { geometry: { coordinates: [-68.1, -16.5] }, properties: { osm_type: "N", osm_id: 2, name: "La Paz" } }, // fuera del bbox
] });

Deno.test("search: normaliza Photon y filtra por bbox", async () => {
  const { d, calls } = mk({ "photon.komoot.io/api": () => photon.clone() });
  const r = await handle(post({ op: "search", q: "plaza" }), d);
  eq(r.status, 200);
  eq((await r.json()).places, [{ id: "N1", name: "Plaza 24", address: "Calle Libertad, Santa Cruz", lat: -17.78, lng: -63.18 }]);
  if (!calls[0].includes("lat=-17.7833&lon=-63.1821")) throw new Error("sin sesgo por defecto");
});

Deno.test("search: Photon falla -> 502 genérico, sin Nominatim", async () => {
  const { d, calls } = mk({});
  const r = await handle(post({ op: "search", q: "mercado" }), d);
  eq(r.status, 502);
  eq(await r.json(), { error: "upstream_error" });
  eq(calls.length, 1);
  if (calls[0].includes("nominatim") || !calls[0].includes("bbox=-63.4,-18.05,-62.95,-17.55")) throw new Error("bbox/no nominatim");
});

Deno.test("search: cache evita segunda llamada", async () => {
  const { d, calls } = mk({ "photon.komoot.io/api": () => photon.clone() });
  await handle(post({ op: "search", q: "Plaza" }), d);
  await handle(post({ op: "search", q: " plaza " }), d);
  eq(calls.length, 1);
});

Deno.test("validación de entradas", async () => {
  const { d } = mk({});
  for (const b of [
    { op: "search", q: "ab" }, { op: "search", q: "x".repeat(101) }, { op: "search", q: "plaza", lat: 0, lng: 0 },
    { op: "reverse", lat: "a", lng: -63 }, { op: "reverse", lat: -17.7, lng: null },
    { op: "route", from: { lat: -17.7, lng: -63.1 }, to: { lat: 40, lng: -63 } }, { op: "nope" },
  ]) eq((await handle(post(b), d)).status, 400);
});

Deno.test("auth: sin token, anon sola y método", async () => {
  eq((await handle(post({ op: "search", q: "plaza" }, ""), mk({}).d)).status, 401);
  eq((await handle(post({ op: "search", q: "plaza" }), mk({}, { user: null }).d)).status, 401);
  eq((await handle(new Request("http://x", { method: "GET" }), mk({}).d)).status, 405);
});

Deno.test("cuota agotada -> 429 antes de llamar al upstream", async () => {
  const { d, calls } = mk({}, { quota: "rate_limited" });
  const r = await handle(post({ op: "search", q: "plaza" }), d);
  eq(r.status, 429);
  eq(calls.length, 0);
});

Deno.test("reverse: Photon y fallback", async () => {
  const a = mk({ "photon.komoot.io/reverse": () => photon.clone() });
  eq(await (await handle(post({ op: "reverse", lat: -17.78, lng: -63.18 }), a.d)).json(), { name: "Plaza 24", address: "Calle Libertad, Santa Cruz" });
  const b = mk({ "nominatim.openstreetmap.org/reverse": () => J({ display_name: "Av. Cañoto, Santa Cruz", name: "" }) });
  eq(await (await handle(post({ op: "reverse", lat: -17.78, lng: -63.18 }), b.d)).json(), { name: "Av. Cañoto", address: "Av. Cañoto, Santa Cruz" });
  const c = mk({ "nominatim.openstreetmap.org/reverse": () => J({ display_name: "X" }) }, { slot: false });
  eq((await handle(post({ op: "reverse", lat: -17.78, lng: -63.18 }), c.d)).status, 502); // sin slot no se llama a Nominatim
  eq(c.calls.some((u) => u.includes("nominatim")), false);
});

Deno.test("route: OSRM + tarifa del RPC", async () => {
  const { d, calls } = mk({ "router.project-osrm.org": () => J({ code: "Ok", routes: [{ distance: 5040.4, duration: 601.2 }] }) });
  const r = await handle(post({ op: "route", from: { lat: -17.78, lng: -63.18 }, to: { lat: -17.8, lng: -63.2 } }), d);
  eq(await r.json(), { distance_m: 5040, duration_s: 601, suggested_fare_cents: 1600 });
  if (!calls[0].includes("-63.18,-17.78;-63.2,-17.8")) throw new Error("orden lng,lat");
});

Deno.test("route: OSRM sin ruta -> 502", async () => {
  const { d } = mk({ "router.project-osrm.org": () => J({ code: "NoRoute" }) });
  eq((await handle(post({ op: "route", from: { lat: -17.78, lng: -63.18 }, to: { lat: -17.8, lng: -63.2 } }), d)).status, 502);
});

Deno.test("route: sin slot OSRM -> 503 busy; cuerpo > 2048 -> 400", async () => {
  const { d, calls } = mk({}, { slot: false });
  const r = await handle(post({ op: "route", from: { lat: -17.78, lng: -63.18 }, to: { lat: -17.8, lng: -63.2 } }), d);
  eq(r.status, 503);
  eq(await r.json(), { error: "busy" });
  eq(calls.length, 0);
  eq((await handle(post({ op: "search", q: "a".repeat(3000) }), mk({}).d)).status, 400);
});
