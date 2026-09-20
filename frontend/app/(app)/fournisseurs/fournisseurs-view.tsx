"use client";

import Link from "next/link";
import SupplierAvatar from "@/components/SupplierAvatar";
import type { TenantSupplierView } from "@/lib/data";
import { timeAgo } from "@/lib/data";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  CloudOffIcon,
  LockIcon,
  PhoneIcon,
  PlugIcon,
  SearchIcon,
  ShieldIcon,
  SyncIcon,
} from "@/components/icons";

export default function FournisseursView({
  suppliers,
}: {
  suppliers: TenantSupplierView[];
}) {
  const connected = suppliers.filter(
    (s) => s.tenantStatus === "connected",
  ).length;
  const toConnect = suppliers.length - connected;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border-strong bg-surface-0 px-3 py-1.5 text-label-sm text-on-surface-variant">
          <SyncIcon size={15} />
          Passerelles B2B Tunisie
        </span>
        <h1 className="text-headline-xl-mobile text-navy md:text-headline-xl">
          Mes Fournisseurs
        </h1>
        <p className="max-w-2xl text-body-md text-on-surface-variant">
          AutoStock interroge les comptes professionnels de vos grossistes
          partenaires pour récupérer vos tarifs remisés et vos stocks en temps
          réel.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <PlugIcon size={22} />
          </span>
          <div>
            <p className="tnum text-headline-md text-navy">
              {connected}/{suppliers.length}
            </p>
            <p className="text-label-sm text-slate">Connectés & Opérationnels</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <CloudOffIcon size={22} />
          </span>
          <div>
            <p className="tnum text-headline-md text-navy">{toConnect}</p>
            <p className="text-label-sm text-slate">À connecter</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <BadgeCheckIcon size={22} />
          </span>
          <div>
            <p className="text-headline-md text-navy">{suppliers.length}</p>
            <p className="text-label-sm text-slate">Grossistes référencés</p>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-navy">
            Vos comptes grossistes
            <span className="ml-2 text-label-md font-normal text-slate">
              {suppliers.length} référencés
            </span>
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {suppliers.map((s) => {
            const connected = s.tenantStatus === "connected";
            const blocked = s.tenantStatus === "blocked";
            const error = s.tenantStatus === "error";
            return (
              <article key={s.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <SupplierAvatar code={s.code} name={s.name} size="lg" />
                    <div className="flex flex-col">
                      <h3 className="text-headline-sm text-navy">{s.name}</h3>
                      <span className="text-label-sm text-slate">
                        {s.city ?? "Tunisie"} •{" "}
                        {s.supportsApi ? "Raccordement API" : "Accès site B2B"}
                      </span>
                    </div>
                  </div>
                  {blocked || error ? (
                    <span className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-stock-rupture-border bg-stock-rupture-bg px-2 text-label-sm uppercase text-stock-rupture-text">
                      <AlertTriangleIcon size={13} />
                      {blocked ? "Bloqué" : "Erreur"}
                    </span>
                  ) : connected ? (
                    <span className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-stock-in-border bg-stock-in-bg px-2 text-label-sm uppercase text-stock-in-text">
                      <BadgeCheckIcon size={13} />
                      Connecté
                    </span>
                  ) : (
                    <span className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-border-strong bg-surface-0 px-2 text-label-sm uppercase text-on-surface-variant">
                      <LockIcon size={13} />
                      Non configuré
                    </span>
                  )}
                </div>

                {blocked || error ? (
                  <p className="flex items-start gap-2 rounded-md border border-stock-rupture-border bg-stock-rupture-bg px-3 py-2.5 text-label-md text-stock-rupture-text">
                    <AlertTriangleIcon size={18} className="mt-0.5 shrink-0" />
                    <span>{s.lastError ?? "Connexion requise."}</span>
                  </p>
                ) : connected ? (
                  <p className="rounded-md border border-border-strong bg-surface-0 px-3 py-2.5 text-label-sm text-on-surface-variant">
                    Dernière vérification : {timeAgo(s.lastCheckAt)}
                  </p>
                ) : (
                  <p className="rounded-md border border-border-strong bg-surface-0 px-3 py-2.5 text-label-sm text-on-surface-variant">
                    Prêt à l&apos;emploi. Connectez votre compte pro pour
                    l&apos;interroger lors des recherches.
                  </p>
                )}

                {s.identifier ? (
                  <div className="flex flex-col gap-1 border-t border-border-card pt-3 text-label-sm text-on-surface-variant">
                    <span>
                      Identifiant :{" "}
                      <span className="font-mono font-semibold text-navy">
                        {s.identifier}
                      </span>
                    </span>
                  </div>
                ) : null}

                <div className="mt-auto flex items-center gap-2">
                  <Link href="/recherche" className="btn btn-outline flex-1">
                    <SearchIcon size={18} />
                    Tester la recherche
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <ShieldIcon size={22} />
            </span>
            <div>
              <h2 className="text-headline-sm text-navy">
                Connecter un compte grossiste
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                La connexion sécurisée d&apos;un compte grossiste sera activée
                avec les passerelles B2B (étape suivante du projet). Vos
                identifiants seront alors chiffrés dans Supabase Vault et ne
                serviront qu&apos;à vos recherches.
              </p>
            </div>
          </div>

          <form className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="grossiste" className="field-label">
                  Sélectionnez le grossiste
                </label>
                <select id="grossiste" className="input appearance-none" disabled defaultValue="">
                  <option value="">Choisir un grossiste partenaire...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ident" className="field-label">
                  Identifiant B2B
                </label>
                <input
                  id="ident"
                  placeholder="Ex : client-pro-7842"
                  className="input"
                  autoComplete="off"
                  disabled
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="password" className="field-label">
                  Mot de passe du compte pro
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••••"
                  className="input"
                  autoComplete="off"
                  disabled
                />
                <p className="mt-1.5 flex items-center gap-1 text-label-sm text-slate">
                  <ShieldIcon size={14} />
                  Ce mot de passe restera chiffré selon la norme AES-256.
                </p>
              </div>
              <button type="submit" className="btn btn-secondary" disabled>
                <LockIcon size={18} />
                Enregistrer et connecter (bientôt)
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="card flex items-start gap-3 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <ShieldIcon size={22} />
          </span>
          <div>
            <h3 className="text-headline-sm text-navy">
              Sécurité de vos données garantie
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Vos identifiants professionnels sont chiffrés et stockés de façon
              sécurisée. Ils ne sont utilisés que pour automatiser la recherche
              de prix et de disponibilité sur votre demande.
            </p>
          </div>
        </div>
        <div className="card flex items-start gap-3 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <PhoneIcon size={22} />
          </span>
          <div>
            <h3 className="text-headline-sm text-navy">
              Besoin d&apos;aide pour connecter ?
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Assistance technique comptoir :{" "}
              <a href="tel:71000000" className="tnum font-semibold text-primary">
                71 000 000
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}