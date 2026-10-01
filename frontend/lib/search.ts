import type { StockStatus } from "@/lib/data";

/**
 * Types de la réponse de l'Edge Function `search-parts`.
 * Le contrat est défini côté serveur dans
 * supabase/functions/search-parts/index.ts — toute évolution doit être
 * répercutée ici.
 */

export interface SearchPart {
  reference: string;
  designation: string;
  marque: string;
  fournisseur: string;
  /** Statut brut du connecteur : "disponible" | "en_arrivage" | "indisponible". */
  disponibilite: string;
  prix: number | null;
  devise: string;
  delai: string;
  lien_produit: string;
  /** Statut déjà traduit pour l'UI. */
  disponibilite_app: StockStatus;
  /** Prix en millimes (unité attendue par formatTND). */
  price_millimes: number | null;
}

export type SearchSupplierStatus =
  | "ok"
  | "error"
  | "timeout"
  | "not-configured";

export interface SearchSupplierReport {
  code: string;
  name: string;
  status: SearchSupplierStatus;
  count: number;
  error?: string;
}

export interface SearchPartsResponse {
  reference: string;
  /** Écho de la désignation recherchée (si fournie à search-parts). */
  designation?: string;
  /** "exact" (défaut) ou "starts" : réf cherchée « commence par ». */
  reference_mode?: "exact" | "starts";
  results: SearchPart[];
  suppliers: SearchSupplierReport[];
}

/** Message lisible pour chaque code d'erreur renvoyé par `search-parts`. */
export function searchErrorLabel(
  code: string | undefined,
): string {
  switch (code) {
    case "UNAUTHENTICATED":
      return "Session expirée, veuillez vous reconnecter.";
    case "REFERENCE_REQUIRED":
      return "Saisissez une référence d'origine pour lancer la recherche.";
    case "INVALID_JSON":
    case "METHOD_NOT_ALLOWED":
      return "Requête invalide.";
    default:
      return "La recherche a échoué. Réessayez dans un instant.";
  }
}
