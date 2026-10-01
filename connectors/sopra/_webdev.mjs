import { readFileSync } from "node:fs";

const env = readFileSync(new URL("./.env.test", import.meta.url), "utf8");
export const LOGIN = env.match(/^SOPRA_LOGIN=(.*)$/m)[1];
export const PASSWORD = env.match(/^SOPRA_PASSWORD=(.*)$/m)[1];
export const BASE = "https://soprab2b.tn";

const UA = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
};
const jar = new Map();

export function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export async function get(path, extraHeaders = {}) {
  const headers = { ...UA, ...extraHeaders };
  const c = cookieHeader();
  if (c) headers.cookie = c;
  const res = await fetch(new URL(path, BASE).href, { headers, redirect: "manual", signal: AbortSignal.timeout(30000) });
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const kv = sc.split(";")[0];
    const eq = kv.indexOf("=");
    if (eq > 0) jar.set(kv.slice(0, eq).trim(), kv.slice(eq + 1).trim());
  }
  return { status: res.status, location: res.headers.get("location"), html: await res.text() };
}

export async function post(url, fields) {
  const headers = { ...UA, "content-type": "application/x-www-form-urlencoded" };
  const c = cookieHeader();
  if (c) headers.cookie = c;
  const res = await fetch(url.startsWith("http") ? url : new URL(url, BASE).href, {
    method: "POST",
    headers,
    redirect: "manual",
    body: new URLSearchParams(fields).toString(),
    signal: AbortSignal.timeout(30000),
  });
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const kv = sc.split(";")[0];
    const eq = kv.indexOf("=");
    if (eq > 0) jar.set(kv.slice(0, eq).trim(), kv.slice(eq + 1).trim());
  }
  return { status: res.status, location: res.headers.get("location"), html: await res.text() };
}

export function formAction(html) {
  return html.match(/<form[^>]*action=["']([^"']+)["']/i)?.[1];
}

export function hiddenFields(html) {
  const fields = {};
  const prio = html.match(/<input[^>]*name=["']WD_JSON_PROPRIETE_["'][^>]*value=["']([^"']*)["']/i)?.[1];
  fields.WD_JSON_PROPRIETE_ = prio ? prio.replaceAll("&quot;", '"') : '{"m_oProprietesSecurisees":{}}';
  return fields;
}

export function collectFormFields(html) {
  const fields = [];
  const seen = new Set();
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = m[0];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    if (!name || seen.has(name)) continue;
    const type = (tag.match(/\btype=["']([^"']+)["']/i)?.[1] ?? "text").toLowerCase();
    if (type === "checkbox" || type === "radio") continue;
    let value = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "";
    value = value.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&#39;", "'");
    seen.add(name);
    fields.push({ name, value });
  }
  for (const m of html.matchAll(/<(?:select|textarea)\b[^>]*name=["']([^"']+)["'][^>]*>/gi)) {
    if (!seen.has(m[1])) { seen.add(m[1]); fields.push({ name: m[1], value: "" }); }
  }
  return fields;
}

export function setField(fields, name, value) {
  const f = fields.find((x) => x.name === name);
  if (f) f.value = value;
  else fields.push({ name, value });
}

export function textOf(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
}

export async function login() {
  const a1 = await get("/sopraB2B");
  const action1 = formAction(a1.html);
  const loginPage = await get(new URL(action1, BASE).href + "?A6");
  const action2 = formAction(loginPage.html);
  const res = await post(new URL(action2, BASE).href, {
    ...hiddenFields(loginPage.html),
    WD_BUTTON_CLICK_: "A7",
    WD_ACTION_: "",
    A8: LOGIN,
    A20: PASSWORD,
    A5: "",
  });
  return res;
}

export async function openCatalogue(afterLoginHtml) {
  const action = formAction(afterLoginHtml);
  const res = await post(new URL(action, BASE).href, {
    ...hiddenFields(afterLoginHtml),
    WD_BUTTON_CLICK_: "A55",
    WD_ACTION_: "",
    A7: "",
    A10: "",
    A4: "",
    A13: "",
  });
  return res;
}