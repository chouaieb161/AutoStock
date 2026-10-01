"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowForwardIcon, SearchIcon } from "./icons";

const quickBrands = ["Renault", "Peugeot", "Valeo"];

export default function SearchForm() {
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [marque, setMarque] = useState("");
  const [designation, setDesignation] = useState("");
  const [prefix, setPrefix] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // La référence est le critère principal que les connecteurs fournisseurs
  // savent appliquer de façon fiable. La marque et la désignation restent des
  // filtres informatifs. La case « commence par » élargit la recherche aux
  // références partielles (comme sur le site du grossiste).
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const recordRef = ref.trim();
    const recordMarque = marque.trim();
    const recordDesignation = designation.trim();
    if (!recordRef) return;

    setSubmitting(true);
    const params = new URLSearchParams();
    params.set("ref", recordRef);
    if (recordMarque) params.set("marque", recordMarque);
    if (recordDesignation) params.set("designation", recordDesignation);
    if (prefix) params.set("prefix", "1");
    router.push(`/resultats?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
            <label htmlFor="ref" className="field-label flex items-center gap-2">
              Référence d&apos;origine (OEM / Réf. Fabricant)
              <span className="rounded-[4px] bg-surface-chalk px-1.5 py-0.5 text-label-sm text-on-surface-variant">
                Obligatoire
              </span>
            </label>
          <div className="relative">
            <XIconWrapper />
            <input
              id="ref"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Ex : 410602192R"
              className="input pl-11 text-body-lg"
              autoComplete="off"
            />
          </div>
          <label
            htmlFor="prefix"
            className="mt-3 flex cursor-pointer items-start gap-2"
          >
            <input
              id="prefix"
              type="checkbox"
              checked={prefix}
              onChange={(e) => setPrefix(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#1D4ED8]"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-label-md text-on-surface">
                Référence commence par
              </span>
              <span className="text-body-sm text-on-surface-variant">
                À cocher si la référence est incomplète.
              </span>
            </span>
          </label>
        </div>

        <div>
          <label htmlFor="marque" className="field-label">
            Marque du véhicule ou équipementier
            <span className="rounded-[4px] bg-surface-chalk px-1.5 py-0.5 text-label-sm text-on-surface-variant">
              Facultatif
            </span>
          </label>
          <input
            id="marque"
            value={marque}
            onChange={(e) => setMarque(e.target.value)}
            placeholder="Ex : Renault, Valeo..."
            className="input"
            autoComplete="off"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {quickBrands.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setMarque(b)}
                className={`chip ${marque === b ? "border-primary bg-primary-fixed text-primary" : ""}`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="designation" className="field-label">
          Désignation de la pièce
          <span className="rounded-[4px] bg-surface-chalk px-1.5 py-0.5 text-label-sm text-on-surface-variant">
            Facultatif
          </span>
        </label>
        <input
          id="designation"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="Ex : fourchette d'embrayage, pompe à eau..."
          className="input"
          autoComplete="off"
        />
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Affine la recherche : la désignation doit être contenue dans le
          libellé du grossiste.
        </p>
      </div>

      <button
        type="submit"
        className="btn btn-secondary self-start md:ml-auto"
        disabled={submitting || !ref.trim()}
      >
        <SearchIcon size={20} />
        {submitting ? "Recherche en cours..." : "Rechercher la pièce"}
        <ArrowForwardIcon size={20} />
      </button>
    </form>
  );
}

function XIconWrapper() {
  return (
    <SearchIcon
      size={24}
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate"
    />
  );
}