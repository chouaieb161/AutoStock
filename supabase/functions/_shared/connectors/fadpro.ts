// Connecteur FADPRO (fadpro.tn) — portage Deno du connecteur Node testé.
//
// L'interface publique est une SPA Angular (`https://fadpro.tn`), mais toute la
// logique métier passe par une API REST séparée sur `https://fadpro.tn:8095/fad`
// (URL exposée par l'app elle-même via la collection PocketBase `api_urls`,
// enregistrement `BaseURL`).
//
// Connexion : POST /fad/auth/login?custNo=<login>&password=<password>, en-tête
// `X-CUSTOM-ORIGIN: https://fadpro.tn` ; renvoie { token } (JWT HS512). Toutes
// les requêtes suivantes portent `Authorization: Bearer <token>`.
// Recherche : GET /fad/api/b2b/search?refFour=<ref>&marque=<marque>&designation=<des>
// -> tableau JSON ; renvoie 404 + texte « Aucun article trouvé » si vide.
//
// ⚠️ Ne jamais journaliser les identifiants, l'URL de login ni le jeton.

import type {
  ConnectorCredentials,
  NormalizedPart,
  SearchQuery,
} from "./types.ts";

const DEFAULT_SITE_URL = "https://fadpro.tn";
// API métier : hôte + port + préfixe fixes, distincts du site public.
const API_URL = "https://fadpro.tn:8095/fad";
const CUSTOM_ORIGIN = "https://fadpro.tn";

const UA = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
};

const TIMEOUT_MS = 30_000;
const MAX_RESULTS = 300;

const normSku = (s: string): string =>
  String(s ?? "").replace(/\s+/g, "").toUpperCase();

// `dispo` API : "S" = en stock, "A" = arrivage, ""/null = indisponible.
function availability(dispo: string | null | undefined): string {
  if (dispo === "S") return "disponible";
  if (dispo === "A") return "en_arrivage";
  return "indisponible";
}

interface ApiRow {
  refFour: string;
  designation?: string | null;
  marque?: string | null;
  itemNomFpur?: string | null;
  prix?: number | null;
  dispo?: string | null;
}

export class FadproConnector {
  readonly code = "FAD";
  readonly name = "FADPRO";
  #token = "";

  constructor(private siteUrl: string = DEFAULT_SITE_URL) {
    if (!siteUrl) this.siteUrl = DEFAULT_SITE_URL;
  }

  #fetch(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...UA,
        origin: CUSTOM_ORIGIN,
        referer: `${CUSTOM_ORIGIN}/`,
        "x-custom-origin": CUSTOM_ORIGIN,
        ...((init.headers as Record<string, string>) ?? {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  async #login(creds: ConnectorCredentials): Promise<void> {
    if (this.#token) return;
    const qs = new URLSearchParams({
      custNo: creds.login,
      password: creds.password,
    });
    const res = await this.#fetch(`/auth/login?${qs.toString()}`, {
      method: "POST",
    });
    let token = "";
    try {
      token = ((await res.json()) as { token?: string }).token ?? "";
    } catch {
      token = "";
    }
    if (res.status !== 200 || !token) {
      throw new Error("FADPRO: connexion refusée (identifiants invalides)");
    }
    this.#token = token;
  }

  async testConnection(
    creds: ConnectorCredentials,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.#login(creds);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }

  async search(
    creds: ConnectorCredentials,
    query: SearchQuery,
  ): Promise<NormalizedPart[]> {
    await this.#login(creds);

    const reference = (query.reference ?? "").trim();
    const designation = (query.designation ?? "").trim();
    const referenceMode = query.referenceMode ?? "exact";
    if (!reference && !designation) return [];

    const params = new URLSearchParams();
    if (reference) params.set("refFour", reference);
    if (designation) params.set("designation", designation);

    const res = await this.#fetch(`/api/b2b/search?${params.toString()}`, {
      headers: { authorization: `Bearer ${this.#token}` },
    });

    // Aucun résultat : 404 + texte brut côté API.
    if (res.status === 404) {
      const text = await res.text();
      if (/Aucun article/i.test(text)) return [];
    }
    if (!res.ok) {
      throw new Error(`FADPRO: recherche refusée (HTTP ${res.status})`);
    }

    let rows: ApiRow[] = [];
    try {
      const parsed = await res.json();
      if (Array.isArray(parsed)) rows = parsed as ApiRow[];
    } catch {
      rows = [];
    }

    const wanted = reference ? normSku(reference) : "";
    const out: NormalizedPart[] = [];
    const seen = new Set<string>();

    for (const r of rows) {
      const sku = normSku(r.refFour);
      if (!sku || seen.has(sku)) continue;
      if (wanted && referenceMode === "exact" && sku !== wanted) continue;
      if (wanted && referenceMode === "starts" && !sku.startsWith(wanted)) {
        continue;
      }
      seen.add(sku);

      const disponibilite = availability(r.dispo);
      out.push({
        reference: r.refFour,
        designation: r.designation ?? "",
        marque: r.itemNomFpur ?? r.marque ?? "",
        fournisseur: this.name,
        disponibilite,
        prix: typeof r.prix === "number" ? r.prix : null,
        devise: "TND",
        delai:
          disponibilite === "en_arrivage"
            ? "en cours d'arrivage"
            : disponibilite === "indisponible"
            ? "indisponible"
            : "",
        // Pas d'URL de fiche stable (détail ouvert dans une boîte de dialogue
        // SPA) : « Commander » ouvre le site d'entrée.
        lien_produit: this.siteUrl || DEFAULT_SITE_URL,
      });
      if (out.length >= MAX_RESULTS) break;
    }

    return out;
  }
}
