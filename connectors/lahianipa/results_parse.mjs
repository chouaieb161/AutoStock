import { readFileSync } from "node:fs";

// Indicateurs de disponibilité (plans WEBDEV) — mêmes numéros que SOPRA,
// l'application LahianiB2B étant le même modèle PCSoft.
const AVAIL = { 1: "disponible", 2: "indisponible", 3: "en_arrivage" };

export function parseResults(html) {
  // La réponse AJAX ne remplit pas forcément le compteur M76_OCC : on itère
  // sur les n présents dans le HTML (id="zrl_<n>_M104"), jamais sur le compteur.
  const occ = Number(html.match(/name="_?M76_OCC" value="(\d+)"/)?.[1] ?? 0);
  const rows = [];
  const posOf = (n) => html.indexOf(`id="zrl_${n}_M104"`);
  const present = [
    ...new Set(
      [...html.matchAll(/id="zrl_(\d+)_M104"/g)].map((m) => Number(m[1])),
    ),
  ].sort((a, b) => a - b);
  for (const n of present) {
    const start = posOf(n);
    if (start < 0) continue;
    const next = posOf(n + 1);
    const slice = html.slice(start, next > start ? next : start + 30000);

    const raw =
      html.match(new RegExp(`id="zrl_${n}_M104">([^<]*)<`))?.[1]?.trim() ?? "";
    const mRef = raw.match(/^(.*?)\s*-\s*R[ée]f\s*:\s*(.+)$/);
    const marque = mRef ? mRef[1].trim() : raw;
    const reference = mRef ? mRef[2].trim() : "";

    const designation = (
      html.match(new RegExp(`id="zrl_${n}_M77">([^<]*)<`))?.[1] ?? ""
    )
      .replace(/\s+/g, " ")
      .trim();
    const prix =
      html.match(new RegExp(`name="zrl_${n}_M72"[^>]*value="([^"]*)"`, "i"))?.[1] ??
      "";
    const qteTag =
      slice.match(new RegExp(`<input[^>]*name="zrl_${n}_M91"[^>]*>`, "i"))?.[0] ??
      "";
    const quantite = qteTag.match(/value="([^"]*)"/i)?.[1] ?? "";

    const activePlan = slice.match(
      /class="[^"]*wbActif[^"]*wbPlanNumero(\d)[^"]*"/,
    );
    const disponibilite = activePlan
      ? (AVAIL[activePlan[1]] ?? `plan${activePlan[1]}`)
      : "";

    rows.push({ n, marque, reference, designation, prix, quantite, disponibilite });
  }
  return { occ, rows };
}

if (process.argv[1]?.endsWith("results_parse.mjs")) {
  if (!process.argv[2]) {
    console.error("usage: node results_parse.mjs <resultats_html_file>");
    process.exit(2);
  }
  const h = readFileSync(process.argv[2], "utf8");
  const { occ, rows } = parseResults(h);
  console.log("M76_OCC =", occ, "rows =", rows.length);
  for (const r of rows) {
    console.log(
      `  #${r.n} ${r.reference} | ${r.marque} | ${r.designation.slice(0, 40)} | prix=${r.prix} | qte=${r.quantite} | ${r.disponibilite}`,
    );
  }
}
