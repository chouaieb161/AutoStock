// Edge Function: connect-supplier
// Enregistre / teste les identifiants B2B d'un grossiste pour le tenant
// appelant. Le mot de passe est validé par un login live puis stocké
// UNIQUEMENT dans Supabase Vault (jamais dans tenant_suppliers, jamais loggé).
//
// Entrée  : { supplier_id: uuid, identifier: string, password: string }
// Sortie  : { ok: boolean, status: 'connected'|'error', error?: string }

import { caller } from "../_shared/auth.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { json, preflight } from "../_shared/http.ts";
import { connectorFor } from "../_shared/connectors/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const auth = await caller(req);
  if (!auth) return json({ error: "UNAUTHENTICATED" }, 401);

  let payload: { supplier_id?: string; identifier?: string; password?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const supplierId = (payload.supplier_id ?? "").trim();
  const identifier = (payload.identifier ?? "").trim();
  const password = payload.password ?? "";

  if (!supplierId || !identifier || !password) {
    return json({ error: "MISSING_FIELDS" }, 400);
  }

  const admin = serviceClient();

  const { data: supplier, error: supplierError } = await admin
    .from("suppliers")
    .select("id, code, name, base_url, is_active")
    .eq("id", supplierId)
    .maybeSingle();

  if (supplierError) return json({ error: "SUPPLIER_LOOKUP_FAILED" }, 500);
  if (!supplier || !supplier.is_active) {
    return json({ error: "SUPPLIER_NOT_FOUND" }, 404);
  }

  const connector = connectorFor(supplier.code, supplier.base_url);
  if (!connector) {
    return json({ error: "CONNECTOR_UNSUPPORTED" }, 400);
  }

  let test: { ok: boolean; error?: string };
  try {
    test = await connector.testConnection({ login: identifier, password });
  } catch (error) {
    test = { ok: false, error: (error as Error).message };
  }

  if (!test.ok) {
    // On mémorise l'échec (statut) mais on n'écrit AUCUN secret.
    await admin.from("tenant_suppliers").upsert(
      {
        tenant_id: auth.tenantId,
        supplier_id: supplier.id,
        identifier,
        status: "error",
        last_check_at: new Date().toISOString(),
        last_error: (test.error ?? "Échec de connexion").slice(0, 500),
      },
      { onConflict: "tenant_id,supplier_id" },
    );
    return json({ ok: false, status: "error", error: "CONNEXION_REFUSEE" }, 200);
  }

  const { data: link, error: upsertError } = await admin
    .from("tenant_suppliers")
    .upsert(
      {
        tenant_id: auth.tenantId,
        supplier_id: supplier.id,
        identifier,
        status: "connected",
        last_check_at: new Date().toISOString(),
        last_error: null,
      },
      { onConflict: "tenant_id,supplier_id" },
    )
    .select("id")
    .single();

  if (upsertError || !link) {
    return json({ error: "SAVE_FAILED" }, 500);
  }

  const { error: secretError } = await admin.rpc("set_tenant_supplier_secret", {
    p_tenant_supplier_id: link.id,
    p_secret: password,
    p_name: `${supplier.code.toLowerCase()}_${auth.tenantId}`,
  });

  if (secretError) {
    return json({ error: "SECRET_STORE_FAILED" }, 500);
  }

  return json({
    ok: true,
    status: "connected",
    supplier: { id: supplier.id, code: supplier.code, name: supplier.name },
  });
});
