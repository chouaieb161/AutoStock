"use client";

import { useState } from "react";
import { formatTND, type StockStatus, type SupplierReference } from "@/lib/data";
import type { SearchPart } from "@/lib/search";
import StockBadge from "./StockBadge";
import SupplierAvatar from "./SupplierAvatar";
import {
  AddLinkIcon,
  BadgeCheckIcon,
  CheckIcon,
  ExternalLinkIcon,
  SyncIcon,
} from "./icons";

function availabilityDetail(status: StockStatus): string {
  switch (status) {
    case "en-stock":
      return "Disponible immédiatement";
    case "sur-commande":
      return "Sous commande chez le fournisseur";
    case "rupture":
      return "Rupture de stock";
    default:
      return "Réponse non disponible";
  }
}

export default function ResultRow({
  part,
  supplier,
  isBestOffer,
  trackedId,
}: {
  part: SearchPart;
  supplier?: SupplierReference | null;
  isBestOffer: boolean;
  trackedId?: string;
}) {
  const available = part.disponibilite_app !== "indisponible";
  const canTrack = Boolean(supplier?.id) && available;
  const name = supplier?.name ?? part.fournisseur;
  const location = supplier?.city ?? "";
  // Le lien profond renvoyé par le connecteur est prioritaire : il pointe
  // vers la fiche produit. À défaut, on retombe sur la home du grossiste.
  const href = part.lien_produit || supplier?.baseUrl || "#";

  const [isTracked, setIsTracked] = useState(Boolean(trackedId));
  const [trackId, setTrackId] = useState(trackedId ?? undefined);
  const [busy, setBusy] = useState(false);

  const toggleTracking = async () => {
    if (busy || !canTrack) return;
    setBusy(true);
    try {
      if (isTracked) {
        if (!trackId) return;
        const res = await fetch(
          `/resultats/tracking?id=${encodeURIComponent(trackId)}`,
          { method: "DELETE" },
        );
        const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
        if (body.ok) {
          setIsTracked(false);
          setTrackId(undefined);
        }
      } else {
        const res = await fetch("/resultats/tracking", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            supplierId: supplier?.id,
            reference: part.reference,
            designation: part.designation,
            marque: part.marque,
            prix_millimes: part.price_millimes,
            lien_produit: part.lien_produit || null,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          already?: boolean;
          id?: string;
        };
        if (body.ok) {
          setIsTracked(true);
          setTrackId(body.id);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card relative p-4">
      {isBestOffer ? (
        <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-stock-in-bg px-2.5 py-1 text-label-sm text-stock-in-text">
          <BadgeCheckIcon size={14} />
          Meilleure Offre
        </span>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3 sm:w-56 sm:flex-col sm:gap-2">
          <SupplierAvatar code={name} name={name} />
          <div className="flex flex-col">
            <span className="text-label-md text-navy">
              {name}
              {location ? ` • ${location}` : ""}
            </span>
            <span className="text-label-sm text-slate">
              Réf. {part.reference}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-[4px] bg-surface-chalk px-2 text-label-sm text-on-surface-variant">
              {part.marque || "—"}
            </span>
            {isBestOffer ? (
              <span className="inline-flex items-center gap-1 text-label-sm text-primary">
                <BadgeCheckIcon size={14} />
                Prix le plus bas
              </span>
            ) : null}
          </div>
          <p className="text-body-md text-navy">{part.designation}</p>
          <div className="flex flex-wrap items-center gap-2">
            <StockBadge status={part.disponibilite_app} />
            <span className="text-label-sm text-slate">
              {part.delai || availabilityDetail(part.disponibilite_app)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border-card pt-3 sm:w-56 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="flex flex-col">
            {part.price_millimes !== null ? (
              <span className="tnum text-price-display text-navy">
                {formatTND(part.price_millimes)}
              </span>
            ) : (
              <span className="tnum text-price-display text-slate">-- TND</span>
            )}
            <span className="text-label-sm text-slate">
              HT <span className="lowercase">par pièce</span>
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                void toggleTracking();
              }}
              disabled={!canTrack || busy}
              aria-pressed={isTracked}
              className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-[4px] px-3 text-label-md transition-colors ${
                busy
                  ? "cursor-wait border border-border-card text-slate"
                  : isTracked
                    ? "border border-stock-in-border bg-stock-in-bg text-stock-in-text"
                    : canTrack
                      ? "border border-border-strong text-on-surface-variant hover:bg-surface-0"
                      : "cursor-not-allowed border border-border-card text-slate/40"
              }`}
            >
              {busy ? (
                <SyncIcon size={16} className="animate-spin" />
              ) : isTracked ? (
                <CheckIcon size={16} />
              ) : (
                <AddLinkIcon size={16} />
              )}
              {isTracked
                ? "Au panier de suivi"
                : busy
                  ? "Enregistrement…"
                  : "Ajouter au suivi"}
            </button>

            {available ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Commander
                <ExternalLinkIcon size={18} />
              </a>
            ) : (
              <span className="inline-flex h-12 items-center rounded-[4px] bg-surface-0 px-4 text-label-lg text-slate">
                Épuisé
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}