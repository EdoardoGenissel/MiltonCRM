---
target: page Prospects
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/edoardo/Projets/Freelance/Agence Intuition/Milton/CRM/app/(dashboard)/prospects"
timestamp: 2026-10-27T10-05-27Z
slug: app-dashboard-prospects
---
# Critique — page Prospects (app/(dashboard)/prospects)

Méthode : double évaluation (A revue de design · B détecteur). Pas de rendu navigateur (page sous authentification, aucun outil navigateur).

## Score : 22/40
| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 2 | Aucune confirmation après « Valider et enregistrer » |
| 2 | Langage métier | 3 | « Recherche » vs « Fiche prospect » |
| 3 | Contrôle | 2 | Échap/arrière-plan perdent les saisies ; Rejeter sans annulation |
| 4 | Cohérence | 2 | Barre de filtres différente de FilterBar |
| 5 | Prévention des erreurs | 2 | Valider actif avec « Aucun changement » |
| 6 | Reconnaissance | 3 | Actuel/Nouveau côte à côte, mail visible |
| 7 | Efficacité | 1 | Pas de raccourcis, pas de suivant, doublons |
| 8 | Sobriété | 3 | Historique 100 % « Non pertinent » |
| 9 | Récupération | 2 | reject() avale les erreurs réseau |
| 10 | Aide | 2 | « Inclure », « Remplacer par », réouverture non expliqués |

## Détecteur
0 finding sur 9 fichiers. Grep : text-[13px] x2, text-[15px] ; focus fond seul prospects-board.tsx:150 ; dialogues sans nom accessible ni gestion du focus.

## Problèmes prioritaires
- [P1] Pas de fin après validation ni d'enchaînement — toast + annuler + mail suivant (harden)
- [P1] Modale : pas de focus trap/initial/retour, Échap et arrière-plan perdent les saisies — Dialog Base UI (harden)
- [P1] Rejeter depuis la file silencieux, sans annulation, erreurs avalées (prospects-board.tsx:33-42) (harden)
- [P2] Historique saturé de « Non pertinent », point gris ~1.2:1 ; doublons d'expéditeur (distill)
- [P2] Incohérences : toolbar vs FilterBar, pastilles personas, vocabulaire recherche/fiche prospect (polish)

## Personas
- Commercial 30 mails/jour : ~6 lignes visibles, 3 tab stops par ligne, pas de raccourcis/suivant.
- Nouveau commercial : « Inclure » obscur, Valider actif sans changement, rejet perçu irréversible.
- Clavier/lecteur d'écran : focus hors modale, overlay « Valider {nom} » trompeur.

## Mineurs
« Annuler » ambigu à côté de « Rejeter le mail » ; modale empilée sans grid-rows sous lg ; chargement sans squelette ; file plafonnée à 200 sans le dire ; tutoiement des erreurs.

## Questions
- Vue scindée file + relecture permanente ?
- Afficher « Non pertinent » ou seulement un compteur ?
- Une validation pour deux fils de la même personne ?
