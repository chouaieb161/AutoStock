"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ResultRow from "@/components/ResultRow";
import {
  ArrowBackIcon,
  BadgeCheckIcon,
  InboxIcon,
  SearchIcon,
  SortIcon,
} from "@/components/icons";
import { results, type SupplierReference } from "@/lib/data";

export default function ResultsView({
  suppliers,
}: {
  suppliers: SupplierReference[];
}) {
  const searchParams = useSearchParams();
  const ref = (searchParams.get("ref") ?? "").trim();
  const marque = (searchParams.get("marque") ?? "").trim();

  const supplierByCode = new Map(
    suppliers.map((s) => [s.code, s]),
  );
  const responded = results.filter(
    (r) => r.availability !== "indisponible",
  ).length;

  if (!ref && !marque) {
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

  const knownTitle =
    ref === "410602192R" || ref.toUpperCase() === "410602192R"
      ? "Plaquettes de frein avant"
      : `Référence ${ref}`;
  const subtitle =
    ref === "410602192R" || ref.toUpperCase() === "410602192R"
      ? "410602192R • Renault Clio 4 / Captur (Essence & dCi)"
      : [ref, marque].filter(Boolean).join(" • ");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-label-sm text-slate">
          <SearchIcon size={16} />
          Recherche référence constructeur
        </span>
        <h1 className="text-headline-xl-mobile text-navy md:text-headline-xl">
          {knownTitle}
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
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-stock-in-border bg-stock-in-bg px-3 py-1.5 text-label-sm text-stock-in-text">
          <BadgeCheckIcon size={15} />
          {responded} offre{responded > 1 ? "s" : ""} comparée{responded > 1 ? "s" : ""} chez
          vos fournisseurs
        </span>
        <span className="inline-flex w-fit items-center gap-2 text-label-md text-on-surface-variant">
          <SortIcon size={16} />
          Trié du prix le moins cher au plus cher
        </span>
        <span className="inline-flex w-fit items-center gap-2 text-label-sm text-slate">
          Aperçu de démonstration — l&apos;agrégation temps réel arrive avec les
          passerelles B2B.
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {results.map((result) => (
          <ResultRow
            key={result.id}
            result={result}
            supplier={supplierByCode.get(result.supplierCode)}
          />
        ))}

        <p className="flex items-center justify-center gap-2 text-label-sm text-slate">
          <InboxIcon size={16} />
          Les articles commandés sont enregistrés automatiquement dans vos
          articles en attente.
        </p>
      </div>
    </div>
  );
}