"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { ArrowForwardIcon, SearchIcon } from "./icons";

const quickBrands = ["Renault", "Peugeot", "Valeo"];

export default function SearchForm() {
  const router = useRouter();
  const supabase = createClient();
  const [ref, setRef] = useState("");
  const [marque, setMarque] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref.trim() && !marque.trim()) return;
    setSubmitting(true);

    const recordRef = ref.trim();
    const recordMarque = marque.trim() || null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();
      if (prof) {
        await supabase.from("search_history").insert({
          tenant_id: prof.tenant_id,
          user_id: user.id,
          reference: recordRef,
          marque: recordMarque,
        });
      }
    }

    const params = new URLSearchParams();
    if (recordRef) params.set("ref", recordRef);
    if (recordMarque) params.set("marque", recordMarque);
    router.push(`/resultats?${params.toString()}`);
    setSubmitting(false);
  };

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="ref" className="field-label flex items-center gap-2">
            Référence d&apos;origine (OEM / Réf. Fabricant)
            <span className="rounded-[4px] bg-surface-chalk px-1.5 py-0.5 text-label-sm text-on-surface-variant">
              Recommandé
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
        </div>

        <div>
          <label htmlFor="marque" className="field-label">
            Marque du véhicule ou équipementier
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

      <button type="submit" className="btn btn-secondary self-start md:ml-auto" disabled={submitting}>
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