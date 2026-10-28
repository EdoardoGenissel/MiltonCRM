# Design system - CRM Milton

Référence des règles UI du CRM. La source de vérité reste le code :
[app/globals.css](app/globals.css) pour les tokens, [components/ui/](components/ui/)
pour les primitives. Ce document dit **quoi utiliser et quand**.

Stack : Tailwind v4 (tokens via `@theme inline`), primitives Base UI habillées
façon shadcn, icônes `lucide-react`, police Inter.

**Thème clair uniquement.** Pas de mode sombre : ne pas ajouter de classes `dark:`.

---

## Règles d'or

1. **Jamais de couleur en dur** dans un composant (`#xxxxxx`, `bg-gray-100`,
   `text-red-500`…). Toujours un token (`bg-muted`, `text-danger`…). Si aucun
   token ne convient, en ajouter un dans `globals.css` plutôt que coder la valeur.
   Seules exceptions : les palettes dérivées par hash (`ContactAvatar`,
   `MandatTypeBadge`).
2. **Un seul arrondi : 8px.** Toutes les tailles `rounded-sm` → `rounded-2xl`
   pointent sur 8px ; écrire `rounded-md`. Exception : `rounded-full` (puces de
   filtre, pastilles rondes). Pas de `rounded-[Npx]`.
3. **Pas de taille de texte arbitraire** (`text-[13px]`). Utiliser l'échelle
   ci-dessous.
4. **Un bouton d'action = `<Button>`.** Voir la section Boutons pour les cas où un
   `<button>` brut est légitime.

---

## Couleurs

| Token | Usage |
| --- | --- |
| `background` | Fond de page (`#f7f8fa`) |
| `card` / `popover` | Surfaces : cartes, tableaux, panneaux, popovers (blanc) |
| `foreground` | Texte principal |
| `muted-foreground` | Texte secondaire, libellés, métadonnées, icônes au repos |
| `muted` / `secondary` / `accent` | Fonds neutres : survol, zones en retrait, badge neutre |
| `border` / `input` | Bordures et contours de champs |
| `primary` | Teal Milton (`#14b8a6`) : action principale, lien, élément actif, focus (`ring`) |
| `success` · `danger` · `warning` | États. Chacun existe en 3 niveaux (voir ci-dessous) |
| `destructive` | Bouton d'action destructrice |
| `nav-foreground` · `nav-icon` · `nav-hover` · `nav-active` | Navigation (sidebar, topbar) uniquement |

États sémantiques, 3 niveaux chacun :

- `bg-success-bg text-success-foreground` → pastille / encart (fond pâle + texte foncé)
- `text-success` → icône ou texte d'état isolé

Même schéma pour `danger` et `warning`.

Opacités tolérées sur les tokens pour les nuances : `bg-primary/10`,
`bg-muted/40`, `text-foreground/80`.

## Typographie

Inter, via `font-sans`. Échelle volontairement courte :

| Classe | Usage |
| --- | --- |
| `text-xs` (12px) | Métadonnées, badges, aide sous un champ, en-têtes de colonnes |
| `text-sm` (14px) | **Taille par défaut** de l'UI : cellules, formulaires, boutons, titres de carte |
| `text-base` (16px) | Titre de page (topbar) et de panneau |
| `text-lg` / `text-2xl` | Rares : chiffres clés, pages d'auth |

Graisses : `font-medium` (libellés, boutons, badges), `font-semibold` (titres),
`font-bold` réservé aux initiales d'avatar. Chiffres alignés : `tabular-nums`.

## Arrondis, ombres, espacement

- Arrondi : `rounded-md` (8px) partout.
- Ombres :
  - `shadow-[var(--shadow-card)]` pour les cartes et les tableaux ;
  - `shadow-lg` pour les popovers et les menus ;
  - `shadow-2xl` pour les panneaux latéraux et les modales.
- Hauteurs de contrôle : `h-8` (boutons compacts, icônes) et `h-10` (champs,
  bouton par défaut).
- Icônes : `size-4` par défaut (automatique dans `<Button>`), `size-3.5` en
  contexte compact.

---

## Composants

### Boutons - [components/ui/button.tsx](components/ui/button.tsx)

| Variante | Quand |
| --- | --- |
| `default` | **Une** action principale par zone (Enregistrer, Appliquer, Rechercher) |
| `outline` | Action secondaire visible (Valider dans une liste, Filtres) |
| `ghost` | Action tertiaire : Annuler, Effacer, Modifier, boutons icône (fermer, retour) |
| `secondary` | Action neutre sur fond blanc, rarement |
| `destructive` | Suppression, action irréversible |
| `link` | Action présentée comme un lien dans un bandeau ou un texte |

Tailles : `lg` (défaut, h-10), `default` (h-8), `sm` (h-7), `xs` ;
icônes : `icon` (32px), `icon-sm`, `icon-xs`, `icon-lg`.
Bouton icône seul = `aria-label` obligatoire.
Pour un ton de danger sur un bouton discret : `variant="ghost"` +
`className="hover:text-danger"`.

`<button>` brut **autorisé** seulement quand l'élément n'a pas l'apparence d'un
bouton :

- ligne de liste ou de timeline cliquable ;
- contrôle segmenté, onglets (`TabStrip`), puces de filtre ;
- déclencheurs de tiroir (`ContactTrigger`, `BienTrigger`, `MandatTrigger`) ;
- petits liens texte `text-xs text-primary hover:underline` dans une ligne dense
  (« Tout sélectionner », « Ouvrir la fiche », « Utiliser la valeur du mail »).

### Badges - [components/ui/badge.tsx](components/ui/badge.tsx)

Toujours passer par `Badge` ou un badge métier, jamais une pastille recopiée.

| Variante | Sens |
| --- | --- |
| `secondary` | Neutre / information (persona, statut en attente) |
| `outline` | Attribut discret (source, prospect) |
| `primary` | En cours / transmis (estimation envoyée à Apimo) |
| `success` | Acquis / positif (client, estimation envoyée) |

Badges métier existants, à réutiliser :

- `PersonaBadge`
- `SourceBadge`
- `StatutBadge` (prospect / client)
- `EstimationStatutBadge`
- `MandatTypeBadge` (couleur par hash, hors palette, jamais rouge ni orange)

### Surfaces et conteneurs

- **Carte** : `Card` de [components/detail-card.tsx](components/detail-card.tsx)
  (avec `Field` et `EmptyState`).
- **Tableau de liste** : `TableCard` / `TableHeadRow` de
  [components/ui/data-table.tsx](components/ui/data-table.tsx), avec
  `SortableHeader`, `FilterableHeader` et `Pagination`.
- **Panneau latéral** (fiche d'une entité, consultation) :
  [SidePanel](components/ui/side-panel.tsx).
- **Modale** (tâche qui demande toute l'attention, ex. validation d'un mail
  prospect) : [Modal](components/ui/modal.tsx).
- **Confirmation après une action** : `useToast()` de
  [components/ui/toaster.tsx](components/ui/toaster.tsx).

### Formulaires

- Champs : `Input` et `Select` (natif, même style).
- Gabarit : `FormField`, `FormError`, `SubmitButton` de
  [components/ui/form.tsx](components/ui/form.tsx).
- Champ piloté par le registre de champs : `FieldInput`.

### Filtres et onglets

Convention commune aux pages Contacts / Biens / Mandats / Estimations ; tout
l'état passe par l'URL :

- `FilterBar` : recherche + puces actives + Réinitialiser ;
- `FilterableHeader` / `ColumnFilter` : filtre par colonne ;
- `FilterTabs` (ex. `PersonaTabs`) : filtre mono-valeur présenté en onglets.

Onglets internes à un tiroir : `DrawerTabs`, état local. Les deux reposent sur
`TabStrip`.

### Navigation

- `Sidebar` : 264px, items `text-nav-foreground`, actif `bg-nav-active` + icône
  `text-primary`.
- `Topbar` : h-16, titre de page en `text-base font-semibold`.
