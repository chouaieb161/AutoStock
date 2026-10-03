import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Smoke test E2E de l'etape 3 : /fournisseurs (formulaire de connexion
// reellement branche sur connect-supplier) et /resultats (appel reel de
// search-parts contre le site du grossiste).
//
// Le compte, le tenant et le secret Vault crees pour le test sont supprimes
// dans le bloc finally.

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

// Identifiants SOPRA reels : ils restent dans le fichier .env.test local,
// jamais dans le code ni dans la sortie du test.
const sopraCreds = readFileSync(
  join(ROOT, "..", "connectors", "sopra", ".env.test"),
  "utf8",
);
const SOPRA_LOGIN = sopraCreds.match(/^SOPRA_LOGIN=(.*)$/m)[1].trim();
const SOPRA_PASSWORD = sopraCreds.match(/^SOPRA_PASSWORD=(.*)$/m)[1].trim();

// Identifiants AD (pro.ad-tunisie.com), eux aussi locaux à .env.test.
const proadCreds = readFileSync(
  join(ROOT, "..", "connectors", "proad", ".env.test"),
  "utf8",
);
const PROAD_LOGIN = proadCreds.match(/^PROAD_LOGIN=(.*)$/m)[1].trim();
const PROAD_PASSWORD = proadCreds.match(/^PROAD_PASSWORD=(.*)$/m)[1].trim();

let failed = 0;
const ok = (l) => console.log("  PASS  " + l);
const ko = (l, e) => {
  console.log("  FAIL  " + l + (e ? " -> " + e : ""));
  failed++;
};

const anon = createClient(URL, anonKey, {
  auth: { persistSession: false },
});
const admin = createClient(URL, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const email = `smoke-step3-${stamp}@outlook.com`;
const PASSWORD = "SmokeStep3!2026";
let tenantId = null;
let userId = null;

const norm = (h) => h.replaceAll("<!-- -->", "").replaceAll("&amp;", "&");

const dump = (name, html) => {
  const file = join(ROOT, "_dbg-" + name + ".html");
  writeFileSync(file, html);
  console.log("  >>> html dumped to " + file);
};

try {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { shop_name: "Comptoir Smoke Step3", shop_city: "Tunis" },
  });
  if (createErr || !created?.user) {
    ko("createUser", createErr?.message ?? "aucun utilisateur");
    process.exit(1);
  }
  userId = created.user.id;
  ok("compte temporaire créé");

  const { data: si, error: siErr } = await anon.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (siErr) {
    ko("signIn", siErr.message);
    process.exit(1);
  }
  ok("signInWithPassword");

  const sessionJson = JSON.stringify({
    access_token: si.session.access_token,
    refresh_token: si.session.refresh_token,
    expires_at: si.session.expires_at,
    expires_in: si.session.expires_in,
    token_type: si.session.token_type,
    user: si.session.user,
  });
  const cookieVal =
    "base64-" + Buffer.from(sessionJson, "utf8").toString("base64url");
  const authHeaders = { Cookie: `${COOKIE_NAME}=${cookieVal}` };

  // 1. premiere page -> provision automatique du tenant
  const pre = await fetch(APP + "/recherche", {
    headers: authHeaders,
    redirect: "manual",
  });
  const preHtml = norm(await pre.text());
  if (!pre.ok || !preHtml.includes("Comptoir Smoke Step3")) {
    ko("GET /recherche (provision)", `status=${pre.status}`);
    dump("recherche", preHtml);
    process.exit(1);
  }
  ok("première page -> provision + rendu");

  const { data: prof } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (!prof) {
    ko("provision (profil)", "introuvable");
    process.exit(1);
  }
  tenantId = prof.tenant_id;
  ok("tenant provisionné");

  // 2. /fournisseurs : le formulaire doit etre actif (plus de "bientot")
  const four = await fetch(APP + "/fournisseurs", {
    headers: authHeaders,
    redirect: "manual",
  });
  const fourHtml = norm(await four.text());
  const fourChecks = {
    "en-tête": "Connecter un compte grossiste",
    "sélection actif": 'name="supplier_id"',
    "bouton actif": "Enregistrer et connecter",
    "SOPRA listé": "SOPRA",
  };
  const missingFour = Object.entries(fourChecks)
    .filter(([, v]) => !fourHtml.includes(v))
    .map(([k]) => k);
  if (!four.ok || missingFour.length > 0) {
    ko("GET /fournisseurs", `status=${four.status} manquants=${missingFour.join(",")}`);
    dump("fournisseurs", fourHtml);
  } else {
    ok("GET /fournisseurs : formulaire de connexion actif");
  }
  if (fourHtml.includes("bientôt")) {
    ko("formulaire encore desactive", "le mot « bientôt » est présent");
  } else {
    ok("aucun libellé « bientôt » résiduel");
  }

  // 3. /resultats SANS fournisseur connecte : aucun resultat, message clair
  const noSup = await fetch(APP + "/resultats?ref=136620", {
    headers: authHeaders,
    redirect: "manual",
  });
  const noSupHtml = norm(await noSup.text());
  if (
    !noSup.ok ||
    !noSupHtml.includes("Aucun résultat") ||
    noSupHtml.includes("FOURCHETTE")
  ) {
    ko(
      "GET /resultats (aucun fournisseur)",
      `status=${noSup.status}`,
    );
    dump("resultats-vide", noSupHtml);
  } else {
    ok("GET /resultats sans fournisseur -> état vide correct");
  }

  // 4. connexion reelle du grossiste via l'Edge Function
  const { data: sop } = await admin
    .from("suppliers")
    .select("id, code, name")
    .eq("code", "SOP")
    .maybeSingle();
  if (!sop) {
    ko("fournisseur SOP", "absent du référentiel");
    process.exit(1);
  }

  const connectRes = await fetch(`${URL}/functions/v1/connect-supplier`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${si.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      supplier_id: sop.id,
      identifier: SOPRA_LOGIN,
      password: SOPRA_PASSWORD,
    }),
  });
  const connectBody = await connectRes.json();
  if (connectRes.status !== 200 || !connectBody.ok) {
    ko("connect-supplier", `status=${connectRes.status}`);
    process.exit(1);
  }
  ok("connect-supplier : compte SOPRA validé");

  // 5. /resultats avec le fournisseur connecte : resultat reel attendu
  const res = await fetch(APP + "/resultats?ref=136620", {
    headers: authHeaders,
    redirect: "manual",
  });
  const resHtml = norm(await res.text());
  const resChecks = {
    "désignation": "FOURCHETTE DEM R9/S5/EXP",
    "prix": "11,500 TND",
    "fournisseur": "SOPRA",
    "lien externe": "soprab2b.tn",
  };
  const missingRes = Object.entries(resChecks)
    .filter(([, v]) => !resHtml.includes(v))
    .map(([k]) => k);
  if (!res.ok || missingRes.length > 0) {
    ko(
      "GET /resultats (résultat réel)",
      `status=${res.status} manquants=${missingRes.join(",")}`,
    );
    dump("resultats-reel", resHtml);
  } else {
    ok("GET /resultats : résultat SOPRA réel affiché (prix, lien)");
  }
  if (resHtml.includes("Aperçu de démonstration")) {
    ko("mock restant", "le bandeau de démo est encore présent");
  } else {
    ok("plus aucun mock de démonstration");
  }

  // 5b. recherche « commence par » (réf partielle) -> 136620 doit apparaître
  const stub = await fetch(APP + "/resultats?ref=136&prefix=1", {
    headers: authHeaders,
    redirect: "manual",
  });
  const stubHtml = norm(await stub.text());
  const stubChecks = {
    "libellé mode": "commence par",
    "136620 listée": "136620",
    "désignation": "FOURCHETTE DEM R9/S5/EXP",
  };
  const missingStub = Object.entries(stubChecks)
    .filter(([, v]) => !stubHtml.includes(v))
    .map(([k]) => k);
  if (!stub.ok || missingStub.length > 0) {
    ko(
      "GET /resultats?ref=136&prefix=1",
      `status=${stub.status} manquants=${missingStub.join(",")}`,
    );
    dump("resultats-starts", stubHtml);
  } else {
    ok("GET /resultats?ref=136&prefix=1 : réf partielle -> résultats");
  }

  // 5c. même réf SANS la case : recherche exacte -> aucun résultat (comme le site)
  const plain = await fetch(APP + "/resultats?ref=136", {
    headers: authHeaders,
    redirect: "manual",
  });
  const plainHtml = norm(await plain.text());
  if (!plain.ok || !plainHtml.includes("Aucun résultat") || plainHtml.includes("136620")) {
    ko("GET /resultats?ref=136 (exact)", `status=${plain.status}`);
    dump("resultats-exact-vide", plainHtml);
  } else {
    ok("GET /resultats?ref=136 (exact) : aucun résultat, message clair");
  }

  // 6. reference inexistante -> etat vide handled
  const miss = await fetch(APP + "/resultats?ref=ZZZ-NOPE-000", {
    headers: authHeaders,
    redirect: "manual",
  });
  const missHtml = norm(await miss.text());
  if (!miss.ok || !missHtml.includes("Aucun résultat")) {
    ko("GET /resultats (réf inexistante)", `status=${miss.status}`);
    dump("resultats-introuvable", missHtml);
  } else {
    ok("GET /resultats : référence inexistante gérée");
  }

  // 7. historique ecrit une seule fois par search-parts
  const { data: hist } = await admin
    .from("search_history")
    .select("reference, results_count, suppliers_ok, suppliers_error, reference_mode")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  // Le test déclenche 2 requêtes sur 136620 : une avant connexion (0
  // fournisseur) et une après. Ce qui doit être unique, c'est l'écriture
  // par recherche — pas le nombre de recherches.
  const forRef = (hist ?? []).filter((h) => h.reference === "136620");
  const withResults = forRef.filter((h) => h.results_count > 0);
  if (withResults.length !== 1) {
    ko(
      "search_history (unicité)",
      `${withResults.length} ligne(s) avec résultats pour 136620 (attendu 1)`,
    );
  } else {
    ok(
      `search_history : 1 écriture avec résultats (ok=${withResults[0].suppliers_ok}, résultats=${withResults[0].results_count}, total requêtes=${forRef.length})`,
    );
  }
  // la recherche « commence par » (136+prefix=1) doit être mémorisée en mode `starts`
  const startsRow = (hist ?? []).find(
    (h) => h.reference === "136" && h.results_count > 0,
  );
  if (!startsRow || startsRow.reference_mode !== "starts") {
    ko(
      "search_history (mode starts)",
      startsRow
        ? `reference_mode="${startsRow.reference_mode}" attendu "starts"`
        : "aucune ligne avec résultats pour ref=136 prefix=1",
    );
  } else {
    ok("search_history : recherche « commence par » mémorisée en mode starts");
  }

  // 8. le secret ne doit jamais etre lisible par le client
  const { data: anonRows } = await anon
    .from("tenant_suppliers")
    .select("identifier, status");
  const leak = (anonRows ?? []).some((r) => "secret_id" in r);
  if (leak) {
    ko("RLS", "secret_id exposé au rôle anon");
  } else {
    ok("RLS : le client ne voit ni secret_id ni mot de passe");
  }

  // 9. connexion réelle d'AD (Autodistribution) + résultat réel sur GDB2154
  let adId = null;
  const { data: ad } = await admin
    .from("suppliers")
    .select("id, code, name")
    .eq("code", "AD")
    .maybeSingle();
  if (!ad) {
    ko("fournisseur AD", "absent du référentiel");
  } else {
    adId = ad.id;
    const connectAd = await fetch(`${URL}/functions/v1/connect-supplier`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${si.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        supplier_id: ad.id,
        identifier: PROAD_LOGIN,
        password: PROAD_PASSWORD,
      }),
    });
    const adBody = await connectAd.json();
    if (connectAd.status !== 200 || !adBody.ok) {
      ko("connect-supplier (AD)", `status=${connectAd.status}`);
    } else {
      ok("connect-supplier : compte AD validé");

      const adRes = await fetch(APP + "/resultats?ref=GDB2154", {
        headers: authHeaders,
        redirect: "manual",
      });
      const adHtml = norm(await adRes.text());
      const adChecks = {
        "fournisseur listé": "Autodistribution",
        "désignation": "PLAQUETTE DE FREIN AR MERCEDES W205",
        "lien externe": "pro.ad-tunisie.com",
      };
      const missingAd = Object.entries(adChecks)
        .filter(([, v]) => !adHtml.includes(v))
        .map(([k]) => k);
      if (!adRes.ok || missingAd.length > 0) {
        ko(
          "GET /resultats?ref=GDB2154 (AD)",
          `status=${adRes.status} manquants=${missingAd.join(",")}`,
        );
        dump("resultats-ad", adHtml);
      } else {
        ok("GET /resultats : résultat AD réel affiché (lien pro.ad-tunisie.com)");
      }
    }
  }

  // 10. panier de suivi : coche manuelle depuis /resultats -> /panier
  if (adId) {
    const trackingRef = "GDB2154";
    const trackingBody = {
      supplierId: adId,
      reference: trackingRef,
      designation: "PLAQUETTE DE FREIN AR MERCEDES W205",
      marque: "MERCEDES",
      prix_millimes: 108749,
      lien_produit: "https://pro.ad-tunisie.com/produit/gdb2154",
    };
    const add = await fetch(APP + "/resultats/tracking", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(trackingBody),
    });
    const addBody = await add.json();
    if (add.status !== 200 || !addBody.ok || !addBody.id) {
      ko("POST /resultats/tracking (ajout)", `status=${add.status}`);
    } else {
      ok("POST /resultats/tracking : article ajouté au suivi");
    }

    const dup = await fetch(APP + "/resultats/tracking", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(trackingBody),
    });
    const dupBody = await dup.json();
    if (!dupBody.ok || dupBody.already !== true) {
      ko("POST /resultats/tracking (anti-doublon)", JSON.stringify(dupBody));
    } else {
      ok("POST /resultats/tracking : doublon ignoré (already=true)");
    }

    const { count: trackedCount } = await admin
      .from("tracking_cart_items")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("supplier_id", adId)
      .eq("reference", trackingRef)
      .eq("status", "pending");
    if (trackedCount !== 1) {
      ko("anti-doublon (DB)", `count=${trackedCount}`);
    } else {
      ok("anti-doublon vérifié en base (1 seule ligne pending)");
    }

    const cart = await fetch(APP + "/panier", {
      headers: authHeaders,
      redirect: "manual",
    });
    const cartHtml = norm(await cart.text());
    const cartChecks = {
      fournisseur: "Autodistribution",
      référence: "GDB2154",
      désignation: "PLAQUETTE DE FREIN AR MERCEDES W205",
      groupe: "En attente de finalisation",
      retirer: "Retirer",
      finaliser: "Aller finaliser chez Autodistribution",
    };
    const missingCart = Object.entries(cartChecks)
      .filter(([, v]) => !cartHtml.includes(v))
      .map(([k]) => k);
    if (!cart.ok || missingCart.length > 0) {
      ko(
        "GET /panier (attente)",
        `status=${cart.status} manquants=${missingCart.join(",")}`,
      );
      dump("panier-attente", cartHtml);
    } else {
      ok("GET /panier : article groupé par fournisseur, bouton Retirer présent");
    }

    // Simulation du toggle « Marquer comme commandé » (appel RLS identique au client)
    await admin
      .from("tracking_cart_items")
      .update({ status: "ordered", ordered_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("supplier_id", adId);

    const cartDone = await fetch(APP + "/panier", {
      headers: authHeaders,
      redirect: "manual",
    });
    const doneHtml = norm(await cartDone.text());
    if (
      !cartDone.ok ||
      !doneHtml.includes("Panier commandé") ||
      !doneHtml.includes("Commandé")
    ) {
      ko("GET /panier (commandé)", `status=${cartDone.status}`);
      dump("panier-commande", doneHtml);
    } else {
      ok("GET /panier : article marqué commandé (badge + statut)");
    }

    const del = await fetch(
      APP + "/resultats/tracking?id=" + encodeURIComponent(addBody.id),
      { method: "DELETE", headers: authHeaders },
    );
    const delBody = await del.json();
    if (!delBody.ok) {
      ko("DELETE /resultats/tracking", `status=${del.status}`);
    } else {
      ok("DELETE /resultats/tracking : article retiré du suivi");
    }

    const { count: afterDelete } = await admin
      .from("tracking_cart_items")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("supplier_id", adId);
    if (afterDelete !== 0) {
      ko("suppression (DB)", `count=${afterDelete}`);
    } else {
      ok("suppression vérifiée en base (0 ligne)");
    }

    const cartEmpty = await fetch(APP + "/panier", {
      headers: authHeaders,
      redirect: "manual",
    });
    const emptyHtml = norm(await cartEmpty.text());
    if (!cartEmpty.ok || !emptyHtml.includes("Aucun article en attente")) {
      ko("GET /panier (vide)", `status=${cartEmpty.status}`);
      dump("panier-vide", emptyHtml);
    } else {
      ok("GET /panier : état vide après retrait");
    }
  }

  // 10b. RLS : le rôle anon ne doit rien voir dans tracking_cart_items
  const { data: anonTracking } = await anon
    .from("tracking_cart_items")
    .select("id");
  if ((anonTracking ?? []).length > 0) {
    ko("RLS tracking", `${anonTracking.length} ligne(s) lue(s) par anon`);
  } else {
    ok("RLS tracking : le rôle anon ne voit aucune ligne de suivi");
  }
} catch (err) {
  ko("script", err.message);
} finally {
  console.log("[cleanup]");
  if (tenantId) {
    // Le trigger purge le secret Vault lors de la suppression en cascade.
    await admin.from("tenants").delete().eq("id", tenantId);
    ok("tenant supprimé (secret Vault purgé par le trigger)");
  }
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
    ok("utilisateur supprimé");
  }
  const { data: leftovers } = await admin
    .from("tenant_suppliers")
    .select("id, tenant_id");
  if ((leftovers ?? []).length > 0) {
    ko("nettoyage", `${leftovers.length} tenant_suppliers résiduelle(s)`);
  }
}

console.log(failed === 0 ? "RESULT: OK" : `RESULT: ${failed} échec(s)`);
process.exit(failed === 0 ? 0 : 1);
