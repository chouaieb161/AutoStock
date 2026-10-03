// Connecteur SOPRA (soprab2b.tn) — portage Deno du connecteur Node testé.
//
// Site = application WEBDEV/PCSoft : POST formulaire avec champs de session
// (WD_JSON_PROPRIETE_, WD_BUTTON_CLICK_, WD_ACTION_), jeton d'action dans
// l'URL (/sopraB2B/PAGE_<...>/<token>).
//
// Recherche « comme sur le site », recette AJAX validée en live : POST
// AJAXPAGE (EXECUTE=16, WD_CONTEXTE_=M116) sur le token courant avec
// M69=référence, M68="%désignation%", M215=1 quand la référence doit
// « commencer par » la saisie. L'ordre des champs de commande en tête du
// corps est significatif. Aucune action d'achat — lecture seule.
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
  // Repli : sépare sur les virgules qui précèdent un " name=" de cookie.
  return raw.split(/,(?=\s*[A-Za-z0-9_.-]+=)/);
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
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
  // La réponse AJAX (WD_ACTION_=AJAXPAGE) ne remplit pas le compteur
  // M76_OCC (valeur 0) alors que les lignes zrl_<n>_M104 sont rendues :
  // on itère donc sur les n présents dans le HTML, jamais sur le compteur.
  const occ = Number(html.match(/name="_?M76_OCC" value="(\d+)"/)?.[1] ?? 0);
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

export class SopraConnector {
  readonly code = "SOP";
  readonly name = "SOPRA";
  #jar = new Map<string, string>();
  #accueilHtml = "";
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
    const home = await this.#fetch(this.#resolve("/sopraB2B"));
    const action1 = formAction(home.html);
    if (!action1) throw new Error("SOPRA: form d'accueil introuvable");

    const loginPage = await this.#fetch(this.#resolve(action1 + "?A6"));
    const action2 = formAction(loginPage.html);
    if (!action2) throw new Error("SOPRA: form de connexion introuvable");

    const html = await this.#post(this.#resolve(action2), [
      ...(Object.entries(hiddenFields(loginPage.html)) as [string, string][]),
      ["WD_BUTTON_CLICK_", "A7"],
      ["WD_ACTION_", ""],
      ["A8", creds.login],
      ["A20", creds.password],
      ["A5", ""],
    ]);

    if (!html.includes("PAGE_ACCUEILB2B")) {
      throw new Error("SOPRA: connexion refusée (identifiants invalides)");
    }
    this.#accueilHtml = html;
    return html;
  }

  async #catalogue(): Promise<string> {
    if (!this.#accueilHtml) throw new Error("SOPRA: session non connectée");
    const accueilAction = formAction(this.#accueilHtml);
    if (!accueilAction) throw new Error("SOPRA: action accueil introuvable");

    const html = await this.#post(this.#resolve(accueilAction), [
      ...(Object.entries(hiddenFields(this.#accueilHtml)) as [
        string,
        string,
      ][]),
      ["WD_BUTTON_CLICK_", "A55"],
      ["WD_ACTION_", ""],
      ["A7", ""],
      ["A10", ""],
      ["A4", ""],
      ["A13", ""],
    ]);

    if (!html.includes("PAGE_CATALOGUEARTICLES")) {
      throw new Error("SOPRA: page catalogue non atteinte");
    }

    const catalogueAction = formAction(html);
    if (!catalogueAction) throw new Error("SOPRA: action catalogue introuvable");
    this.#catalogueUrl = this.#resolve(catalogueAction);
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
    const catalogueHtml = await this.#catalogue();

    const reference = (query.reference ?? "").trim();
    const designation = (query.designation ?? "").trim();
    const referenceMode = query.referenceMode ?? "exact";

    const pairs = buildFormBody(catalogueHtml);
    const set = (name: string, value: string) => {
      const found = pairs.find((p) => p[0] === name);
      if (found) found[1] = value;
      else pairs.push([name, value]);
    };
    for (const x of pairs) if (["M215", "M217", "M213"].includes(x[0])) x[1] = "";
    if (referenceMode === "starts") set("M215", "1");
    set("M69", reference);
    set("M68", designation ? `%${designation}%` : "");
    set("M62", "1");
    set("M95", "1");
    set("M189", "");
    set("M190", "");

    // L'ordre compte (validation WEBDEV) : commande AJAX en tête
    // (WD_ACTION_, EXECUTE, WD_CONTEXTE_, WD_JSON_PROPRIETE_,
    // WD_BUTTON_CLICK_ vide), puis le formulaire. WD_JSON_PROPRIETE_ reste
    // AUSSI dans le formulaire (champ hidden), comme dans la vraie requête
    // du navigateur — le retirer fait échouer la commande AJAX.
    const body: [string, string][] = [];
    body.push(["WD_ACTION_", "AJAXPAGE"]);
    body.push(["EXECUTE", "16"]);
    body.push(["WD_CONTEXTE_", "M116"]);
    body.push([
      "WD_JSON_PROPRIETE_",
      hiddenFields(catalogueHtml).WD_JSON_PROPRIETE_,
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
      throw new Error("SOPRA: recherche rejetée (session/paramètres)");
    }

    return parseResults(html)
      .filter((row) => row.reference)
      .map((row) => ({
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
        // Pas d'URL de fiche partageable sur soprab2b.tn (jetons liés à la
        // session navigateur) : « Commander » ouvre le site d'entrée.
        lien_produit: this.baseUrl,
      }));
  }
}
