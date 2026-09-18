# AGENTS.md

Ce fichier donne à l'agent (OpenCode) le contexte nécessaire pour travailler efficacement sur ce projet. Lis-le entièrement avant toute modification de code.

## 1. Contexte du projet

Application web B2B destinée aux vendeurs de pièces détachées automobiles en Tunisie.

Fonction principale : l'utilisateur saisit une référence d'origine + une marque, l'application interroge en parallèle plusieurs sites B2B de fournisseurs (via des connecteurs dédiés), agrège les résultats (stock + prix), les trie par prix croissant, et permet à l'utilisateur d'ouvrir la fiche produit chez le fournisseur pour finaliser sa commande.

Fonction secondaire : un "panier de suivi" interne permet à l'utilisateur de retrouver en fin de journée tous les articles qu'il a mis dans les paniers de différents sites fournisseurs, regroupés par fournisseur, avec rappel visuel.

Utilisateurs cibles : gérants de points de vente de pièces auto en Tunisie, peu technophiles. Langue de l'interface : français. Devise : Dinar Tunisien (TND).

Produit multi-tenant : chaque point de vente (tenant) a ses propres identifiants pour se connecter aux sites B2B fournisseurs. Ces identifiants ne doivent jamais être visibles ou accessibles par un autre tenant.

## 2. Stack technique

- **Frontend** : généré initialement via Google Stitch (MCP `stitch`), React + Tailwind CSS. Respecter le design system exporté (`DESIGN.md` à la racine si présent) pour toute nouvelle interface ou modification — ne pas réinventer une palette ou des styles hors de ce système sans le demander explicitement.
- **Backend / données** : Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions). Accès via le MCP `supabase`.
- **Connecteurs fournisseurs (scraping/API)** : services séparés, exécutés côté serveur uniquement (Edge Functions Supabase ou service Node/Python dédié dans `/connectors`). Jamais exposés ou exécutés côté client/navigateur.
- **Gestionnaire de paquets** : npm (sauf indication contraire dans `package.json`).

## 3. Structure du projet

```
/frontend            → application React/Next.js (issue de Stitch)
/connectors          → un dossier par fournisseur B2B (scraping/API), isolé et testable individuellement
/supabase
  /migrations        → schéma SQL versionné
  /functions         → Edge Functions (dont l'orchestration des connecteurs)
DESIGN.md            → tokens de design (couleurs, typographie, espacement) exportés de Stitch
AGENTS.md            → ce fichier
```

## 4. Règles de sécurité — non négociables

- **Jamais de secret en dur dans le code** : ni token Supabase, ni identifiant/mot de passe fournisseur, ni clé API. Tout passe par des variables d'environnement (`.env`, jamais commité — vérifier `.gitignore`).
- Les identifiants B2B des fournisseurs sont stockés **chiffrés** en base (jamais en clair), et ne sont déchiffrés que côté serveur au moment de l'exécution d'un connecteur.
- **Row Level Security (RLS) obligatoire** sur toutes les tables contenant des données de tenant (credentials, historique de recherche, panier de suivi). Un tenant ne doit jamais pouvoir lire ou modifier les données d'un autre, même via une requête mal formée. Si tu écris ou modifies une policy RLS, explique-la clairement dans ton résumé de changement pour qu'elle soit relue.
- Le MCP `supabase` doit rester en mode `--read-only` par défaut. Ne l'utiliser en écriture que lorsque c'est explicitement demandé pour une tâche de migration de schéma, et le signaler clairement.
- Ne jamais logger ou afficher un mot de passe ou un token, même partiellement, dans les messages de debug/console.

## 5. Connecteurs fournisseurs : règles spécifiques

- Chaque connecteur est développé et testé **individuellement**, jamais en lot automatique. Avant d'écrire un connecteur pour un nouveau fournisseur, je (l'utilisateur) fournirai les détails de la structure du site (appel API interne trouvé via l'inspecteur réseau, ou structure HTML) — ne pas deviner ou halluciner une structure de site non vérifiée.
- Un connecteur retourne toujours les données dans le schéma normalisé interne suivant, quel que soit le fournisseur source :
  ```
  { reference, designation, marque, fournisseur, disponibilite, prix, devise, delai, lien_produit }
  ```
- Gérer explicitement les cas d'échec (timeout, site indisponible, session expirée, changement de structure détecté) sans faire planter l'agrégation globale — un fournisseur en erreur doit simplement être marqué "indisponible", jamais bloquer les autres résultats.
- Aucune action d'achat automatique pour l'instant. Le bouton "Commander" ouvre uniquement un lien externe vers le fournisseur ; il n'existe aucune fonction de soumission de commande automatisée dans ce projet tant que ce n'est pas explicitement demandé.

## 6. Conventions de code

- Composants React en TypeScript quand possible.
- Nommage des variables et commentaires de code en anglais ; textes visibles par l'utilisateur (UI) en français.
- Respecter la structure de dossiers existante plutôt que d'en créer une nouvelle en parallèle.
- Avant de créer un nouveau composant UI, vérifier s'il existe déjà un composant similaire réutilisable dans `/frontend/components`.

## 7. Méthode de travail attendue

- Avancer **étape par étape, fonctionnalité par fonctionnalité** — ne pas essayer de livrer plusieurs fonctionnalités non liées dans un seul changement.
- Avant de modifier le schéma Supabase, résumer le changement proposé (tables/colonnes affectées) et attendre confirmation si le changement casse une migration existante.
- Pour toute nouvelle interface, vérifier la cohérence avec le design system (`DESIGN.md`) avant de générer du HTML/CSS/composants.
- En cas d'ambiguïté sur une règle métier (ex : comportement du panier de suivi, seuils de rappel, gestion d'un fournisseur en erreur), poser la question plutôt que de supposer.

## 8. Commandes utiles

```bash
# Frontend
cd frontend && npm install && npm run dev

# Supabase local
supabase start
supabase db push        # applique les migrations
supabase functions serve

# Lint / build avant tout commit
npm run lint
npm run build
```

## 9. Ce que l'agent ne doit jamais faire seul

- Committer ou pousser du code vers un dépôt distant sans confirmation explicite.
- Modifier ou supprimer une policy RLS sans expliquer l'impact.
- Ajouter une dépendance externe majeure (nouvelle librairie, nouveau service tiers) sans le signaler d'abord.
- Écrire un connecteur de scraping pour un fournisseur dont la structure du site n'a pas été fournie ou vérifiée.
