// Edge Function: search-parts
// Orchestrateur de recherche : interroge en parallèle les connecteurs des
// grossistes configurés et actifs du tenant appelant, agrège les résultats et
// les trie par prix croissant. Un fournisseur en erreur n'empêche jamais les
// autres de répondre.
//
// Entrée : { reference?: string, marque?: string, designation?: string, reference_mode?: "exact"|"starts" }
// Sortie : { reference, designation, reference_mode, results: NormalizedPart[], suppliers: SupplierStatus[] }

import { caller } from "../_shared/auth.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { json, preflight } from "../_shared/http.ts";
import { connectorFor } from "../_shared/connectors/index.ts";
import type {
  NormalizedPart,
  SearchQuery,
} from "../_shared/connectors/types.ts";

const SUPPLIER_TIMEOUT_MS = 25_000;

const APP_AVAILABILITY: Record<string, string> = {
  disponible: "en-stock",
  en_arrivage: "sur-commande",
  indisponible: "rupture",
};

interface SupplierStatus {
  code: string;
  name: string;
  status: "ok" | "error" | "timeout" | "not-configured";
  count: number;
  error?: string;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: délai dépassé`)), ms)
    ),
  ]);
}

interface LinkRow {
  id: string;
  secret_id: string | null;
  supplier: {
    id: string;
    code: string;
    name: string;
    base_url: string;
    is_active: boolean;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const auth = await caller(req);
  if (!auth) return json({ error: "UNAUTHENTICATED" }, 401);

  let payload: {
    reference?: string;
    marque?: string;
    designation?: string;
    reference_mode?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const reference = (payload.reference ?? "").trim();
  const marque = (payload.marque ?? "").trim();
  const designation = (payload.designation ?? "").trim();
  const referenceMode =
    payload.reference_mode === "starts" ? "starts" : "exact";

  if (!reference && !designation) {
    return json({ error: "REFERENCE_REQUIRED" }, 400);
  }

  const admin = serviceClient();

  const { data: links, error: linksError } = await admin
    .from("tenant_suppliers")
    .select(
      "id, secret_id, supplier:suppliers!inner(id, code, name, base_url, is_active)",
    )
    .eq("tenant_id", auth.tenantId)
    .eq("status", "connected");

  if (linksError) return json({ error: "LOOKUP_FAILED" }, 500);

  const rows = (links ?? []) as unknown as LinkRow[];
  const active = rows.filter((row) => row.supplier?.is_active);

  if (active.length === 0) {
    await admin.from("search_history").insert({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      reference,
      marque: marque || null,
      designation: designation || null,
      reference_mode: referenceMode,
      results_count: 0,
      suppliers_ok: 0,
      suppliers_error: 0,
    });
    return json({ reference, designation, reference_mode: referenceMode, results: [], suppliers: [] });
  }

  const settled = await Promise.all(
    active.map(async (row): Promise<{ status: SupplierStatus; parts: NormalizedPart[] }> => {
      const supplierCode = row.supplier.code;
      const supplierName = row.supplier.name;
      const base: SupplierStatus = {
        code: supplierCode,
        name: supplierName,
        status: "error",
        count: 0,
      };

      try {
        if (!row.secret_id) {
          return { status: { ...base, status: "not-configured" }, parts: [] };
        }

        const { data: password, error: secretError } = await admin.rpc(
          "get_tenant_supplier_secret",
          { p_secret_id: row.secret_id },
        );
        if (secretError || !password) {
          return { status: { ...base, error: "secret indisponible" }, parts: [] };
        }

        const { data: link, error: linkError } = await admin
          .from("tenant_suppliers")
          .select("identifier")
          .eq("id", row.id)
          .single();
        if (linkError || !link?.identifier) {
          return { status: { ...base, error: "identifiant manquant" }, parts: [] };
        }

        const connector = connectorFor(supplierCode, row.supplier.base_url);
        if (!connector) {
          return { status: { ...base, status: "not-configured" }, parts: [] };
        }

        const query: SearchQuery = {
          reference,
          designation: designation || undefined,
          referenceMode,
        };
        const parts = await withTimeout(
          connector.search(
            { login: link.identifier, password },
            query,
          ),
          SUPPLIER_TIMEOUT_MS,
          supplierCode,
        );

        await admin
          .from("tenant_suppliers")
          .update({ last_check_at: new Date().toISOString(), last_error: null })
          .eq("id", row.id)
          .eq("tenant_id", auth.tenantId);

        return {
          status: { ...base, status: "ok", count: parts.length },
          parts,
        };
      } catch (error) {
        const message = (error as Error).message;
        const timeout = /délai dépassé/.test(message);
        await admin
          .from("tenant_suppliers")
          .update({
            last_check_at: new Date().toISOString(),
            last_error: message.slice(0, 500),
          })
          .eq("id", row.id)
          .eq("tenant_id", auth.tenantId);
        return {
          status: {
            ...base,
            status: timeout ? "timeout" : "error",
            error: message,
          },
          parts: [],
        };
      }
    }),
  );

  const suppliers = settled.map((s) => s.status);
  const parts = settled.flatMap((s) => s.parts);

  const results = parts
    .map((part) => ({
      ...part,
      disponibilite_app: APP_AVAILABILITY[part.disponibilite] ?? "indisponible",
      price_millimes: part.prix === null ? null : Math.round(part.prix * 1000),
    }))
    .sort((a, b) => {
      if (a.price_millimes === null) return 1;
      if (b.price_millimes === null) return -1;
      return a.price_millimes - b.price_millimes;
    });

  const suppliersOk = suppliers.filter((s) => s.status === "ok").length;

  await admin.from("search_history").insert({
    tenant_id: auth.tenantId,
    user_id: auth.userId,
    reference,
    marque: marque || null,
    designation: designation || null,
    reference_mode: referenceMode,
    results_count: results.length,
    suppliers_ok: suppliersOk,
    suppliers_error: suppliers.length - suppliersOk,
  });

  return json({ reference, designation, reference_mode: referenceMode, results, suppliers });
});
