import { get, post, LOGIN, PASSWORD } from "./_net.mjs";

// Login Magento : GET / -> récupère form_key + action loginPost, POST creds.
// Renvoie { ok, html } ; ok=false si la session n'est pas établie.
export async function login() {
  const r = await get("/");
  const action = r.html.match(
    /<form[^>]*action=["']([^"']*customer\/account\/loginPost[^"']*)["']/i,
  )?.[1];
  const formHtml = r.html.match(
    /<form[^>]*action=["']([^"']*loginPost[^"']*)["'][^>]*>[\s\S]*?<\/form>/i,
  )?.[0];
  const inputs = [...(formHtml ?? "").matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)].map((m) => m[0]);
  if (!action) return { ok: false, reason: "login form absent" };

  const body = new URLSearchParams();
  for (const i of inputs) {
    const name = i.match(/\bname=["']([^"']+)["']/i)?.[1];
    if (!name) continue;
    const value = i.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "";
    if (name === "login[username]") continue;
    if (name === "login[password]") continue;
    body.append(name, value);
  }
  body.append("login[username]", LOGIN);
  body.append("login[password]", PASSWORD);

  // premier stress : on le suit en GET (loginPost répond 302)
  const lr = await post(action, body);
  if (lr.status >= 300 && lr.location) {
    const dest = await get(lr.location);
    return { ok: dest.status === 200, html: dest.html };
  }
  return { ok: false, html: lr.html };
}

export async function ensureLogin() {
  const a = await login();
  if (!a.ok) throw new Error("login AD échoué");
  return a;
}