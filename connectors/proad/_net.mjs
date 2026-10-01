import { readFileSync } from "node:fs";

const env = readFileSync(new URL("./.env.test", import.meta.url), "utf8");
export const LOGIN = env.match(/^PROAD_LOGIN=(.*)$/m)[1];
export const PASSWORD = env.match(/^PROAD_PASSWORD=(.*)$/m)[1];
export const BASE = env.match(/^PROAD_BASE_URL=(.*)$/m)[1] ?? "https://pro.ad-tunisie.com";

const UA = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
};
const jar = new Map();

export function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export function setCookies(res) {
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const kv = sc.split(";")[0];
    const eq = kv.indexOf("=");
    if (eq > 0) jar.set(kv.slice(0, eq).trim(), kv.slice(eq + 1).trim());
  }
}

// fetch avec suivi manuel + 1 hop de redirect (ne suit pas les boucles)
export async function get(path, extraHeaders = {}, redirects = 3) {
  const headers = { ...UA, ...extraHeaders };
  const c = cookieHeader();
  if (c) headers.cookie = c;
  const res = await fetch(new URL(path, BASE).href, {
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  setCookies(res);
  if (
    res.status >= 300 &&
    res.status < 400 &&
    res.headers.get("location") &&
    redirects > 0
  ) {
    const loc = res.headers.get("location");
    const next = loc.startsWith("http") ? loc : new URL(loc, BASE).href;
    return get(next, extraHeaders, redirects - 1);
  }
  return { status: res.status, location: res.headers.get("location"), html: await res.text(), headers: res.headers };
}

export async function post(path, form, extraHeaders = {}) {
  const headers = {
    ...UA,
    "content-type": "application/x-www-form-urlencoded",
    ...extraHeaders,
  };
  const c = cookieHeader();
  if (c) headers.cookie = c;
  const res = await fetch(new URL(path, BASE).href, {
    method: "POST",
    headers,
    redirect: "manual",
    body:
      typeof form === "string" ? form : new URLSearchParams(form).toString(),
    signal: AbortSignal.timeout(30000),
  });
  setCookies(res);
  return { status: res.status, location: res.headers.get("location"), html: await res.text(), headers: res.headers };
}

export function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}