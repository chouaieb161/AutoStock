// Connecteur LAHIANI (lahianipa.com) — portage Deno du connecteur Node testé.
//
// Le domaine lahianipa.com est un hub WEBDEV/PCSoft : le catalogue réel est
// l'application « LahianiB2B » (https://lahianipa.com/LahianiB2B), même famille
// que /sopraB2B. Connexion : POST formulaire (WD_ACTION_, WD_BUTTON_CLICK_,
// WD_JSON_PROPRIETE_), jeton d'action dans l'URL (/LahianiB2B/PAGE_<...>/<token>).
//
// Recherche « comme sur le site », recette AJAX validée en live : POST AJAXPAGE
// (EXECUTE=16, WD_CONTEXTE_=M172 « Rechercher ») sur le token courant avec
// M68=référence, M69="%désignation%", M189/M190 vides. L'ordre des champs de
// commande en tête du corps est significatif. Aucune action d'achat.
//
// ⚠️ Ne jamais journaliser les identifiants ni le corps des requêtes de login.

import type {
  ConnectorCredentials,
  NormalizedPart,
  SearchQuery,
} from "./types.ts";

const UA = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
};

const APP = "/LahianiB2B";
const SEARCH_BUTTON = "M172";

const AVAILABILITY: Record<string, string> = {
  "1": "disponible",
  "2": "indisponible",
  "3": "en_arrivage",
};

const TIMEOUT_MS = 30_000;

function setCookies(res: Response): string[] {
  const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }
  const raw = res.headers.get("set-cookie");
  if (!raw) return [];
  return raw.split(/,(?=\s*[A-Za-z0-9_.-]+=)/);
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normSku(value: string): string {
  return String(value ?? "").replace(/\s+/g, "").toUpperCase();
}

function formAction(html: string): string | undefined {
  return html.match(/<form[^>]*action=["']([^"']+)["']/i)?.[1];
}

function hiddenFields(html: string): Record<string, string> {
  const prio = html.match(
    /<input[^>]*name=["']WD_JSON_PROPRIETE_["'][^>]*value=["']([^"']*)["']/i,
  )?.[1];
  return {
    WD_JSON_PROPRIETE_: prio
      ? prio.replaceAll("&quot;", '"')
      : '{"m_oProprietesSecurisees":{}}',
  };
}

function decodeAttr(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

// Reproduit le corps du vrai <form> (cases cochées + champs dupliqués
// préservés), comme le navigateur lors du .submit() complet.
function buildFormBody(html: string): [string, string][] {
  const regionMatch = html.match(/<form\b[^>]*>([\s\S]*?)<\/form>/i);
  const region = regionMatch ? regionMatch[1] : html;
  const pairs: [string, string][] = [];
  let m: RegExpExecArray | null;

  const inputRe = /<input\b([^>]*)>/gi;
  while ((m = inputRe.exec(region))) {
    const attrs = m[1];
    const name = attrs.match(/\bname=["']([^"']+)["']/i)?.[1];
    if (!name) continue;
    const type = (attrs.match(/\btype=["']([^"']+)["']/i)?.[1] ?? "text")
      .toLowerCase();
    const value = () =>
      decodeAttr(attrs.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "");
    if (type === "checkbox" || type === "radio") {
      if (/\bchecked\b/i.test(attrs)) pairs.push([name, value() || "1"]);
      continue;
    }
    if (["submit", "button", "reset", "image", "file"].includes(type)) continue;
    pairs.push([name, value()]);
  }

  const selRe = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
  while ((m = selRe.exec(region))) {
    const name = m[1].match(/\bname=["']([^"']+)["']/i)?.[1];
    if (!name) continue;
    const opts = [...m[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)];
    const sel = opts.find((o) => /\bselected\b/i.test(o[1]));
    const val = sel
      ? (sel[1].match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "")
      : (opts[0]?.[1].match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "");
    pairs.push([name, val.replaceAll("&amp;", "&")]);
  }

  const taRe = /<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi;
  while ((m = taRe.exec(region))) {
    const name = m[1].match(/\bname=["']([^"']+)["']/i)?.[1];
    if (name) pairs.push([name, m[2].replace(/<[^>]*>/g, "")]);
  }

  return pairs;
}

interface ParsedRow {
  n: number;
  marque: string;
  reference: string;
  designation: string;
  prix: string;
  disponibilite: string;
}

function parseResults(html: string): ParsedRow[] {
  // La réponse AJAX ne remplit pas forcément le compteur M76_OCC : on itère
  // sur les n présents dans le HTML (id="zrl_<n>_M104"), jamais sur le compteur.
  const rows: ParsedRow[] = [];
  const posOf = (n: number) => html.indexOf(`id="zrl_${n}_M104"`);
  const present = [
    ...new Set(
      [...html.matchAll(/id="zrl_(\d+)_M104"/g)].map((m) => Number(m[1])),
    ),
  ].sort((a, b) => a - b);
  for (const n of present) {
    const start = posOf(n);
    if (start < 0) continue;
    const next = posOf(n + 1);
    const slice = html.slice(start, next > start ? next : start + 30_000);

    const raw = html.match(new RegExp(`id="zrl_${n}_M104">([^<]*)<`))?.[1]
      ?.trim() ?? "";
    const mRef = raw.match(/^(.*?)\s*-\s*R[ée]f\s*:\s*(.+)$/);
    const marque = mRef ? mRef[1].trim() : raw;
    const reference = mRef ? mRef[2].trim() : "";

    const designation =
      (html.match(new RegExp(`id="zrl_${n}_M77">([^<]*)<`))?.[1] ?? "")
        .replace(/\s+/g, " ")
        .trim();
    const prix =
      html.match(new RegExp(`name="zrl_${n}_M72"[^>]*value="([^"]*)"`, "i"))
        ?.[1] ?? "";
    const activePlan = slice.match(
      /class="[^"]*wbActif[^"]*wbPlanNumero(\d)[^"]*"/,
    );
    const disponibilite = activePlan
      ? (AVAILABILITY[activePlan[1]] ?? "")
      : "";

    rows.push({ n, marque, reference, designation, prix, disponibilite });
  }
  return rows;
}

export class LahianipaConnector {
  readonly code = "LHI";
  readonly name = "LAHIANI";
  #jar = new Map<string, string>();
  #catalogueHtml = "";
  #catalogueUrl = "";

  constructor(private baseUrl: string) {}

  #cookieHeader(): string {
    return [...this.#jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async #fetch(
    url: string,
    init: RequestInit = {},
  ): Promise<{ status: number; html: string }> {
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
    return { status: res.status, html: await res.text() };
  }

  #resolve(path: string): string {
    return new URL(path, this.baseUrl).href;
  }

  async #post(url: string, pairs: [string, string][]): Promise<string> {
    const body = new URLSearchParams();
    for (const [k, v] of pairs) body.append(k, v);
    const res = await this.#fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return res.html;
  }

  async #login(creds: ConnectorCredentials): Promise<string> {
    const home = await this.#fetch(this.#resolve(APP));
    const action1 = formAction(home.html);
    if (!action1) throw new Error("LAHIANI: form d'accueil introuvable");

    const loginPage = await this.#fetch(this.#resolve(action1 + "?A6"));
    const action2 = formAction(loginPage.html);
    if (!action2) throw new Error("LAHIANI: form de connexion introuvable");

    const html = await this.#post(this.#resolve(action2), [
      ...(Object.entries(hiddenFields(loginPage.html)) as [string, string][]),
      ["WD_BUTTON_CLICK_", "A10"],
      ["WD_ACTION_", ""],
      ["A8", creds.login],
      ["A7", creds.password],
    ]);

    if (!html.includes("PAGE_CATALOGUEARTICLES")) {
      throw new Error("LAHIANI: connexion refusée (identifiants invalides)");
    }
    // Le login atterrit directement sur le catalogue.
    const catAction = formAction(html);
    if (!catAction) throw new Error("LAHIANI: action catalogue introuvable");
    this.#catalogueHtml = html;
    this.#catalogueUrl = this.#resolve(catAction);
    return html;
  }

  // Connexion seule (utilisée par connect-supplier pour valider les
  // identifiants à l'enregistrement, sans recherche).
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

    const pairs = buildFormBody(this.#catalogueHtml);
    const set = (name: string, value: string) => {
      const found = pairs.find((p) => p[0] === name);
      if (found) found[1] = value;
      else pairs.push([name, value]);
    };
    set("M68", reference);
    set("M69", designation ? `%${designation}%` : "");
    set("M189", "");
    set("M190", "");

    // L'ordre compte (validation WEBDEV) : commande AJAX en tête, puis le
    // formulaire. WD_JSON_PROPRIETE_ reste AUSSI dans le formulaire.
    const body: [string, string][] = [];
    body.push(["WD_ACTION_", "AJAXPAGE"]);
    body.push(["EXECUTE", "16"]);
    body.push(["WD_CONTEXTE_", SEARCH_BUTTON]);
    body.push([
      "WD_JSON_PROPRIETE_",
      hiddenFields(this.#catalogueHtml).WD_JSON_PROPRIETE_,
    ]);
    body.push(["WD_BUTTON_CLICK_", ""]);
    for (const [k, v] of pairs) {
      if (["WD_ACTION_", "WD_BUTTON_CLICK_", "EXECUTE", "WD_CONTEXTE_"].includes(k)) {
        continue;
      }
      body.push([k, v]);
    }

    const html = await this.#post(this.#catalogueUrl, body);
    if (/La session n'existe plus|ne comporte pas les bons paramètres/.test(html)) {
      throw new Error("LAHIANI: recherche rejetée (session/paramètres)");
    }

    const wanted = reference ? normSku(reference) : "";
    const out: NormalizedPart[] = [];
    // Dédup sur une clé COMPOSITE : un même fournisseur peut référencer
    // plusieurs articles distincts sous la même référence (marque,
    // désignation et prix différents) — ils doivent tous remonter.
    const seen = new Set<string>();
    for (const row of parseResults(html)) {
      const sku = normSku(row.reference);
      if (!sku) continue;
      if (wanted && referenceMode === "exact" && sku !== wanted) continue;
      if (wanted && referenceMode === "starts" && !sku.startsWith(wanted)) {
        continue;
      }
      const dedupeKey = [
        sku,
        row.marque.trim().toUpperCase(),
        row.designation.trim().toUpperCase(),
        row.prix.trim(),
      ].join("|");
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push({
        reference: row.reference,
        designation: row.designation,
        marque: row.marque,
        fournisseur: this.name,
        disponibilite: row.disponibilite,
        prix: toNumber(row.prix),
        devise: "TND",
        delai:
          row.disponibilite === "en_arrivage"
            ? "en cours d'arrivage"
            : row.disponibilite === "indisponible"
            ? "indisponible"
            : "",
        // Pas d'URL de fiche partageable (jetons liés à la session) :
        // « Commander » ouvre le portail B2B Lahiani.
        lien_produit: this.#resolve(APP),
      });
    }
    return out;
  }
}
