// Connecteur AD — Autodistribution (pro.ad-tunisie.com) — portage Deno du
// connecteur Node testé.
//
// Site = Magento 2 (thème AD). Connexion : POST /customer/account/loginPost/
// avec form_key + login[username]/login[password], session par cookies.
// Recherche : GET /catalogsearch/result/?q=<mots> (moteur mot-clé : SKU ET
// désignation). Le connecteur filtre ensuite selon le mode :
//   exact  -> conserve les lignes dont le SKU est égal à la référence
//   starts -> conserve les lignes dont le SKU commence par la référence
//   (désignation seule -> toutes les lignes rendues par le site)
// Les URL fiche produit (/…-sku.html) sont stables et partageables.
//
// ⚠️ Ne jamais journaliser les identifiants (mot de passe) ni les cookies.

import type {
  ConnectorCredentials,
  NormalizedPart,
  SearchQuery,
} from "./types.ts";

const DEFAULT_BASE_URL = "https://pro.ad-tunisie.com";

const UA = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
};

const TIMEOUT_MS = 30_000;
const MAX_PAGES = 5;

function setCookies(res: Response): string[] {
  const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }
  const raw = res.headers.get("set-cookie");
  if (!raw) return [];
  return raw.split(/,(?=\s*[A-Za-z0-9_.-]+=)/);
}

const normSku = (s: string): string =>
  String(s ?? "").replace(/\s+/g, "").toUpperCase();

function decode(entity: string): string {
  return entity
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&#x20;", " ");
}

interface ParsedRow {
  sku: string;
  reference: string;
  designation: string;
  prix: number | null;
  disponibilite: string;
  lien_produit: string;
}

function parseResults(html: string): { total: number; rows: ParsedRow[] } {
  const items = [
    ...html.matchAll(
      /<li\b[^>]*class="[^"]*\bproduct[^"]*\bproduct-item[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
    ),
  ].map((m) => m[1]);

  const total =
    Number(
      html.match(/sur\s*<span\s+class="toolbar-number">(\d+)<\/span>/i)?.[1] ??
        items.length,
    ) || items.length;

  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const sku = it.match(/data-product-sku="([^"]+)"/i)?.[1] ?? "";
    const key = normSku(sku);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const lien =
      it.match(
        /class="[^"]*(?:product-item-link|product[^"]*photo)[^"]*"[^>]*href="([^"]+)"/i,
      )?.[1] ?? "";

    const refText =
      it.match(
        /class="[^"]*product-item-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
      )?.[1] ?? "";
    const reference = (
      refText.match(/R[eé]f\s*:\s*([^<\n]+)/i)?.[1] ?? sku
    )
      .replace(/\s+/g, " ")
      .trim();

    const designation = (
      it.match(
        /<span\b[^>]*class="[^"]*product-reference-item[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
      )?.[1] ?? ""
    )
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const prixRaw = it.match(/data-price-amount="([\d.]+)"/i)?.[1];
    const prix = Number.isFinite(Number(prixRaw)) ? Number(prixRaw) : null;

    const stockClass = it.match(/class="stock\s+([^"]+)"/i)?.[1] ?? "";
    const disponibilite = stockClass === "available" ? "disponible" : "indisponible";

    rows.push({ sku: key, reference, designation, prix, disponibilite, lien_produit: decode(lien) });
  }

  return { total, rows };
}

export class ProadConnector {
  readonly code = "AD";
  readonly name = "Autodistribution";
  #jar = new Map<string, string>();
  #baseUrl: string;
  #connected = false;

  constructor(baseUrl: string) {
    this.#baseUrl = baseUrl || DEFAULT_BASE_URL;
  }

  #cookieHeader(): string {
    return [...this.#jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  #resolve(path: string): string {
    return new URL(path, this.#baseUrl).href;
  }

  async #fetch(
    url: string,
    init: RequestInit = {},
    hops = 0,
  ): Promise<{ status: number; location: string | null; html: string }> {
    const method = init.method ?? "GET";
    const headers: Record<string, string> = {
      ...UA,
      ...((init.headers as Record<string, string>) ?? {}),
    };
    const cookies = this.#cookieHeader();
    if (cookies) headers.cookie = cookies;

    const res = await fetch(url, {
      ...init,
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    for (const sc of setCookies(res)) {
      const kv = sc.split(";")[0];
      const eq = kv.indexOf("=");
      if (eq > 0) this.#jar.set(kv.slice(0, eq).trim(), kv.slice(eq + 1).trim());
    }

    // Suivi des redirects pour les GET uniquement (ex. "/" -> login) : le
    // POST loginPost doit au contraire rester non suivi pour pouvoir
    // exploiter sa redirection 302 vers l'accueil connecté.
    const location = res.headers.get("location");
    if (
      method === "GET" &&
      location &&
      res.status >= 300 &&
      res.status < 400 &&
      hops < 3
    ) {
      const next = location.startsWith("http")
        ? location
        : this.#resolve(location);
      return this.#fetch(next, init, hops + 1);
    }

    return {
      status: res.status,
      location,
      html: await res.text(),
    };
  }

  async #get(path: string): Promise<{ status: number; html: string }> {
    const res = await this.#fetch(this.#resolve(path));
    return { status: res.status, html: res.html };
  }

  async #post(url: string, form: URLSearchParams): Promise<{ status: number; location: string | null; html: string }> {
    return this.#fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
  }

  // Connexion Magento 2 : form_key + login[username]/login[password], puis
  // suivi du 302 (loginPost répond vers le dashboard du compte).
  async #login(creds: ConnectorCredentials): Promise<void> {
    if (this.#connected) return;
    const home = await this.#get("/");
    const formHtml = home.html.match(
      /<form[^>]*action=["']([^"']*customer\/account\/loginPost[^"']*)["'][^>]*>([\s\S]*?)<\/form>/i,
    );
    if (!formHtml) throw new Error("AD: formulaire de connexion introuvable");
    const action = formHtml[1];
    const fields = formHtml[2];

    const inputs = [
      ...fields.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi),
    ].map((m) => m[0].replace(/\s+/g, " "));
    const form = new URLSearchParams();
    for (const tag of inputs) {
      const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
      if (!name || name === "login[username]" || name === "login[password]") continue;
      const value = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "";
      form.append(name, decode(value));
    }
    form.append("login[username]", creds.login);
    form.append("login[password]", creds.password);

    // la page n'embarque pas d'indicateur de succès fiable : on suit le
    // redirect ; une redirection vers la page d'accueil/dashboard = succès.
    const res = await this.#post(this.#resolve(action), form);
    if (res.status >= 300 && res.status < 400 && res.location) {
      await this.#get(res.location.startsWith("http") ? res.location : "/");
      this.#connected = true;
      return;
    }
    throw new Error("AD: connexion refusée (identifiants invalides)");
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

    const terms = [reference, designation].filter(Boolean).join(" ");
    if (!terms) return [];
    const wanted = reference ? normSku(reference) : "";
    const encoded = encodeURIComponent(terms).replace(/%20/g, "+");

    const rows: ParsedRow[] = [];
    const seen = new Set<string>();
    let total = Infinity;

    for (let p = 1; p <= MAX_PAGES; p++) {
      const path = `/catalogsearch/result/?q=${encoded}${p > 1 ? `&p=${p}` : ""}`;
      const res = await this.#get(path);
      if (res.status !== 200) break;
      const page = parseResults(res.html);
      if (p === 1) total = page.total;

      for (const r of page.rows) {
        if (seen.has(r.sku)) continue;
        if (wanted && referenceMode === "exact" && r.sku !== wanted) continue;
        if (wanted && referenceMode === "starts" && !r.sku.startsWith(wanted)) continue;
        seen.add(r.sku);
        rows.push(r);
      }

      const pagesTotal = Math.max(
        Math.ceil(total / Math.max(page.rows.length, 1)),
        1,
      );
      if (p >= pagesTotal) break;
    }

    return rows.map((r) => ({
      reference: r.reference,
      designation: r.designation,
      marque: "",
      fournisseur: this.name,
      disponibilite: r.disponibilite,
      prix: r.prix,
      devise: "TND",
      delai: "",
      lien_produit: r.lien_produit || this.#baseUrl,
    }));
  }
}