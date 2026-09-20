import { formatTND, type PartResult } from "@/lib/data";
import type { SupplierReference } from "@/lib/data";
import StockBadge from "./StockBadge";
import SupplierAvatar from "./SupplierAvatar";
import { BadgeCheckIcon, ExternalLinkIcon } from "./icons";

export default function ResultRow({
  result,
  supplier,
}: {
  result: PartResult;
  supplier?: SupplierReference | null;
}) {
  const available =
    result.availability !== "rupture" &&
    result.availability !== "indisponible";
  const name = supplier?.name ?? result.supplierCode;
  const location = supplier?.city ?? "";
  const finalizeUrl = supplier?.baseUrl ?? "#";

  return (
    <article className="card relative p-4">
      {result.isBestOffer ? (
        <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-stock-in-bg px-2.5 py-1 text-label-sm text-stock-in-text">
          <BadgeCheckIcon size={14} />
          Meilleure Offre & En Stock
        </span>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3 sm:w-56 sm:flex-col sm:gap-2">
          <SupplierAvatar code={result.supplierCode} name={name} />
          <div className="flex flex-col">
            <span className="text-label-md text-navy">
              {name}
              {location ? ` • ${location}` : ""}
            </span>
            <span className="text-label-sm text-slate">{result.designation}</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-[4px] bg-surface-chalk px-2 text-label-sm text-on-surface-variant">
              {result.brand}
            </span>
            {result.isVerified ? (
              <span className="inline-flex items-center gap-1 text-label-sm text-primary">
                <BadgeCheckIcon size={14} />
                Vérifié
              </span>
            ) : null}
          </div>
          <p className="text-body-md text-navy">{result.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <StockBadge status={result.availability} />
            <span className="text-label-sm text-slate">
              {result.availabilityDetail}
            </span>
          </div>
        </div>

        <div className="flex flex-row items-end justify-between gap-4 border-t border-border-card pt-3 sm:w-56 sm:flex-col sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="flex flex-col">
            {result.priceMillimes !== null ? (
              <span className="tnum text-price-display text-navy">
                {formatTND(result.priceMillimes)}
              </span>
            ) : (
              <span className="tnum text-price-display text-slate">-- TND</span>
            )}
            <span className="text-label-sm text-slate">
              TTC <span className="lowercase">{result.unit}</span>
            </span>
          </div>
          {available ? (
            <a
              href={finalizeUrl}
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