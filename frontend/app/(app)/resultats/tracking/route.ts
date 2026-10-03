import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/dal";

export const dynamic = "force-dynamic";

const TRACKED_STATUSES_PENDING = "pending";

interface AddPayload {
  supplierId?: string;
  reference?: string;
  designation?: string;
  marque?: string;
  prix_millimes?: number | null;
  lien_produit?: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();
  const tenantId = profile?.tenant_id ?? null;
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "NO_TENANT" },
      { status: 403 },
    );
  }

  let payload: AddPayload;
  try {
    payload = (await request.json()) as AddPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const supplierId = (payload.supplierId ?? "").trim();
  const reference = (payload.reference ?? "").trim();
  if (!supplierId || !reference) {
    return NextResponse.json(
      { ok: false, error: "MISSING_FIELDS" },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("tracking_cart_items")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("supplier_id", supplierId)
    .eq("reference", reference)
    .eq("status", TRACKED_STATUSES_PENDING)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, already: true, id: existing.id });
  }

  const { data, error } = await supabase
    .from("tracking_cart_items")
    .insert({
      tenant_id: tenantId,
      supplier_id: supplierId,
      reference,
      designation: payload.designation ?? null,
      marque: payload.marque ?? null,
      prix_millimes: payload.prix_millimes ?? null,
      devise: "TND",
      quantite: 1,
      product_url: payload.lien_produit ?? null,
      status: TRACKED_STATUSES_PENDING,
      added_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "INSERT_FAILED" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, already: false, id: data.id });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = (searchParams.get("id") ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "MISSING_ID" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("tracking_cart_items")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: "DELETE_FAILED" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}