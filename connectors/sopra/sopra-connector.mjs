import { login, openCatalogue, formAction, hiddenFields, post, BASE } from "./_webdev.mjs";
import { buildFormBody } from "./_form.mjs";
import { parseResults } from "./results_parse.mjs";

const FOURNISSEUR = "SOPRA";

function toNumber(v) {
  if (!v) return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const DELAI = {
  disponible: "",
  en_arrivage: "en cours d'arrivage",
  indisponible: "indisponible",
};

export class SopraClient {
  constructor() {
    this.loggedIn = false;
  }

  async connect() {
    const res = await login();
    if (res.status !== 200 || !res.html.includes("PAGE_ACCUEILB2B")) {
      throw new Error(`SOPRA login failed (status ${res.status})`);
    }
    this.loggedIn = true;
    this._accueil = res.html;
  }

  async #catalogue() {
    if (!this.loggedIn) throw new Error("not connected");
    const cat = await openCatalogue(this._accueil);
    if (!cat.html.includes("PAGE_CATALOGUEARTICLES")) throw new Error("catalogue page not reached");
    return cat;
  }

  // Recherche « comme sur le site », recette AJAX validée en live :
  // POST AJAXPAGE (EXECUTE=16, WD_CONTEXTE_=M116) sur le token courant avec
  // M69=ref, M68="%désignation%", M215=1 quand référence « commence par ».
  async searchQuery({ reference = "", designation = "", referenceMode = "exact" } = {}) {
    const cat = await this.#catalogue();
    const url = new URL(formAction(cat.html), BASE).href;
    const pairs = buildFormBody(cat.html);
    const set = (name, value) => {
      const f = pairs.find((p) => p[0] === name);
      if (f) f[1] = value;
      else pairs.push([name, value]);
    };
    for (const x of pairs) if (["M215", "M217", "M213"].includes(x[0])) x[1] = "";
    if (referenceMode === "starts") set("M215", "1");
    set("M69", reference);
    set("M68", designation.trim() ? `%${designation.trim()}%` : "");
    set("M62", "1");
    set("M95", "1");
    set("M189", "");
    set("M190", "");

    // L'ordre compte (validation WEBDEV) : commande AJAX en tête, puis le
    // formulaire. WD_JSON_PROPRIETE_ reste AUSSI dans le formulaire (champ
    // hidden du <form>), comme dans la vraie requête du navigateur — le
    // retirer du formulaire fait échouer la commande AJAX.
    const page = pairs.filter(
      (p) => !["WD_ACTION_", "WD_BUTTON_CLICK_", "EXECUTE", "WD_CONTEXTE_"].includes(p[0]),
    );
    const body = new URLSearchParams();
    body.append("WD_ACTION_", "AJAXPAGE");
    body.append("EXECUTE", "16");
    body.append("WD_CONTEXTE_", "M116");
    body.append("WD_JSON_PROPRIETE_", hiddenFields(cat.html).WD_JSON_PROPRIETE_ ?? '{"m_oProprietesSecurisees":{}}');
    body.append("WD_BUTTON_CLICK_", "");
    for (const [k, v] of page) body.append(k, v);

    const res = await post(url, body);
    if (/La session n'existe plus|ne comporte pas les bons paramètres/.test(res.html)) {
      throw new Error("SOPRA search failed: commande AJAX rejetée (session/paramètres)");
    }
    return this.normalize(res.html, cat.html);
  }

  normalize(html, catalogueHtml) {
    const { rows } = parseResults(html);
    const lien = formAction(catalogueHtml);
    return rows.map((r) => ({
      reference: r.reference,
      designation: r.designation,
      marque: r.marque,
      fournisseur: FOURNISSEUR,
      disponibilite: r.disponibilite,
      prix: toNumber(r.prix),
      devise: "TND",
      delai: DELAI[r.disponibilite] ?? "",
      lien_produit: lien ? new URL(lien, BASE).href : BASE,
    }));
  }
}

if (process.argv[1]?.endsWith("sopra-connector.mjs")) {
  const client = new SopraClient();
  await client.connect();
  const args = process.argv.slice(2);
  const opt = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : "";
  };
  const ref = opt("--ref");
  const designation = opt("--des");
  const starts = args.includes("--starts");
  const results = await client.searchQuery({ reference: ref, designation, referenceMode: starts ? "starts" : "exact" });
  console.log(`searchQuery(ref="${ref}", designation="${designation}", ${starts ? "starts" : "exact"}) -> ${results.length} résultat(s)`);
  for (const r of results.slice(0, 12)) console.log(" ", JSON.stringify(r));
}