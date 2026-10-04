import { api, LOGIN, PASSWORD } from "./_net.mjs";

// Authentification FADPRO :
//   POST /fad/auth/login?custNo=<login>&password=<password>
//   -> 200 { "token": "<jwt HS512>" }
// Le mot de passe passe en query string (comportement de l'application) ; ne
// jamais journaliser l'URL ni la réponse complète.
export async function login() {
  const qs = new URLSearchParams({ custNo: LOGIN, password: PASSWORD });
  const res = await api(`/auth/login?${qs.toString()}`, { method: "POST" });
  const token = res.json?.token;
  if (res.status !== 200 || typeof token !== "string" || !token) {
    throw new Error(`FADPRO: connexion refusée (HTTP ${res.status})`);
  }
  return { ok: true, token };
}
