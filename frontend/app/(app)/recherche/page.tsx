import type { Metadata } from "next";
import Link from "next/link";
import SearchForm from "@/components/SearchForm";
import {
  HistoryIcon,
  SearchIcon,
  TruckIcon,
  CreditCardIcon,
  HeadsetIcon,
  ClockIcon,
  ArrowForwardIcon,
} from "@/components/icons";
import { getProfile, getRecentSearches, getConnectedSuppliersCount } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Recherche de pièces",
};

export default async function RecherchePage() {
  const [profile, recentSearches, connectedCount] = await Promise.all([
    getProfile(),
    getRecentSearches(5),
    getConnectedSuppliersCount(),
  ]);

  const greeting = profile?.shopName
    ? `Bonjour ${profile.shopName} !`
    : "Bonjour !";

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border-strong bg-surface-0 px-3 py-1.5 text-label-sm text-on-surface-variant">
          <span className="h-2 w-2 rounded-full bg-stock-in-text" />
          Connexion B2B Directe • Tunis, Sousse, Sfax
        </span>
        <h1 className="text-headline-xl-mobile text-navy md:text-headline-xl">
          {greeting}{" "}
          <span className="text-primary">Trouvez une pièce immédiatement.</span>
        </h1>
        <p className="max-w-2xl text-body-md text-on-surface-variant">
          Comparez prix et disponibilités chez vos {connectedCount} fournisseurs
          connectés en Tunisie en 1 clic.
        </p>
      </section>

      <SearchForm />

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-headline-sm text-navy">
          <HistoryIcon size={20} />
          Recherches récentes
          {recentSearches.length > 0 ? (
            <span className="text-label-sm font-normal text-slate">
              (Cliquez pour relancer)
            </span>
          ) : null}
        </h2>
        {recentSearches.length === 0 ? (
          <p className="rounded-lg border border-border-card bg-white px-4 py-3 text-label-md text-on-surface-variant">
            Aucune recherche pour l&apos;instant. Lancez votre première
            recherche ci-dessus.
          </p>
        ) : (
          <ul className="flex flex-col overflow-hidden rounded-lg border border-border-card bg-white">
            {recentSearches.map((s) => {
              const params = new URLSearchParams();
              params.set("ref", s.reference);
              if (s.marque) params.set("marque", s.marque);
              return (
                <li
                  key={s.id}
                  className="border-b border-border-card last:border-b-0"
                >
                  <Link
                    href={`/resultats?${params.toString()}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-0"
                  >
                    <span className="text-slate">
                      <ClockIcon size={18} />
                    </span>
                    <span className="text-body-md text-navy">{s.reference}</span>
                    {s.marque ? (
                      <span className="text-label-sm uppercase text-slate">
                        {s.marque}
                      </span>
                    ) : null}
                    <span className="ml-auto flex items-center gap-1 text-label-sm text-slate">
                      Relancer
                      <ArrowForwardIcon size={14} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <TrustItem
          icon={<SearchIcon size={22} />}
          title="Recherche instantanée"
          text={`Chez vos ${connectedCount} grossistes connectés en Tunisie.`}
        />
        <TrustItem
          icon={<CreditCardIcon size={22} />}
          title="En Dinars TND"
          text="Prix net pro HT & TTC"
        />
        <TrustItem
          icon={<TruckIcon size={22} />}
          title="Livraison Express"
          text="Matin 11h & Après-midi 16h"
        />
        <TrustItem
          icon={<HeadsetIcon size={22} />}
          title="Assistance Comptoir"
          text="Mon accompagnement au quotidien"
        />
      </section>

      <aside className="flex items-start gap-3 rounded-lg border border-primary-fixed bg-primary-fixed p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-label-lg text-white">
          💡
        </span>
        <p className="text-body-md text-on-primary-fixed">
          <strong className="font-semibold">Astuce pro :</strong> Saisissez la
          référence gravée sur la pièce usée ou le devis client pour trouver
          immédiatement le meilleur prix en stock et éviter les retours
          d&apos;incompatibilité.
        </p>
      </aside>
    </div>
  );
}

function TrustItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <span className="text-primary">{icon}</span>
      <p className="text-label-md text-navy">{title}</p>
      <p className="text-body-sm text-on-surface-variant">{text}</p>
    </div>
  );
}