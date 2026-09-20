"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SupplierCartCard from "@/components/SupplierCartCard";
import {
  CheckCheckIcon,
  InboxIcon,
  SearchIcon,
  SyncIcon,
} from "@/components/icons";
import { createClient } from "@/lib/supabase/browser";
import {
  dateLabel,
  formatTND,
  type CartGroupView,
  type CartItemView,
} from "@/lib/data";

export default function PanierView({ groups }: { groups: CartGroupView[] }) {
  const supabase = createClient();
  const [state, setState] = useState<CartGroupView[]>(groups);

  const allItems = useMemo(
    () => state.flatMap((g) => g.items),
    [state],
  );
  const orderedIds = useMemo(
    () =>
      new Set(
        allItems.filter((i) => i.status === "ordered").map((i) => i.id),
      ),
    [allItems],
  );
  const orderedCount = orderedIds.size;
  const allDone = allItems.length > 0 && orderedCount === allItems.length;

  const total = useMemo(
    () => allItems.reduce((acc, i) => acc + (i.prixMillimes ?? 0), 0),
    [allItems],
  );

  const toggle = async (item: CartItemView) => {
    const next =
      item.status === "ordered" ? ("pending" as const) : ("ordered" as const);
    await supabase
      .from("tracking_cart_items")
      .update({
        status: next,
        ordered_at: next === "ordered" ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    setState((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((i) =>
          i.id === item.id
            ? { ...i, status: next, meta: metaLabel(i, next) }
            : i,
        ),
      })),
    );
  };

  const markAll = async () => {
    const target: "ordered" | "pending" = allDone ? "pending" : "ordered";
    const ids = allItems.filter((i) => i.status !== target).map((i) => i.id);
    if (ids.length === 0) return;
    const now = target === "ordered" ? new Date().toISOString() : null;
    await supabase
      .from("tracking_cart_items")
      .update({ status: target, ordered_at: now })
      .in("id", ids);
    setState((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((i) =>
          ids.includes(i.id) ? { ...i, status: target, meta: metaLabel(i, target) } : i,
        ),
      })),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border-strong bg-surface-0 px-3 py-1.5 text-label-sm text-on-surface-variant">
          <SyncIcon size={15} />
          Synchronisation Multi-Grossistes active
        </span>
        <h1 className="text-headline-xl-mobile text-navy md:text-headline-xl">
          📦 {allItems.length} article{allItems.length > 1 ? "s" : ""} en attente
          chez {state.length} grossiste{state.length > 1 ? "s" : ""}
        </h1>
        <p className="max-w-2xl text-body-md text-on-surface-variant">
          Ces articles ont été préparés dans vos paniers distributeurs. Cliquez
          sur « Aller finaliser » pour confirmer l&apos;achat chez chaque grossiste,
          puis cochez-les ici au comptoir pour actualiser votre stock restant.
        </p>
      </div>

      <section className="card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex flex-col gap-2">
          <span className="text-label-md text-slate">Total estimé à régler</span>
          <span className="tnum text-headline-lg text-navy">
            {formatTND(total)}
          </span>
          <span className="text-label-sm text-slate">
            TVA & remises pro incluses
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {allItems.length > 0 ? (
            <>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-label-md text-on-surface-variant">
                  <span>
                    {orderedCount}/{allItems.length} Traité{allItems.length > 1 ? "s" : ""}
                  </span>
                  <span>{allItems.length - orderedCount} restant{allItems.length - orderedCount > 1 ? "s" : ""}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-chalk">
                  <div
                    className="h-full rounded-full bg-stock-in-text transition-all"
                    style={{
                      width: `${(orderedCount / allItems.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => void markAll()}
                className={`btn ${allDone ? "btn-outline" : "btn-primary"}`}
              >
                <CheckCheckIcon size={18} />
                {allDone ? "Tout marquer en attente" : "Tout marquer commandé"}
              </button>
            </>
          ) : null}
        </div>
      </section>

      {allItems.length === 0 ? (
        <section className="card flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-chalk text-slate">
            <InboxIcon size={28} />
          </span>
          <h2 className="text-headline-md text-navy">
            Aucun article en attente
          </h2>
          <p className="max-w-md text-body-md text-on-surface-variant">
            Vos articles suivis apparaîtront ici, regroupés par fournisseur,
            dès que vous lancerez une recherche et commanderez une pièce.
          </p>
          <Link href="/recherche" className="btn btn-secondary">
            <SearchIcon size={18} />
            Rechercher une pièce
          </Link>
        </section>
      ) : allDone ? (
        <section className="card flex items-start gap-3 border-stock-in-border bg-stock-in-bg p-4">
          <CheckCheckIcon size={22} className="mt-0.5 shrink-0 text-stock-in-text" />
          <div className="flex flex-col gap-1">
            <h2 className="text-headline-sm text-stock-in-text">
              Tous vos paniers sont commandés !
            </h2>
            <p className="text-body-md text-stock-in-text">
              Votre tableau de bord est à jour. Vos réceptions pièces arriveront
              selon les tournées habituelles des grossistes.
            </p>
            <Link href="/recherche" className="btn btn-secondary mt-2 self-start">
              <SearchIcon size={18} />
              Rechercher de nouvelles références
            </Link>
          </div>
        </section>
      ) : (
        <p className="flex items-center gap-2 text-label-md text-on-surface-variant">
          <InboxIcon size={18} />
          Quand votre liste est vide, vos commandes du jour sont à jour ! Vous
          recevrez les bons de livraison directement par SMS.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {state.map((group) => (
          <SupplierCartCard
            key={group.supplierCode}
            cart={group}
            checked={orderedIds}
            onToggle={(item) => void toggle(item)}
          />
        ))}
      </div>
    </div>
  );
}

function metaLabel(item: CartItemView, status: "pending" | "ordered"): string {
  return (
    (status === "ordered" ? "Commandé • " : "Ajouté ") + dateLabel(item.addedAt)
  );
}