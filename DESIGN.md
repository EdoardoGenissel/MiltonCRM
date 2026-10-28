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
| `border-strong` | Bordure d'un élément cliquable au survol (ex. carte de la file Prospects) |
| `primary` | Teal Milton (`#14b8a6`) : action principale, lien, élément actif, focus (`ring`) |
| `primary-strong` | Teal foncé (`#0f766e`) : fond plein **avec texte blanc** (le blanc sur `primary` ne passe pas WCAG AA) et texte teal sur fond pâle (tag « Nouveau prospect », liens texte) |
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
  - `shadow-[var(--shadow-card-interactive)]` pour le survol et le focus d'une
    carte cliquable ;
  - `shadow-[var(--shadow-panel-footer)]` pour le pied fixe d'un panneau latéral ;
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
| `default` | **Une** action principale par zone (Enregistrer, Appliquer). Avec texte blanc sur fond plein, préférer `bg-primary-strong` (contraste AA), ex. « Valider » de la page Prospects |
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
  (« Tout sélectionner », « Ouvrir la fiche ») ;
- ligne-accordéon (ex. « Autres champs du contact », « 4 écartés ») :
  `aria-expanded`, chevron qui pivote, toute la ligne cliquable.

Revenir à une valeur précédente dans un champ : icône seule (↺) à droite du
champ, avec `aria-label` et `title` explicites, et une note grise sous le champ
(« Remplace « … » »). L'icône n'apparaît que tant qu'il y a un changement à
annuler.

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

Les tags gardent l'arrondi commun `rounded-md`. Seuls les **compteurs** (nombre
accolé à un titre ou à un bouton) sont des pastilles rondes `rounded-full` de
18px de haut (`h-4.5 min-w-4.5`) :

- à côté d'un titre : variante `outline` sur fond blanc (`bg-card`) - la
  variante `secondary` se confond avec le fond de page ;
- dans un bouton (ex. « Filtres ») : fond `primary-strong`, texte blanc.

### Surfaces et conteneurs

- **Carte** : `Card` de [components/detail-card.tsx](components/detail-card.tsx)
  (avec `Field` et `EmptyState`).
- **Tableau de liste** : `TableCard` / `TableHeadRow` de
  [components/ui/data-table.tsx](components/ui/data-table.tsx), avec
  `SortableHeader`, `FilterableHeader` et `Pagination`.
- **Panneau latéral** (fiche d'une entité, consultation, traitement d'un mail
  prospect) : [SidePanel](components/ui/side-panel.tsx). Props optionnelles
  `toolbar` (bandeau fixe sous l'en-tête) et `footer` (pied fixe, toujours
  visible pendant le défilement).
- **Modale** (tâche qui demande toute l'attention) :
  [Modal](components/ui/modal.tsx). Plus utilisée pour l'instant (la validation
  d'un mail prospect passe par un panneau latéral), gardée pour un usage futur.
- **Alerte de modifications non enregistrées** (dans un pied de panneau) : fond
  neutre, icône d'alerte, texte puis boutons alignés à gauche (« Rester ici »
  en `outline`, « … sans enregistrer » en `destructive`).
- **Confirmation après une action** : `useToast()` de
  [components/ui/toaster.tsx](components/ui/toaster.tsx).

### Formulaires

- Champs : `Input` et `Select` (natif, même style). Le chevron du `Select` est
  dessiné à 12px du bord droit, comme la marge du texte à gauche.
- Gabarit : `FormField`, `FormError`, `SubmitButton` de
  [components/ui/form.tsx](components/ui/form.tsx).
- Champ piloté par le registre de champs : `FieldInput`. Un champ « liste »
  (ex. Types de contact) s'affiche en puces sélectionnables (ToggleGroup Base
  UI, plusieurs choix possibles).

### Filtres et onglets

Convention commune aux pages Contacts / Biens / Mandats / Estimations /
Prospects ; tout l'état passe par l'URL :

- `FilterBar` : un seul champ de recherche, sans bouton « Rechercher ». La
  recherche se lance à la frappe (300 ms, `router.replace`) ou avec Entrée. Slot
  `filters` affiché dans le champ, à droite (ex. bouton « Filtres » de
  Prospects). Puces des filtres actifs alignées à gauche sous la barre, avec
  « Tout effacer » (`keepOnReset` pour garder un paramètre, ex. l'onglet) ;
- `FilterableHeader` / `ColumnFilter` : filtre par colonne ;
- `FilterTabs` (ex. `PersonaTabs`) : filtre mono-valeur présenté en onglets.

Onglets internes à un tiroir : `DrawerTabs`, état local. Les deux reposent sur
`TabStrip`, qui pose `aria-current="page"` sur l'onglet actif (mode lien).

### Navigation

- `Sidebar` : 264px, items `text-nav-foreground`, actif `bg-nav-active` + icône
  `text-primary`.
- `Topbar` : h-16, titre de page en `text-base font-semibold`.
