// Schéma normalisé interne, commun à tous les connecteurs fournisseurs.
// Voir AGENTS.md §5.
export interface NormalizedPart {
  reference: string;
  designation: string;
  marque: string;
  fournisseur: string;
  disponibilite: string;
  prix: number | null;
  devise: string;
  delai: string;
  lien_produit: string;
}

export interface ConnectorCredentials {
  login: string;
  password: string;
}

/** Critères de recherche normalisés, communs à tous les connecteurs. */
export interface SearchQuery {
  /** Référence d'origine (vide si recherche par désignation seule). */
  reference: string;
  /** Désignation recherchée « contient » (le %…% est ajouté par le connecteur). */
  designation?: string;
  /** "exact" (défaut) ou "starts" : la référence doit commencer par la saisie. */
  referenceMode?: "exact" | "starts";
}

export interface Connector {
  readonly code: string;
  readonly name: string;
  testConnection(
    creds: ConnectorCredentials,
  ): Promise<{ ok: boolean; error?: string }>;
  search(
    creds: ConnectorCredentials,
    query: SearchQuery,
  ): Promise<NormalizedPart[]>;
}
