# Milton CRM

Fiche contact unifiée cross-pôle (prospect, acquéreur, locataire, propriétaire
bailleur) + mandats + biens, pour Milton Immobilier. Cf. `scope.md` et `devis.md` pour
le cadrage client, et le plan de développement pour le détail des lots.

Base Postgres/Supabase **partagée** avec le projet voisin `Cockpit` (même projet
Supabase, `prisma/schema.prisma` étend le schéma existant avec les modèles CRM sans
toucher aux tables `Fact*`/`KpiSnapshot` du dashboard KPI).

## Stack

Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind v4 + shadcn/base-ui,
Prisma 7 (driver adapter `@prisma/adapter-pg`), Supabase Auth (`@supabase/ssr`), Zod,
Vitest.

## Setup

```bash
npm install
cp .env.example .env    # renseigner les variables Supabase/DB partagées avec Cockpit
npx prisma migrate deploy # applique les migrations existantes sur la base partagée
npm run dev
```

**Important — ne pas utiliser `prisma migrate dev` sur cette base.** Le shadow
database que `migrate dev` utilise pour calculer les diffs échoue systématiquement
sur la migration `20260712203504_profile_auth_fk` (le schéma `auth` de Supabase
n'existe pas dans une base fraîche). Toute évolution du schéma doit donc suivre ce
chemin : écrire la migration SQL à la main dans `prisma/migrations/<timestamp>_nom/
migration.sql`, puis l'appliquer avec `npx prisma migrate deploy` (qui n'utilise pas
de shadow database). Les deux repos (`CRM` et `Cockpit`) partageant la même base,
toujours vérifier `Cockpit/prisma/migrations` avant d'écrire une migration CRM, pour
répercuter ici toute migration déjà appliquée côté Cockpit (et inversement).

## Scripts

- `npm run dev` — serveur de dev
- `npm run build` — build production
- `npm run test` — tests Vitest (logique métier pure : dédup import, matching Ringover)
- `npm run lint` — ESLint

## Structure

- `app/(auth)` — login / mot de passe oublié / reset (Supabase Auth, pas d'inscription)
- `app/(dashboard)` — contacts, mandats, biens, imports, estimations
- `app/api/imports` — import manuel Excel (Apimo/Septéo)
- `app/api/ringover/webhook` — matching appel entrant
- `app/api/jotform/webhook` — automatisation JotForm → CityScan
- `lib/contacts/dedupe.ts`, `lib/integrations/ringover/match.ts` — logique de
  réconciliation/matching, pure et testée (Vitest)
- `lib/imports/mapping.ts` — mapping colonnes → champs CRM, basé sur les exports
  réels transmis par Milton (cf. `data/` : `Export APIMMO.xlsx`, `Export
  excel_Propriétaires SEPTEO (2).csv`, `Export_Locataires SEPTEO (2).csv`).
  Particularités gérées : colonne "Contact" Apimo combinant civilité/prénom/nom en
  une seule chaîne (`lib/imports/apimo-name.ts`), valeurs entourées de guillemets
  littéraux (`lib/imports/text-clean.ts`), "Type interlocuteur" Septéo multi-valué
  cumulant plusieurs personas sur une même fiche (`lib/imports/septeo-persona.ts`).
  Les exports Septéo Propriétaires/Locataires n'ont **pas** de colonne bien/mandat —
  seuls des contacts sont importés depuis ces deux fichiers ; l'import Excel Septéo
  crée uniquement des `Contact`, pas de `Bien`/`Mandat` pour l'instant.

## Hors périmètre V1

Bidirectionnalité CRM ↔ Apimo, croisement prospect/produit, récupération des
prospects Plateau, synchronisation API automatique (prévue octobre-décembre).
