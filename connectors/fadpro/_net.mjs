import { readFileSync } from "node:fs";

const env = readFileSync(new URL("./.env.test", import.meta.url), "utf8");
const pick = (key, fallback = "") =>
  (env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1] ?? fallback).trim();

export const LOGIN = pick("FADPRO_LOGIN");
export const PASSWORD = pick("FADPRO_PASSWORD");
// URL publique du site : sert uniquement de lien « Commander » de repli.
export const BASE = pick("FADPRO_BASE_URL", "https://fadpro.tn");
// API métier (Angular SPA -> back Spring Boot sur :8095). Fixe, voir le bundle
// de l'application et la collection PocketBase api_urls (BaseURL).
export const API = pick("FADPRO_API_URL", "https://fadpro.tn:8095/fad");

const UA = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
  origin: "https://fadpro.tn",
  referer: "https://fadpro.tn/",
  // Valeur publique exposée par l'application (PocketBase collection Keys,
  // key="Headers"). Non secrète ; recopiée pour rester fidèle au client web.
  "x-custom-origin": "https://fadpro.tn",
};

// Appel API avec garde d'échec : renvoie toujours { status, json, text }.
export async function api(path, { method = "GET", token = "", body } = {}) {
  const headers = { ...UA };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";

  // API contient déjà le préfixe /fad : on concatène (un path absolu passerait
  // par-dessus /fad si on utilisait new URL(path, API)).
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Le backend répond du texte brut (« Aucun article trouvé... ») quand la
    // recherche ne renvoie rien : ce n'est pas une erreur de transport.
    parsed = null;
  }
  return { status: res.status, json: parsed, text };
}
