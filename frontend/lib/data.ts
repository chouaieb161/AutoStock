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

export interface PartResult {
  id: string;
  supplierCode: string;
  brand: string;
  title: string;
  designation: string;
  availability: StockStatus;
  availabilityDetail: string;
  priceMillimes: number | null;
  unit: string;
  isBestOffer: boolean;
  isVerified: boolean;
}

export const results: PartResult[] = [
  {
    id: "r1",
    supplierCode: "GP",
    brand: "VALEO FIRST",
    title: "Jeu de 4 plaquettes de frein avant avec témoins d'usure intégrés",
    designation: "Gamaparts Tunis • Magasin Charguia 1",
    availability: "en-stock",
    availabilityDetail: "En stock (14 pièces disponibles) • Retrait comptoir immédiat",
    priceMillimes: 48500,
    unit: "par jeu",
    isBestOffer: true,
    isVerified: true,
  },
  {
    id: "r2",
    supplierCode: "ST",
    brand: "FERODO PREMIER",
    title: "Plaquettes de frein avant de qualité origine",
    designation: "SOTACAP Ben Arous • Dépôt Z.I. Ben Arous",
    availability: "en-stock",
    availabilityDetail: "En stock (6 pièces)",
    priceMillimes: 54200,
    unit: "par jeu",
    isBestOffer: false,
    isVerified: false,
  },
  {
    id: "r3",
    supplierCode: "AD",
    brand: "BOSCH BLUE LINE",
    title: "Plaquettes frein avant haute performance",
    designation: "Autodistribution Tunisie (Charguia)",
    availability: "sur-commande",
    availabilityDetail: "Sur commande (Délai 24h - Disponible demain 9h)",
    priceMillimes: 59000,
    unit: "par jeu",
    isBestOffer: false,
    isVerified: false,
  },
  {
    id: "r4",
    supplierCode: "CP",
    brand: "TRW LUCAS",
    title: "Plaquettes frein avant boîte standard",
    designation: "Comptoir Pièces Sfax • Expédition Grand Tunis",
    availability: "sur-commande",
    availabilityDetail: "Sur commande (Délai 48h)",
    priceMillimes: 62800,
    unit: "par jeu",
    isBestOffer: false,
    isVerified: false,
  },
  {
    id: "r5",
    supplierCode: "MA",
    brand: "BREMBO",
    title: "Plaquettes frein avant Clio IV",
    designation: "Maghreb Auto Pièces",
    availability: "rupture",
    availabilityDetail: "Rupture de stock",
    priceMillimes: 52000,
    unit: "Dernier prix connu",
    isBestOffer: false,
    isVerified: false,
  },
  {
    id: "r6",
    supplierCode: "TPM",
    brand: "-",
    title: "Réponse non disponible pour le moment",
    designation: "Tunisie Pièces Mécanique",
    availability: "indisponible",
    availabilityDetail: "Fournisseur temporairement indisponible",
    priceMillimes: null,
    unit: "Délai dépassé (timeout)",
    isBestOffer: false,
    isVerified: false,
  },
];