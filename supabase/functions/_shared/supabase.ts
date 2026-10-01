import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Client service_role : contourne la RLS. À n'utiliser QUE côté Edge Function,
// jamais exposé au navigateur. Le filtrage par tenant doit être fait
// explicitement par l'appelant puisque la RLS est contournée.
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquant");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
