import { formatTND, type StockStatus } from "@/lib/data";
import type { SearchPart } from "@/lib/search";
import StockBadge from "./StockBadge";
import SupplierAvatar from "./SupplierAvatar";
import { BadgeCheckIcon, ExternalLinkIcon } from "./icons";

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
}: {
  part: SearchPart;
  supplier?: { name: string; city: string | null; baseUrl: string | null } | null;
  isBestOffer: boolean;
}) {
  const available = part.disponibilite_app !== "indisponible";
  const name = supplier?.name ?? part.fournisseur;
  const location = supplier?.city ?? "";
  // Le lien profond renvoyé par le connecteur est prioritaire : il pointe
  // vers la fiche produit. À défaut, on retombe sur la home du grossiste.
  const href = part.lien_produit || supplier?.baseUrl || "#";

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

        <div className="flex flex-row items-end justify-between gap-4 border-t border-border-card pt-3 sm:w-56 sm:flex-col sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="flex flex-col">
            {part.price_millimes !== null ? (
              <span className="tnum text-price-display text-navy">
                {formatTND(part.price_millimes)}
              </span>
            ) : (
              <span className="tnum text-price-display text-slate">-- TND</span>
            )}
            <span className="text-label-sm text-slate">
              TTC <span className="lowercase">par pièce</span>
            </span>
          </div>
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
    </article>
  );
}
