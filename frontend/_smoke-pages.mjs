import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(process.cwd());
const URL = "https://vioantpdofbulsiztopn.supabase.co";
const APP = "http://localhost:3000";
const COOKIE_NAME = "sb-vioantpdofbulsiztopn-auth-token";

const env = readFileSync(join(ROOT, ".env.local"), "utf8");
const anonKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(\S+)/)[1];
const keysRaw = readFileSync(
  join(ROOT, "..", "supabase", ".temp", "keys-raw.log"),
  "utf8",
);
const serviceKey = keysRaw.match(/^\s*service_role\s*\|\s*(\S+)/m)[1];

let failed = 0;
const ok = (l) => console.log("  PASS  " + l);
const ko = (l, e) => {
  console.log("  FAIL  " + l + (e ? " -> " + e : ""));
  failed++;
};

const anon = createClient(URL, anonKey);
const admin = createClient(URL, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const email = `smoke-pages-${stamp}@outlook.com`;
const PASSWORD = "SmokePages!2026";
let tenantId = null;
let userId = null;

const norm = (h) => h.replaceAll("<!-- -->", "").replaceAll("&amp;", "&");

try {
  // 1. create + confirm user via service role
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { shop_name: "Comptoir Smoke Pages", shop_city: "Tunis" },
  });
  if (!created?.user) {
    ko("createUser", "aucun utilisateur");
    process.exit(1);
  }
  userId = created.user.id;
  ok("compte temporaire créé");

  // 2. sign in as the user (anon client) -> session
  const { data: si, error: siErr } = await anon.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (siErr) {
    ko("signIn", siErr.message);
    process.exit(1);
  }
  const token = si.session.access_token;
  ok("signInWithPassword");

  // @supabase/ssr stores the session in the cookie as base64-<base64url(json)>
  const sessionJson = JSON.stringify({
    access_token: si.session.access_token,
    refresh_token: si.session.refresh_token,
    expires_at: si.session.expires_at,
    expires_in: si.session.expires_in,
    token_type: si.session.token_type,
    user: si.session.user,
  });
  const cookieVal = "base64-" + Buffer.from(sessionJson, "utf8").toString("base64url");

  const CONTENT = [
    "Bonjour Comptoir Smoke Pages",
    "Recherches récentes",
    "fournisseur",
  ];

  // 2b. first page load triggers auto-provision (getProfile -> RPC)
  const pre = await fetch(APP + "/recherche", {
    headers: { Cookie: `${COOKIE_NAME}=${cookieVal}` },
    redirect: "manual",
  });
  const preHtml = norm(await pre.text());
  const missingPre = CONTENT.filter((s) => !preHtml.includes(s));
  if (!pre.ok || pre.status >= 400 || missingPre.length > 0) {
    ko("GET /recherche (provision)", `status=${pre.status} manquants=${missingPre.join(",")}`);
    process.exit(1);
  }
  ok("première page -> provision + rendu");

  const { data: prof } = await anon
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (!prof) {
    ko("provision (profil)", "introuvable");
    process.exit(1);
  }
  tenantId = prof.tenant_id;
  ok(`tenant provisionné (${prof.role})`);

// 3. seed: 1 search_history, 1 cart item (GP), 1 linked supplier (GP)
  const { error: errSh } = await anon.from("search_history").insert({
    tenant_id: tenantId,
    user_id: userId,
    reference: "410602192R",
    marque: "Renault",
  });
  if (errSh) ko("seed search_history", errSh.message);
  const { data: sup, error: supErr } = await anon
    .from("suppliers")
    .select("id")
    .eq("code", "GP")
    .maybeSingle();
  if (supErr) ko("seed read GP", supErr.message);
  const { error: errCart } = await anon.from("tracking_cart_items").insert({
    tenant_id: tenantId,
    supplier_id: sup.id,
    reference: "410602192R",
    designation: "Jeu de 4 plaquettes de frein avant (smoke)",
    marque: "Renault Clio 4",
    prix_millimes: 48500,
    product_url: "https://gamaparts.example/p/410602192R",
    quantite: 2,
  });
  if (errCart) ko("seed cart item", errCart.message);
  const { error: errTs } = await anon.from("tenant_suppliers").insert({
    tenant_id: tenantId,
    supplier_id: sup.id,
    identifier: "client-pro-smoke",
    status: "connected",
  });
  if (errTs) ko("seed tenant_suppliers", errTs.message);
  ok("données de test injectées (historique + panier + fournisseur lié)");

  // 4. page requests with the session cookie
  const checks = [
    { path: "/recherche", expect: ["Bonjour Comptoir Smoke Pages", "410602192R"] },
    { path: "/fournisseurs", expect: ["1/11", "Connectés & Opérationnels", "SOTACAP", "Gamaparts"] },
    { path: "/panier", expect: ["plaquettes de frein avant (smoke)", "1 article"] },
    { path: "/resultats?ref=410602192R&marque=Renault", expect: ["Plaquettes de frein avant", "Meilleure Offre"] },
  ];

  for (const c of checks) {
    const res = await fetch(APP + c.path, {
      headers: { Cookie: `${COOKIE_NAME}=${cookieVal}` },
      redirect: "manual",
    });
const html = norm(await res.text());
    const missing = c.expect.filter((s) => !html.includes(s));
    if (!res.ok || res.status >= 400 || missing.length > 0) {
      if (missing.length > 0) {
        const file = join(ROOT, "_dbg-" + c.path.replace(/[^a-z0-9]/gi, "_") + ".html");
        writeFileSync(file, html);
        console.log("  >>> html dumped to " + file);
      }
      ko(`GET ${c.path}`, `status=${res.status} manquants=${missing.join(",")}`);
    } else {
      ok(`GET ${c.path} rendu (status ${res.status})`);
    }
  }
} catch (err) {
  ko("script", err.message);
} finally {
  console.log("[cleanup]");
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
    ok("utilisateur supprimé");
  }
  if (tenantId) {
    await admin.from("tenants").delete().eq("id", tenantId);
    ok("tenant supprimé");
  }
}

console.log(failed === 0 ? "RESULT: OK" : `RESULT: ${failed} échec(s)`);
process.exit(failed === 0 ? 0 : 1);
