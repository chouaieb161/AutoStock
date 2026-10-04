import {
  APP,
  BASE,
  collectFormFields,
  formAction,
  hiddenFields,
  post,
  setField,
} from "./_net.mjs";
import { login } from "./_auth.mjs";
import { parseResults } from "./results_parse.mjs";

const FOURNISSEUR = "LAHIANI";
const PORTAL = BASE.replace(/\/$/, "") + APP;

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

function normSku(v) {
  return String(v ?? "").replace(/\s+/g, "").toUpperCase();
}

export class LahianipaClient {
  constructor() {
    this.loggedIn = false;
    this._cat = "";
    this._catUrl = "";
  }

  async connect() {
    const res = await login();
    if (res.status !== 200 || !res.html.includes("PAGE_CATALOGUEARTICLES")) {
      throw new Error(`LAHIANI login failed (status ${res.status})`);
    }
    this.loggedIn = true;
    this._cat = res.html;
    this._catUrl = new URL(formAction(res.html), BASE).href;
  }

  // Recherche « comme sur le site », recette AJAX validée en live :
  // POST AJAXPAGE (EXECUTE=16, WD_CONTEXTE_=M172 « Rechercher ») sur le token
  // courant avec M68=référence, M69="%désignation%", M189/M190 vides.
  async searchQuery({ reference = "", designation = "", referenceMode = "exact" } = {}) {
    if (!this.loggedIn) throw new Error("not connected");

    const fields = collectFormFields(this._cat);
    setField(fields, "M68", reference);
    setField(fields, "M69", designation.trim() ? `%${designation.trim()}%` : "");
    setField(fields, "M189", "");
    setField(fields, "M190", "");

    // L'ordre compte (validation WEBDEV) : commande AJAX en tête, puis le
    // formulaire. WD_JSON_PROPRIETE_ reste AUSSI dans le formulaire.
    const body = [
      ["WD_ACTION_", "AJAXPAGE"],
      ["EXECUTE", "16"],
      ["WD_CONTEXTE_", "M172"],
      ["WD_JSON_PROPRIETE_", hiddenFields(this._cat).WD_JSON_PROPRIETE_],
      ["WD_BUTTON_CLICK_", ""],
    ];
    for (const [k, v] of fields) {
      if (["WD_ACTION_", "WD_BUTTON_CLICK_", "EXECUTE", "WD_CONTEXTE_"].includes(k)) continue;
      body.push([k, v]);
    }

    const res = await post(this._catUrl, body);
    if (/La session n'existe plus|ne comporte pas les bons paramètres/.test(res.html)) {
      throw new Error("LAHIANI search failed: commande AJAX rejetée (session/paramètres)");
    }
    return this.normalize(res.html, { reference, referenceMode });
  }

  normalize(html, { reference = "", referenceMode = "exact" } = {}) {
    const { rows } = parseResults(html);
    const wanted = reference ? normSku(reference) : "";
    const out = [];
    // Dédup sur une clé COMPOSITE : un même fournisseur peut référencer
    // plusieurs articles distincts sous la même référence (marque,
    // désignation et prix différents) — ils doivent tous remonter.
    const seen = new Set();
    for (const r of rows) {
      const sku = normSku(r.reference);
      if (!sku) continue;
      if (wanted && referenceMode === "exact" && sku !== wanted) continue;
      if (wanted && referenceMode === "starts" && !sku.startsWith(wanted)) continue;
      const dedupeKey = [
        sku,
        r.marque.trim().toUpperCase(),
        r.designation.trim().toUpperCase(),
        r.prix.trim(),
      ].join("|");
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push({
        reference: r.reference,
        designation: r.designation,
        marque: r.marque,
        fournisseur: FOURNISSEUR,
        disponibilite: r.disponibilite,
        prix: toNumber(r.prix),
        devise: "TND",
        delai: DELAI[r.disponibilite] ?? "",
        // Pas d'URL de fiche partageable (jetons liés à la session) : on ouvre
        // le portail B2B Lahiani.
        lien_produit: PORTAL,
      });
    }
    return out;
  }
}

if (process.argv[1]?.endsWith("lahianipa-connector.mjs")) {
  const client = new LahianipaClient();
  await client.connect();
  const args = process.argv.slice(2);
  const opt = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : "";
  };
  const ref = opt("--ref");
  const des = opt("--des");
  const starts = args.includes("--starts");
  const results = await client.searchQuery({
    reference: ref,
    designation: des,
    referenceMode: starts ? "starts" : "exact",
  });
  console.log(
    `searchQuery(ref="${ref}", des="${des}", ${starts ? "starts" : "exact"}) -> ${results.length} résultat(s)`,
  );
  for (const r of results.slice(0, 12)) console.log(" ", JSON.stringify(r));
}
