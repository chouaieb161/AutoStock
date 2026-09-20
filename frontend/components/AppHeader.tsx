"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { LogOutIcon } from "./icons";
import { signOut } from "@/lib/auth-actions";

type AppHeaderProps = {
  initials: string;
  shopName: string | null;
  shopCity: string | null;
  roleLabel: string;
  connectedCount: number;
  pendingCount: number;
};

export default function AppHeader({
  initials,
  shopName,
  shopCity,
  roleLabel,
  connectedCount,
  pendingCount,
}: AppHeaderProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/recherche", label: "Rechercher" },
    { href: "/panier", label: "Mes articles en attente", badge: pendingCount },
    { href: "/fournisseurs", label: "Mes fournisseurs" },
  ];

  const shopLabel = shopName ?? "Point de vente";
  const roleDetail = shopCity ? `${roleLabel} • ${shopCity}` : roleLabel;

  return (
    <header className="sticky top-0 z-30 border-b border-border-card bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-8">
        <Logo href="/recherche" />

        <nav className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto pb-1 md:order-none md:ml-2 md:w-auto md:flex-1 md:overflow-visible md:pb-0">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3 text-label-md transition-colors ${
                  active
                    ? "bg-primary-fixed text-primary"
                    : "text-on-surface-variant hover:bg-surface-0 hover:text-navy"
                }`}
              >
                {item.label}
                {item.badge ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-container px-1.5 text-label-sm text-on-secondary-container">
                    {item.badge}
                  </span>
                ) : null}
                {active ? (
                  <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <span className="hidden items-center gap-1.5 rounded-full border border-border-strong bg-surface-0 px-3 py-1.5 text-label-sm text-on-surface-variant lg:inline-flex">
            <span className="h-2 w-2 rounded-full bg-stock-in-text" />
            {connectedCount} fournisseur{connectedCount > 1 ? "s" : ""} connecté
            {connectedCount > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2.5 border-l border-border-card pl-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-label-lg font-extrabold text-white">
              {initials}
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-label-md text-navy">{shopLabel}</span>
              <span className="text-label-sm text-slate">{roleDetail}</span>
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate transition-colors hover:bg-surface-0 hover:text-navy"
              aria-label="Se déconnecter"
            >
              <LogOutIcon size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}