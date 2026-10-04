import { readFileSync } from "node:fs";

const env = readFileSync(new URL("./.env.test", import.meta.url), "utf8");
export const LOGIN = env.match(/^LAHIANIPA_LOGIN=(.*)$/m)[1].trim();
export const PASSWORD = env.match(/^LAHIANIPA_PASSWORD=(.*)$/m)[1].trim();
export const BASE = (
  env.match(/^LAHIANIPA_BASE_URL=(.*)$/m)?.[1] ?? "https://lahianipa.com"
).trim();

// Portail WEBDEV/PCSoft « LahianiB2B » (même famille que /sopraB2B).
export const APP = "/LahianiB2B";

const UA = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
};

const jar = new Map();

export function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function absorb(res) {
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const kv = sc.split(";")[0];
    const eq = kv.indexOf("=");
    if (eq > 0) jar.set(kv.slice(0, eq).trim(), kv.slice(eq + 1).trim());
  }
}

export async function get(path, extraHeaders = {}) {
  const headers = { ...UA, ...extraHeaders };
  const c = cookieHeader();
  if (c) headers.cookie = c;
  const res = await fetch(new URL(path, BASE).href, {
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  absorb(res);
  return { status: res.status, location: res.headers.get("location"), html: await res.text() };
}

export async function post(url, fields) {
  const headers = { ...UA, "content-type": "application/x-www-form-urlencoded" };
  const c = cookieHeader();
  if (c) headers.cookie = c;
  const body = new URLSearchParams();
  for (const [k, v] of fields) body.append(k, v);
  const res = await fetch(url.startsWith("http") ? url : new URL(url, BASE).href, {
    method: "POST",
    headers,
    redirect: "manual",
    body: body.toString(),
    signal: AbortSignal.timeout(60000),
  });
  absorb(res);
  return { status: res.status, location: res.headers.get("location"), html: await res.text() };
}

export function formAction(html) {
  return html.match(/<form[^>]*action=["']([^"']+)["']/i)?.[1];
}

export function hiddenFields(html) {
  const fields = {};
  const prio = html.match(
    /<input[^>]*name=["']WD_JSON_PROPRIETE_["'][^>]*value=["']([^"']*)["']/i,
  )?.[1];
  fields.WD_JSON_PROPRIETE_ = prio
    ? prio.replaceAll("&quot;", '"')
    : '{"m_oProprietesSecurisees":{}}';
  return fields;
}

function decodeAttr(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

// Reproduit le corps du vrai <form> (cases cochées + champs dupliqués
// préservés), comme le navigateur lors d'un .submit() complet.
export function collectFormFields(html) {
  const region = html.match(/<form\b[^>]*>([\s\S]*?)<\/form>/i)?.[1] ?? html;
  const fields = [];
  for (const m of region.matchAll(/<input\b([^>]*)>/gi)) {
    const attrs = m[1];
    const name = attrs.match(/\bname=["']([^"']+)["']/i)?.[1];
    if (!name) continue;
    const type = (attrs.match(/\btype=["']([^"']+)["']/i)?.[1] ?? "text").toLowerCase();
    const value = () => decodeAttr(attrs.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "");
    if (type === "checkbox" || type === "radio") {
      if (/\bchecked\b/i.test(attrs)) fields.push([name, value() || "1"]);
      continue;
    }
    if (["submit", "button", "reset", "image", "file"].includes(type)) continue;
    fields.push([name, value()]);
  }
  for (const m of region.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const name = m[1].match(/\bname=["']([^"']+)["']/i)?.[1];
    if (!name) continue;
    const opts = [...m[2].matchAll(/<option\b([^>]*)>/gi)];
    const sel = opts.find((o) => /\bselected\b/i.test(o[1]));
    const val = sel
      ? (sel[1].match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "")
      : (opts[0]?.[1].match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "");
    fields.push([name, val.replaceAll("&amp;", "&")]);
  }
  return fields;
}

export function setField(fields, name, value) {
  const f = fields.find((x) => x[0] === name);
  if (f) f[1] = value;
  else fields.push([name, value]);
}
