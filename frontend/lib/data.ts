export const formatTND = (millimes: number): string =>
  `${(millimes / 1000).toFixed(3).replace(".", ",")} TND`;

export type StockStatus =
  | "en-stock"
  | "sur-commande"
  | "rupture"
  | "indisponible";

const avatarPalette = [
  "bg-primary",
  "bg-secondary",
  "bg-tertiary",
  "bg-commerce",
  "bg-primary-fixed",
  "bg-slate",
];

export const avatarClass = (code: string): string =>
  avatarPalette[
    [...code].reduce((acc, c) => acc + c.charCodeAt(0), 0) %
      avatarPalette.length
  ];

export const abbrOf = (code: string): string => code.slice(0, 2).toUpperCase();

const dateFmt = new Intl.DateTimeFormat("fr-TN", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const dateLabel = (iso: string): string => dateFmt.format(new Date(iso));

export const timeAgo = (iso: string | null): string => {
  if (!iso) return "jamais";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
};

export interface SupplierReference {
  id: string;
  code: string;
  name: string;
  city: string | null;
  baseUrl: string | null;
  supportsApi: boolean;
}

export type TenantSupplierStatus = "connected" | "blocked" | "error" | null;

export interface TenantSupplierView extends SupplierReference {
  tenantStatus: TenantSupplierStatus;
  identifier: string | null;
  lastCheckAt: string | null;
  lastError: string | null;
}

export interface RecentSearchView {
  id: string;
  reference: string;
  marque: string | null;
  designation: string | null;
  referenceMode: "exact" | "starts" | null;
  createdAt: string;
}

export interface CartItemView {
  id: string;
  reference: string;
  marque: string | null;
  title: string;
  meta: string;
  prixMillimes: number | null;
  productUrl: string | null;
  addedAt: string;
  quantite: number;
  status: "pending" | "ordered";
  supplierCode: string;
  supplierName: string;
  supplierCity: string | null;
  baseUrl: string | null;
}

export interface CartGroupView {
  supplierCode: string;
  supplierName: string;
  supplierCity: string | null;
  baseUrl: string | null;
  items: CartItemView[];
}

/** Résultat d'un appel à l'Edge Function `connect-supplier`. */
export type ConnectOutcome =
  | { ok: true }
  | { ok: false; message: string };

