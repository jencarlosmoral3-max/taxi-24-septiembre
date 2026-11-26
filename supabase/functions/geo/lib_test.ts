import { clearCache, handle, type Deps } from "./lib.ts";

const eq = (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

const KEY = "SECRETKEY123";
function mk(routes: Record<string, () => Response>, opts: { user?: string | null; quota?: string; credit?: string; key?: string; throwFetch?: boolean | Error } = {}) {
  clearCache();
  const calls: string[] = [];
  const rpcs: string[] = [];
  const d: Deps = {
    fetch: ((u: string) => {
      calls.push(String(u));
      // Como Deno: el mensaje del error de red incluye la URL (y por tanto la apiKey).
      if (opts.throwFetch) return Promise.reject(opts.throwFetch instanceof Error ? opts.throwFetch : new TypeError(`error sending request for url (${u})`));
      const k = Object.keys(routes).find((p) => String(u).includes(p));
      return Promise.resolve(k ? routes[k]() : new Response("x", { status: 500 }));
    }) as typeof fetch,
    geoapifyKey: opts.key ?? KEY,
    getUserId: () => Promise.resolve(opts.user === undefined ? "u1" : opts.user),
    rpcFor: () => (fn, args) => {
      rpcs.push(fn);
      return Promise.resolve(
      fn === "consume_geo_quota"
        ? { data: null, error: opts.quota ? { message: opts.quota } : null }
        : fn === "consume_geo_upstream_credit"
        ? { data: null, error: opts.credit ? { message: opts.credit } : null }
        : { data: Math.ceil(((args!.p_distance_m as number) / 1000) * 3) * 100, error: null },
    ); },
  };
  return { d, calls, rpcs };
}
const post = (body: unknown, auth = "Bearer t") =>
  new Request("http://x/geo", { method: "POST", headers: { Authorization: auth }, body: JSON.stringify(body) });
const J = (o: unknown) => new Response(JSON.stringify(o));


const ac = J({ results: [
  { place_id: "p1", name: "Plaza 24", street: "Calle Libertad", suburb: "Centro", city: "Santa Cruz de la Sierra", formatted: "Plaza 24, Santa Cruz", lat: -17.78, lon: -63.18 },
  { place_id: "p2", name: "La Paz", lat: -16.5, lon: -68.1 }, // fuera del bbox
] });
const A = "geocode/autocomplete", R = "geocode/reverse", O = "v1/routing";
const FROM = { lat: -17.78, lng: -63.18 }, TO = { lat: -17.8, lng: -63.2 };

Deno.test("search: mapea Geoapify y filtra por bbox", async () => {
  const { d, calls } = mk({ [A]: () => ac.clone() });
  const r = await handle(post({ op: "search", q: "plaza" }), d);
  eq(r.status, 200);
  eq((await r.json()).places, [{ id: "p1", name: "Plaza 24", address: "Calle Libertad, Centro, Santa Cruz de la Sierra", lat: -17.78, lng: -63.18 }]);
  for (const p of ["bias=proximity:-63.18,-17.78", "filter=rect:-63.4,-18.05,-62.95,-17.55", "lang=es", "format=json", `apiKey=${KEY}`]) {
    if (!calls[0].includes(p)) throw new Error(`falta ${p}`);
  }
});

Deno.test("search: nombre cae a calle+número o a formatted", async () => {
  const { d } = mk({ [A]: () => J({ results: [
    { place_id: "a", street: "Av. Cañoto", housenumber: "12", city: "Santa Cruz", lat: -17.78, lon: -63.18 },
    { place_id: "b", formatted: "Mercado Los Pozos, Santa Cruz", lat: -17.77, lon: -63.17 },
  ] }) });
  const p = (await (await handle(post({ op: "search", q: "x y z" }), d)).json()).places;
  eq(p.map((x: { name: string }) => x.name), ["Av. Cañoto 12", "Mercado Los Pozos"]);
});

Deno.test("search: upstream no OK -> 502 genérico", async () => {
  const { d, calls } = mk({});
  const r = await handle(post({ op: "search", q: "mercado" }), d);
  eq(r.status, 502);
  eq(await r.json(), { error: "upstream_error" });
  eq(calls.length, 1);
});

Deno.test("search: cache evita segunda llamada", async () => {
  const { d, calls } = mk({ [A]: () => ac.clone() });
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

Deno.test("cuerpo inválido u op desconocida -> 400 sin cobrar cuota", async () => {
  const { d, rpcs } = mk({});
  eq((await handle(post({ op: "nope" }), d)).status, 400);
  eq((await handle(new Request("http://x/geo", { method: "POST", headers: { Authorization: "Bearer t" }, body: "{" }), d)).status, 400);
  eq(rpcs, []);
});

Deno.test("cache hit no cobra crédito upstream; el miss sí", async () => {
  const { d, rpcs } = mk({ [A]: () => ac.clone() });
  await handle(post({ op: "search", q: "Plaza" }), d);
  await handle(post({ op: "search", q: "plaza" }), d);
  eq(rpcs.filter((x) => x === "consume_geo_upstream_credit").length, 1);
  eq(rpcs.filter((x) => x === "consume_geo_quota").length, 2);
});

Deno.test("crédito upstream agotado -> 429 sin llamar a Geoapify", async () => {
  for (const b of [{ op: "search", q: "plaza" }, { op: "reverse", lat: -17.78, lng: -63.18 }, { op: "route", from: FROM, to: TO }]) {
    const { d, calls } = mk({}, { credit: "rate_limited" });
    const r = await handle(post(b), d);
    eq(r.status, 429);
    eq(await r.json(), { error: "rate_limited" });
    eq(calls.length, 0);
  }
  eq((await handle(post({ op: "search", q: "plaza" }), mk({}, { credit: "boom" }).d)).status, 500);
});

Deno.test("search: bias se redondea a 2 decimales en caché y upstream", async () => {
  const { d, calls } = mk({ [A]: () => ac.clone() });
  await handle(post({ op: "search", q: "plaza", lat: -17.78123, lng: -63.18456 }), d);
  await handle(post({ op: "search", q: "plaza", lat: -17.78399, lng: -63.18399 }), d);
  eq(calls.length, 1);
  if (!calls[0].includes("bias=proximity:-63.18,-17.78")) throw new Error("bias");
});

Deno.test("resultado con lat/lon null o string se descarta", async () => {
  const { d } = mk({ [A]: () => J({ results: [
    { place_id: "a", name: "Nulo", lat: null, lon: -63.18 },
    { place_id: "b", name: "Vacio", lat: "", lon: "" },
    { place_id: "c", name: "Ok", lat: -17.78, lon: -63.18 },
  ] }) });
  const p = (await (await handle(post({ op: "search", q: "plaza" }), d)).json()).places;
  eq(p.map((x: { id: string }) => x.id), ["c"]);
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

Deno.test("reverse: mapea Geoapify; sin resultados o upstream caído -> 502", async () => {
  const a = mk({ [R]: () => J({ results: [{ place_id: "p1", name: "Plaza 24", street: "Calle Libertad", city: "Santa Cruz", lat: -17.78, lon: -63.18 }] }) });
  eq(await (await handle(post({ op: "reverse", lat: -17.78, lng: -63.18 }), a.d)).json(), { name: "Plaza 24", address: "Calle Libertad, Santa Cruz" });
  if (!a.calls[0].includes("lat=-17.78&lon=-63.18")) throw new Error("lat/lon");
  eq((await handle(post({ op: "reverse", lat: -17.78, lng: -63.18 }), mk({ [R]: () => J({ results: [] }) }).d)).status, 502);
  eq((await handle(post({ op: "reverse", lat: -17.78, lng: -63.18 }), mk({}).d)).status, 502);
});

Deno.test("route: Geoapify + tarifa del RPC", async () => {
  const { d, calls } = mk({ [O]: () => J({ results: [{ distance: 5040.4, time: 601.2 }] }) });
  const r = await handle(post({ op: "route", from: FROM, to: TO }), d);
  eq(await r.json(), { distance_m: 5040, duration_s: 601, suggested_fare_cents: 1600 });
  if (!calls[0].includes("waypoints=-17.78,-63.18|-17.8,-63.2") || !calls[0].includes("mode=drive")) throw new Error("orden lat,lng");
});

Deno.test("route: sin ruta o upstream caído -> 502", async () => {
  eq((await handle(post({ op: "route", from: FROM, to: TO }), mk({ [O]: () => J({ results: [] }) }).d)).status, 502);
  eq((await handle(post({ op: "route", from: FROM, to: TO }), mk({}).d)).status, 502);
});

Deno.test("sin GEOAPIFY_API_KEY -> 500 internal_error sin llamar al upstream", async () => {
  const { d, calls } = mk({ [A]: () => ac.clone() }, { key: "" });
  const r = await handle(post({ op: "search", q: "plaza" }), d);
  eq(r.status, 500);
  eq(await r.json(), { error: "internal_error" });
  eq(calls.length, 0);
});

Deno.test("la apiKey nunca aparece en logs ni en la respuesta", async () => {
  const logs: string[] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); };
  try {
    const bodies: string[] = [];
    const badJson = { "geocode": () => new Response(`{"x":"${KEY}"`), "v1/routing": () => new Response(`{"x":"${KEY}"`) };
    const abort = new DOMException(`signal timed out for ${KEY}`, "TimeoutError");
    for (const [routes, opts] of [[{}, {}], [{}, { throwFetch: true }], [badJson, {}], [{}, { throwFetch: abort }]] as const) {
      for (const b of [{ op: "search", q: "mercado" }, { op: "reverse", lat: -17.78, lng: -63.18 }, { op: "route", from: FROM, to: TO }]) {
        bodies.push(await (await handle(post(b), mk(routes, opts).d)).text());
      }
    }
    if (logs.length < 12) throw new Error("se esperaban logs de upstream");
    if ([...logs, ...bodies].some((t) => t.includes(KEY))) throw new Error("apiKey filtrada");
  } finally { console.error = orig; }
});

Deno.test("cuerpo > 2048 -> 400", async () => {
  eq((await handle(post({ op: "search", q: "a".repeat(3000) }), mk({}).d)).status, 400);
});

Deno.test("route: > 150 km en línea recta -> 422 sin llamar al upstream", async () => {
  const { d, calls } = mk({ [O]: () => J({ results: [{ distance: 1, time: 1 }] }) });
  const r = await handle(post({ op: "route", from: FROM, to: { lat: -19, lng: -63.18 } }), d); // ~135 km al sur: pasa
  eq(r.status, 200);
  const far = await handle(post({ op: "route", from: FROM, to: { lat: -19.5, lng: -63.18 } }), d); // ~190 km
  eq(far.status, 422);
  eq(await far.json(), { error: "invalid_route" });
  eq(calls.length, 1);
});

Deno.test("route: resultado vacío no se cachea", async () => {
  const { d, calls } = mk({ [O]: () => J({ results: [] }) });
  eq((await handle(post({ op: "route", from: FROM, to: TO }), d)).status, 502);
  eq((await handle(post({ op: "route", from: FROM, to: TO }), d)).status, 502);
  eq(calls.length, 2);
});
