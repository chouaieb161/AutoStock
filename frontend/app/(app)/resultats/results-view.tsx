"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ResultRow from "@/components/ResultRow";
import {
  AlertTriangleIcon,
  ArrowBackIcon,
  BadgeCheckIcon,
  CloudOffIcon,
  InboxIcon,
  SearchIcon,
  SortIcon,
} from "@/components/icons";
import type { SupplierReference } from "@/lib/data";
import type {
  SearchPart,
  SearchPartsResponse,
  SearchSupplierReport,
} from "@/lib/search";

export default function ResultsView({
  suppliers,
  payload,
  error,
}: {
  suppliers: SupplierReference[];
  payload: SearchPartsResponse | null;
  error: string | null;
}) {
  const searchParams = useSearchParams();
  const ref = (searchParams.get("ref") ?? "").trim();
  const marque = (searchParams.get("marque") ?? "").trim();
  const designation = (searchParams.get("designation") ?? "").trim();
  const starts = searchParams.get("prefix") === "1";

  const criteria: string[] = [ref];
  if (starts) criteria.push("commence par");
  if (designation) criteria.push(`désignation « ${designation} »`);
  const criteriaLabel = criteria.join(" • ");

  const supplierByName = new Map(
    suppliers.map((s) => [s.name.toUpperCase(), s]),
  );

  const reports: SearchSupplierReport[] = payload?.suppliers ?? [];
  const parts: SearchPart[] = payload?.results ?? [];
  const responded = parts.filter(
    (p) => p.disponibilite_app !== "indisponible",
  ).length;
  const failed = reports.filter((r) => r.status !== "ok");

  if (!ref) {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-chalk text-slate">
          <SearchIcon size={28} />
        </span>
        <h1 className="text-headline-lg text-navy">
          Aucune référence à comparer
        </h1>
        <p className="max-w-md text-body-md text-on-surface-variant">
          Lancez une recherche depuis le comparateur pour interroger vos
          fournisseurs en temps réel.
        </p>
        <Link href="/recherche" className="btn btn-secondary">
          Rechercher une pièce
        </Link>
      </div>
    );
  }

  const title = parts[0]?.designation || `Référence ${ref}`;
  const subtitle = marque ? `${criteriaLabel} • ${marque}` : criteriaLabel;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-label-sm text-slate">
          <SearchIcon size={16} />
          Recherche référence constructeur
        </span>
        <h1 className="text-headline-xl-mobile text-navy md:text-headline-xl">
          {title}
        </h1>
        <p className="text-code-oem uppercase text-on-surface-variant">
          {subtitle}
        </p>
        <Link
          href="/recherche"
          className="btn btn-ghost -ml-2 w-fit text-primary"
        >
          <ArrowBackIcon size={18} />
          Modifier la recherche
        </Link>
      </header>

      <div className="flex flex-col gap-2">
        {error ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-stock-rupture-border bg-stock-rupture-bg px-3 py-1.5 text-label-md text-stock-rupture-text">
            <AlertTriangleIcon size={15} />
            {error}
          </span>
        ) : responded > 0 ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-stock-in-border bg-stock-in-bg px-3 py-1.5 text-label-sm text-stock-in-text">
            <BadgeCheckIcon size={15} />
            {responded} offre{responded > 1 ? "s" : ""} comparée
            {responded > 1 ? "s" : ""} chez vos fournisseurs
          </span>
        ) : null}
        <span className="inline-flex w-fit items-center gap-2 text-label-md text-on-surface-variant">
          <SortIcon size={16} />
          Trié du prix le moins cher au plus cher
        </span>
      </div>

      {failed.length > 0 ? (
        <section className="card flex flex-col gap-2 p-4">
          <h2 className="text-headline-sm text-navy">
            Fournisseurs indisponibles
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Les autres fournisseurs ont bien été interrogés : les résultats
            ci-dessous restent complets.
          </p>
          <ul className="flex flex-col gap-1.5">
            {failed.map((r) => (
              <li
                key={r.code}
                className="flex items-center gap-2 text-label-md text-on-surface-variant"
              >
                <CloudOffIcon size={16} className="shrink-0 text-slate" />
                <span className="font-semibold text-navy">{r.name}</span>
                <span>
                  {r.status === "timeout"
                    ? "— délai dépassé"
                    : r.status === "not-configured"
                      ? "— non connecté"
                      : "— erreur de connexion"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {parts.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-chalk text-slate">
            <InboxIcon size={28} />
          </span>
          <h2 className="text-headline-lg text-navy">Aucun résultat</h2>
          <p className="max-w-md text-body-md text-on-surface-variant">
            Aucun de vos grossistes connectés ne propose
            {starts ? " une référence commençant par " : " la référence "}
            «&nbsp;{ref}&nbsp;»
            {designation ? (
              <> avec la désignation «&nbsp;{designation}&nbsp; »</>
            ) : null}
            . Vérifiez la saisie ou ajoutez un fournisseur.
          </p>
          <Link href="/fournisseurs" className="btn btn-outline">
            Gérer mes fournisseurs
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {parts.map((part, index) => (
            <ResultRow
              key={`${part.fournisseur}-${part.reference}-${index}`}
              part={part}
              isBestOffer={index === 0}
              supplier={supplierByName.get(part.fournisseur.toUpperCase())}
            />
          ))}

          <p className="flex items-center justify-center gap-2 text-label-sm text-slate">
            <InboxIcon size={16} />
            Le bouton &laquo;&nbsp;Commander&nbsp;&raquo; ouvre la fiche produit
            chez le fournisseur. Aucune commande n&apos;est envoyée
            automatiquement.
          </p>
        </div>
      )}
    </div>
  );
}

