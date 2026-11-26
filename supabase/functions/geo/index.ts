import { createClient } from "npm:@supabase/supabase-js@2";
import { handle } from "./lib.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
// Cliente con el JWT del llamante: RLS/auth.uid() aplican; nunca service_role.
const client = (auth: string) => createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });

Deno.serve((req) =>
  handle(req, {
    fetch,
    getUserId: async (auth) => {
      const { data, error } = await client(auth).auth.getUser(auth.slice(7));
      return error ? null : data.user?.id ?? null;
    },
    rpcFor: (auth) => {
      const c = client(auth);
      return async (fn, args) => await c.rpc(fn, args);
    },
  })
);
