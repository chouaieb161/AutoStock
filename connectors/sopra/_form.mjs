import { readFileSync } from "node:fs";

export function formRegion(html) {
  const m = html.match(/<form\b[^>]*>([\s\S]*?)<\/form>/i);
  return m ? m[1] : html;
}

export function buildFormBody(html) {
  const region = formRegion(html);
  const pairs = [];
  let m;
  const inputRe = /<input\b([^>]*)>/gi;
  while ((m = inputRe.exec(region))) {
    const attrs = m[1];
    const name = attrs.match(/\bname=["']([^"']+)["']/i)?.[1];
    if (!name) continue;
    const type = (attrs.match(/\btype=["']([^"']+)["']/i)?.[1] ?? "text").toLowerCase();
    const readValue = () => (attrs.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "").replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
    if (type === "checkbox" || type === "radio") {
      if (/\bchecked\b/i.test(attrs)) pairs.push([name, readValue() || "1"]);
      continue;
    }
    if (type === "submit" || type === "button" || type === "reset" || type === "image" || type === "file") continue;
    pairs.push([name, readValue()]);
  }
  const selRe = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
  while ((m = selRe.exec(region))) {
    const name = m[1].match(/\bname=["']([^"']+)["']/i)?.[1];
    if (!name) continue;
    const opts = [...m[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)];
    const sel = opts.find((o) => /\bselected\b/i.test(o[1]));
    const val = sel ? (sel[1].match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "") : (opts[0]?.[1].match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "");
    pairs.push([name, val.replaceAll("&amp;", "&")]);
  }
  const taRe = /<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi;
  while ((m = taRe.exec(region))) {
    const name = m[1].match(/\bname=["']([^"']+)["']/i)?.[1];
    if (name) pairs.push([name, m[2].replace(/<[^>]*>/g, "")]);
  }
  return pairs;
}

if (process.argv[1]?.replace(/\\/g, "/") && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  if (!process.argv[2]) {
    console.error("usage: node _form.mjs <page_html_file>");
    process.exit(2);
  }
  const h = readFileSync(process.argv[2], "utf8");
  const pairs = buildFormBody(h);
  console.log("field count:", pairs.length);
  const names = pairs.map((p) => p[0]);
  console.log("names:", [...new Set(names)].join(","));
  console.log("dup names:", names.filter((n, i) => names.indexOf(n) !== i).join(","));
  for (const n of ["WD_BUTTON_CLICK_", "WD_ACTION_", "WD_JSON_PROPRIETE_", "M215", "M217", "M189", "M52"]) {
    console.log(`  ${n}:`, pairs.filter((p) => p[0] === n).map((p) => JSON.stringify(p[1])).join(" | "));
  }
}