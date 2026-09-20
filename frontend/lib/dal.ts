import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dateLabel } from "@/lib/data";
import type {
  CartGroupView,
  CartItemView,
  RecentSearchView,
  TenantSupplierView,
} from "@/lib/data";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});

export const verifySession = cache(async () => {
  const user = await getSession();
  if (!user) redirect("/connexion");
  return user;
});

export interface ProfileSummary {
  initials: string;
  shopName: string | null;
  shopCity: string | null;
  roleLabel: string;
  email: string | null;
}

export const getProfile = cache(async () => {
  const user = await getSession();
  if (!user) return null;

  const supabase = await createClient();
  let { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

if (!profile) {
    // Un utilisateur authentifié sans profil ni tenant (ex. venu via le lien
    // de confirmation email, hors formulaire) est provisionné à la volée.
    // Le RPC est idempotent par design.
    const { data: tenantId, error } = await supabase.rpc(
      "provision_tenant_from_metadata",
    );
    if (!error && tenantId) {
      // Le re-SELECT immédiat peut ne pas voir la ligne fraîchement insérée
      // (latence de réplication PostgREST, constatée au premier rendu).
      // On construit le résumé directement depuis les métadonnées du JWT :
      // ce sont exactement les données que le RPC vient de provisionner.
      const meta = (user.user_metadata ?? {}) as {
        shop_name?: string;
        shop_city?: string;
      };
      return {
        initials: initialsOf(meta.shop_name ?? user.email ?? "?"),
        shopName: meta.shop_name ?? null,
        shopCity: meta.shop_city ?? null,
        roleLabel: "Gérant du point de vente",
        email: user.email ?? null,
      };
    }
  }
  if (!profile) {
    return {
      initials: initialsOf(user.email ?? "?"),
      shopName: null,
      shopCity: null,
      roleLabel: "Comptoir en attente d'activation",
      email: user.email ?? null,
    };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, city")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  const displayName = profile.full_name ?? user.email ?? "?";
  return {
    initials: initialsOf(displayName),
    shopName: tenant?.name ?? null,
    shopCity: tenant?.city ?? null,
    roleLabel: profile.role === "owner" ? "Gérant du point de vente" : "Personnel du comptoir",
    email: user.email ?? null,
  };
});

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const getSuppliersCatalogue = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("suppliers")
    .select("id, code, name, city, base_url, supports_api")
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    city: s.city,
    baseUrl: s.base_url,
    supportsApi: s.supports_api,
  }));
});

export const getSuppliersView = cache(async (): Promise<TenantSupplierView[]> => {
  const supabase = await createClient();
  const [{ data: catalogue }, { data: links }] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, code, name, city, base_url, supports_api")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("tenant_suppliers")
      .select("supplier_id, identifier, status, last_check_at, last_error")
      .order("created_at"),
  ]);
  const bySupplier = new Map(
    (links ?? []).map((l) => [l.supplier_id, l]),
  );
  return (catalogue ?? []).map((s) => {
    const link = bySupplier.get(s.id);
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      city: s.city,
      baseUrl: s.base_url,
      supportsApi: s.supports_api,
      tenantStatus: (link?.status as "connected" | "blocked" | "error" | null) ?? null,
      identifier: link?.identifier ?? null,
      lastCheckAt: link?.last_check_at ?? null,
      lastError: link?.last_error ?? null,
    };
  });
});

export const getRecentSearches = cache(
  async (limit = 5): Promise<RecentSearchView[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("search_history")
      .select("id, reference, marque, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) => ({
      id: r.id,
      reference: r.reference,
      marque: r.marque,
      createdAt: r.created_at,
    }));
  },
);

export const getConnectedSuppliersCount = cache(async () => {
  const supabase = await createClient();
  const { count } = await supabase
    .from("tenant_suppliers")
    .select("id", { count: "exact", head: true })
    .eq("status", "connected");
  return count ?? 0;
});

export const getCartGroups = cache(async (): Promise<CartGroupView[]> => {
  const supabase = await createClient();
  const [{ data: items }, { data: catalogue }] = await Promise.all([
    supabase
      .from("tracking_cart_items")
      .select(
        "id, reference, marque, designation, prix_millimes, product_url, status, added_at, supplier_id, quantite",
      )
      .neq("status", "received")
      .order("added_at", { ascending: false }),
    supabase.from("suppliers").select("id, code, name, city, base_url"),
  ]);

  const supplierById = new Map(
    (catalogue ?? []).map((s) => [s.id, s]),
  );

  const groups = new Map<string, CartGroupView>();
  for (const item of items ?? []) {
    const sup = supplierById.get(item.supplier_id);
    const entry: CartItemView = {
      id: item.id,
      reference: item.reference,
      marque: item.marque,
      title: item.designation ?? `Pièce ${item.reference}`,
      meta:
        (item.status === "ordered" ? "Commandé • " : "Ajouté ") +
        dateLabel(item.added_at),
      prixMillimes: item.prix_millimes,
      productUrl: item.product_url,
      addedAt: item.added_at,
      quantite: item.quantite,
      status: item.status === "ordered" ? "ordered" : "pending",
      supplierCode: sup?.code ?? item.supplier_id,
      supplierName: sup?.name ?? "Fournisseur",
      supplierCity: sup?.city ?? null,
      baseUrl: sup?.base_url ?? null,
    };
    const key = item.supplier_id;
    const group = groups.get(key);
    if (group) group.items.push(entry);
    else
      groups.set(key, {
        supplierCode: entry.supplierCode,
        supplierName: entry.supplierName,
        supplierCity: entry.supplierCity,
        baseUrl: entry.baseUrl,
        items: [entry],
      });
  }
  return [...groups.values()];
});