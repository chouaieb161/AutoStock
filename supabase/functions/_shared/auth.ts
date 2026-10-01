import { createClient } from "jsr:@supabase/supabase-js@2";
import { serviceClient } from "./supabase.ts";

export interface Caller {
  userId: string;
  tenantId: string;
}

// Vérifie le JWT de l'appelant et résout son tenant.
// `verify_jwt = true` garantit déjà un JWT valide ; on récupère en plus le
// profil applicatif pour connaître le tenant de façon fiable.
export async function caller(req: Request): Promise<Caller | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return null;

  const admin = serviceClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile?.tenant_id) return null;

  return { userId: data.user.id, tenantId: profile.tenant_id };
}
