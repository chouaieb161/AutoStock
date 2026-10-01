import { readFileSync } from "node:fs";

const STOCK = { available: "disponible" };

export const normSku = (s) =>
  String(s ?? "").replace(/\s+/g, "").toUpperCase();

export function parseResults(html) {
  const items = [
    ...html.matchAll(
      /<li\b[^>]*class="[^"]*\bproduct[^"]*\bproduct-item[^"]*"[^>]*>([\s\S]*?)<\/li>/g,
    ),
  ].map((m) => m[1]);

  const total =
    Number(
      html.match(
        /sur\s*<span\s+class="toolbar-number">(\d+)<\/span>/i,
      )?.[1] ?? items.length,
    ) || items.length;

  const rows = [];
  const seen = new Set();
  for (const it of items) {
    const sku = it.match(/data-product-sku="([^"]+)"/i)?.[1] ?? "";
    const key = normSku(sku);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const link =
      it.match(
        /class="[^"]*(?:product-item-link|product[^"]*photo)[^"]*"[^>]*href="([^"]+)"/i,
      )?.[1] ?? "";

    const refText =
      it.match(
        /class="[^"]*product-item-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
      )?.[1] ?? "";
    const reference = (refText.match(/R[eé]f\s*:\s*([^<\n]+)/i)?.[1] ?? sku)
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
    const disponibilite = STOCK[stockClass] ?? "indisponible";

    rows.push({
      sku: key,
      reference,
      designation,
      prix,
      disponibilite,
      lien_produit: link,
    });
  }

  return { total, rows };
}

if (process.argv[1]?.endsWith("parse_results.mjs")) {
  if (!process.argv[2]) {
    console.error("usage: node parse_results.mjs <resultats_html_file>");
    process.exit(2);
  }
  const h = readFileSync(process.argv[2], "utf8");
  const { total, rows } = parseResults(h);
  console.log("total =", total, "rows =", rows.length);
  for (const r of rows)
    console.log(
      `  ${r.sku} | ${r.reference} | ${r.designation.slice(0, 40)} | prix=${r.prix} | ${r.disponibilite} | ${r.lien_produit.slice(0, 60)}`,
    );
}