import { APP, BASE, LOGIN, PASSWORD, formAction, get, hiddenFields, post } from "./_net.mjs";

// Flux de connexion WEBDEV/PCSoft, validé en live :
//   1. GET /LahianiB2B        -> page d'accueil (form -> token)
//   2. GET <action>?A6        -> PAGE_Connexion1Colonne (champs A8 / A7)
//   3. POST A10 « Se Connecter » (A8=login, A7=password) -> PAGE_CatalogueArticles
export async function login() {
  const accueil = await get(APP);
  const action1 = formAction(accueil.html);
  if (!action1) throw new Error("LAHIANI: form d'accueil introuvable");

  const loginPage = await get(new URL(action1, BASE).href + "?A6");
  const action2 = formAction(loginPage.html);
  if (!action2) throw new Error("LAHIANI: form de connexion introuvable");

  return post(new URL(action2, BASE).href, [
    ...Object.entries(hiddenFields(loginPage.html)),
    ["WD_BUTTON_CLICK_", "A10"],
    ["WD_ACTION_", ""],
    ["A8", LOGIN],
    ["A7", PASSWORD],
  ]);
}
