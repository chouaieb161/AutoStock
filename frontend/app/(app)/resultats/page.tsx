import type { Metadata } from "next";
import { Suspense } from "react";
import { getSuppliersCatalogue } from "@/lib/dal";
import ResultsView from "./results-view";

export const metadata: Metadata = {
  title: "Résultats comparateur",
};

export default async function ResultatsPage() {
  const suppliers = await getSuppliersCatalogue();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-64 items-center justify-center text-label-md text-slate">
          Chargement des offres fournisseurs...
        </div>
      }
    >
      <ResultsView suppliers={suppliers} />
    </Suspense>
  );
}