import type { Metadata } from "next";
import Logo from "@/components/Logo";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

const benefits = [
  "Comparez 10 grossistes en une seule recherche",
  "Prix net pro en Dinars Tunisiens (TND)",
  "Stock et délais en temps réel via API B2B",
  "Panier de suivi pour vos commandes du jour",
];

export default async function ConnexionPage() {
  const user = await getSession();
  if (user) redirect("/recherche");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border-card bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-0 px-3 py-1.5 text-label-sm text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-stock-in-text" />
            Connexion sécurisée
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-8 md:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-2">
          <div className="card order-1 flex flex-col gap-6 p-5 md:p-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-headline-lg text-navy">Connexion</h1>
              <p className="text-body-md text-on-surface-variant">
                Accédez à votre comparateur B2B AutoStock.tn.
              </p>
            </div>
            <LoginForm />
          </div>

          <aside className="order-2 flex flex-col justify-center gap-5">
            <div>
              <span className="text-label-sm uppercase tracking-wide text-primary">
                Réseau Pro Tunisie
              </span>
              <h2 className="text-headline-xl-mobile text-navy md:text-headline-xl">
                Votre comparateur de pièces
              </h2>
              <p className="mt-2 max-w-md text-body-md text-on-surface-variant">
                Un seul écran pour interroger tous vos grossistes partenaires et
                sécuriser le meilleur prix du comptoir.
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-3 text-body-md text-navy">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stock-in-bg text-label-sm text-stock-in-text">
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>

      <footer className="border-t border-border-card bg-surface-0">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-center text-label-sm text-slate md:px-8">
          © 2026 AutoStock.tn · Connexion sécurisée
        </p>
      </footer>
    </div>
  );
}