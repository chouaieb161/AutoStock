import { get, BASE } from "./_net.mjs";
import { login } from "./_auth.mjs";
import { parseResults, normSku } from "./parse_results.mjs";

const FOURNISSEUR = "Autodistribution";

const MAX_PAGES = 5;

export class ProadClient {
  async connect() {
    const a = await login();
    if (!a.ok) throw new Error("AD login failed");
    this.loggedIn = true;
    return a;
  }

  // Recherche via le moteur Magento (GET /catalogsearch/result/?q=…), puis
  // filtrage côté connecteur selon le mode :
  //   exact  -> conserve les lignes dont le SKU est égal à la référence
  //   starts -> conserve les lignes dont le SKU commence par la référence
  //   (désignation seule -> toutes les lignes renvoyées par le site)
  async searchQuery({ reference = "", designation = "", referenceMode = "exact" } = {}) {
    if (!this.loggedIn) await this.connect();
    const query = reference.trim() || designation.trim();
    if (!query) return [];

    const search = [...(reference.trim() ? [reference.trim()] : []), ...(designation.trim() ? [designation.trim()] : [])].join(" ");
    const terms = encodeURIComponent(search).replace(/%20/g, "+");
    const wanted = reference.trim() ? normSku(reference) : "";

    const rows = [];
    const seen = new Set();
    let total = Infinity;

    for (let p = 1; p <= MAX_PAGES; p++) {
      const url = `/catalogsearch/result/?q=${terms}${p > 1 ? `&p=${p}` : ""}`;
      const res = await get(url);
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

      const pagesTotal = Math.max(Math.ceil(total / Math.max(page.rows.length, 1)), 1);
      if (p >= pagesTotal) break;
    }

    return rows.map((r) => ({
      reference: r.reference,
      designation: r.designation,
      marque: "",
      fournisseur: FOURNISSEUR,
      disponibilite: r.disponibilite,
      prix: r.prix,
      devise: "TND",
      delai: "",
      lien_produit: r.lien_produit || BASE,
    }));
  }
}

if (process.argv[1]?.endsWith("proad-connector.mjs")) {
  const client = new ProadClient();
  await client.connect();
  const args = process.argv.slice(2);
  const opt = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : "";
  };
  const ref = opt("--ref");
  const designation = opt("--des");
  const starts = args.includes("--starts");
  const results = await client.searchQuery({
    reference: ref,
    designation,
    referenceMode: starts ? "starts" : "exact",
  });
  console.log(
    `searchQuery(ref="${ref}", designation="${designation}", ${starts ? "starts" : "exact"}) -> ${results.length} résultat(s)`,
  );
  for (const r of results.slice(0, 12)) console.log(" ", JSON.stringify(r));
}