import { api, BASE } from "./_net.mjs";
import { login } from "./_auth.mjs";

const FOURNISSEUR = "FADPRO";
const MAX_RESULTS = 300;

const normSku = (s) => String(s ?? "").replace(/\s+/g, "").toUpperCase();

// `dispo` renvoyé par l'API FADPRO : "S" = en stock, "A" = arrivage,
// ""/null = aucun stock exploitable.
function availability(dispo) {
  if (dispo === "S") return "disponible";
  if (dispo === "A") return "en_arrivage";
  return "indisponible";
}

export class FadproClient {
  constructor() {
    this.token = "";
    this.loggedIn = false;
  }

  async connect() {
    const a = await login();
    this.token = a.token;
    this.loggedIn = true;
    return a;
  }

  // Recherche via l'API métier :
  //   GET /fad/api/b2b/search?refFour=&marque=&designation=
  // puis filtrage côté connecteur :
  //   exact  -> refFour strictement égal à la référence
  //   starts -> refFour commençant par la référence
  //   (désignation seule -> toutes les lignes renvoyées)
  async searchQuery({
    reference = "",
    designation = "",
    marque = "",
    referenceMode = "exact",
  } = {}) {
    if (!this.loggedIn) await this.connect();

    const ref = reference.trim();
    const des = designation.trim();
    const brand = marque.trim();
    if (!ref && !des) return [];

    const params = new URLSearchParams();
    if (ref) params.set("refFour", ref);
    if (brand) params.set("marque", brand);
    if (des) params.set("designation", des);

    const res = await api(`/api/b2b/search?${params.toString()}`, {
      token: this.token,
    });
    // Aucun résultat : l'API répond 404 avec un texte brut, pas du JSON.
    if (res.status === 404 && /Aucun article/i.test(res.text)) return [];
    if (res.status !== 200) {
      throw new Error(`FADPRO: recherche refusée (HTTP ${res.status})`);
    }

    const raw = Array.isArray(res.json) ? res.json : [];
    const wanted = ref ? normSku(ref) : "";
    const rows = [];
    const seen = new Set();

    for (const r of raw) {
      const sku = normSku(r.refFour);
      if (!sku || seen.has(sku)) continue;
      if (wanted && referenceMode === "exact" && sku !== wanted) continue;
      if (wanted && referenceMode === "starts" && !sku.startsWith(wanted)) {
        continue;
      }
      seen.add(sku);

      const disponibilite = availability(r.dispo);
      rows.push({
        reference: r.refFour,
        designation: r.designation || "",
        marque: r.itemNomFpur || r.marque || "",
        fournisseur: FOURNISSEUR,
        disponibilite,
        prix: typeof r.prix === "number" ? r.prix : null,
        devise: "TND",
        delai:
          disponibilite === "en_arrivage"
            ? "en cours d'arrivage"
            : disponibilite === "indisponible"
            ? "indisponible"
            : "",
        // Pas d'URL de fiche stable (détail produit ouvert dans une boîte de
        // dialogue SPA) : « Commander » ouvre le site d'entrée.
        lien_produit: BASE,
      });
      if (rows.length >= MAX_RESULTS) break;
    }
    return rows;
  }
}

if (process.argv[1]?.endsWith("fadpro-connector.mjs")) {
  const client = new FadproClient();
  await client.connect();
  const args = process.argv.slice(2);
  const opt = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : "";
  };
  const ref = opt("--ref");
  const designation = opt("--des");
  const marque = opt("--marque");
  const starts = args.includes("--starts");
  const results = await client.searchQuery({
    reference: ref,
    designation,
    marque,
    referenceMode: starts ? "starts" : "exact",
  });
  console.log(
    `searchQuery(ref="${ref}", designation="${designation}", marque="${marque}", ${
      starts ? "starts" : "exact"
    }) -> ${results.length} résultat(s)`,
  );
  for (const r of results.slice(0, 12)) console.log(" ", JSON.stringify(r));
}
