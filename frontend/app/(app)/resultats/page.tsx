import type { Metadata } from "next";
import {
  getSuppliersCatalogue,
  getTrackedByKey,
  searchParts,
} from "@/lib/dal";
import { searchErrorLabel } from "@/lib/search";
import ResultsView from "./results-view";

export const metadata: Metadata = {
  title: "Résultats comparateur",
};

// La recherche appelle les sites des grossistes : elle ne doit jamais être
// mise en cache statiquement.
export const dynamic = "force-dynamic";

export default async function ResultatsPage({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string;
    marque?: string;
    designation?: string;
    prefix?: string;
  }>;
}) {
  const { ref = "", marque = "", designation = "", prefix = "" } =
    await searchParams;
  const reference = ref.trim();

  const suppliers = await getSuppliersCatalogue();

  if (!reference) {
    return (
      <ResultsView
        suppliers={suppliers}
        payload={null}
        error={null}
        tracked={new Map<string, string>()}
      />
    );
  }

  const payload = await searchParts({
    reference,
    marque: marque.trim() || undefined,
    designation: designation.trim() || undefined,
    referenceMode: prefix === "1" ? "starts" : "exact",
  });

  const tracked = payload?.results?.length
    ? await getTrackedByKey(payload.results.map((p) => p.reference))
    : new Map<string, string>();

  return (
    <ResultsView
      suppliers={suppliers}
      payload={payload}
      error={
        payload ? null : searchErrorLabel("SEARCH_FAILED")
      }
      tracked={tracked}
    />
  );
}
