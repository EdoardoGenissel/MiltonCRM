Synthèse de l'atelier de cadrage CRM Milton 

Scope et jalons du CRM

La V1 (juillet → septembre) a un objectif central : la fiche contact unifiée cross-pôle (prospect, acquéreur, locataire, propriétaire bailleur), plus les entités mandats et biens. Aujourd'hui la donnée est dispersée principalement entre Apimo et Septéo ; le CRM la centralise dans une vue liste + une fiche détail regroupant les données des différentes sources.

Deux temps distincts à bien garder en tête :

V1 (septembre) : import manuel. Milton exporte depuis Apimo et Septéo, puis importe dans le CRM (fichier Excel). Pas d'interrogation API automatique à ce stade. L'automatisation des estimations fait aussi partie de la V1.
Octobre → décembre : synchronisation automatique des mandats et biens via API (Apimo, Septéo, Pennylane), fin de l'import manuel.

Cadrage de la fiche - livrables attendus de Milton

Pour construire la base de données (champs par entité + relations), Jérémy a besoin de voir la structure réelle des données côté Apimo et Septéo. À transmettre dans les prochains jours (screenshots ou vidéos + exports) :

comment sont organisées les fiches prospect, locataire, propriétaire bailleur, ainsi que les mandats et biens ;
un export Apimo et un export Septéo pour mapper toutes les données à récupérer.
Répartition confirmée : groupe prospect dans Apimo, groupe propriétaire / locataire (gestion) dans Septéo. Pas de conflit de personas attendu, mais un prospect peut aussi être propriétaire. Stevyn n'a accès qu'à Apimo ; Septéo dépend de Johan.


Champs de qualification prospect

Point acté : tout ce qui qualifie un prospect aujourd'hui dans Apimo doit se retrouver au minimum dans le CRM (champs supplémentaires possibles ensuite). Vu à l'écran sur la fiche Apimo :

basique : nom, prénom, téléphone, email ;
alerte abonné (pour le croisement automatique), classification (urgence / actif), origine du prospect, localisation par commune ;
catégories utilisées : Vente ou Location, type de bien (maison, appartement, T4...), montant de loyer max avec marge de 10 %.
Non utilisés : location saisonnière, programme, viager, enchères, secteur.

Rôles utilisateurs

Pas de rôles différenciés dans le CRM : tout le monde voit la même chose. Seule nuance, la source du prospect (traçabilité commerciale) doit être visible - décision prise de l'afficher pour tous plutôt que de gérer des rôles.


Ringover - matching des appels

Fonctionnalité prévue : à l'appel entrant, détecter automatiquement le contact dans le CRM. Le matching se fait sur les 3 seules données Ringover (nom, prénom, numéro). Actif pour tous les utilisateurs. Stevyn met la clé Ringover à disposition.


Automatisation des estimations (dans la V1)

Processus actuel : RDV pris via Plateau → commercial remplit un formulaire JotForm sur place → données reçues par mail → ressaisie manuelle dans CityScan pour générer l'estimation (double saisie lourde). CityScan sélectionne automatiquement des biens comparables par type/localisation. Le rapport part au commercial (mise en vente) ou au client (quand facturé).

À automatiser : JotForm → CityScan. Accès à prévoir : API CityScan (à demander, détenue via Septéo) et accès JotForm pour le linkage. À travailler pour septembre - à ne pas trop tarder sur les accès.


Points ouverts / à étudier (importants)

Bidirectionnalité CRM ↔ Apimo. Initialement prévu en descendant seul (Apimo → CRM). Johan veut du bidirectionnel : pouvoir remonter des prospects créés dans le CRM vers Apimo, sinon le croisement prospect/produit ne se fait jamais. Implique une gestion de conflits (doublons). À étudier une fois l'API obtenue, et à valider auprès d'Apimo (faisabilité). Point non trivial.
Croisement prospect/produit (baguette magique Apimo). Fonctionnalité propre à Apimo, hors scope : le CRM peut lire la donnée une fois générée, mais ne refera pas la génération.
Prospects perdus dans Plateau. Les prospects issus d'un appel téléphonique ne sont pas saisis dans Apimo (les commerciaux évitent la double saisie), ils restent dans Plateau (type Google Agenda, sans CRM ni API) et sont perdus. Plateau n'étant pas ouvert, la seule piste est Google Agenda, mais on n'en récupère que l'adresse du bien, sans qualification du projet. À cadrer : comment faire remonter au minimum le prospect dans le CRM.
Piste transcripts d'appels + IA. Tous les appels Ringover sont enregistrés. Piste à explorer pour faciliter la saisie via extraction IA des transcripts (Jérémy le fait déjà sur un autre projet avec Aircall, concurrent de Ringover). À creuser côté doc/automatisations Ringover.
Objectif de fond exprimé par Milton : réduire la multiplication des saisies (Plateau, Apimo, simulation financière en cours de mise en place, CityScan) vers une porte d'entrée unique qui alimente les outils périphériques.

État des accès API (impact CRM)

Apimo : upgrade d'offre requis (+300 €/mois) pour l'API. Offre reçue, Johan va valider. Pas bloquant pour la V1 (import), mais anticipation souhaitée.
Septéo : relancé, en attente de retour.
CityScan : à demander via Septéo. Important pour septembre.
Notion : clé à générer côté Milton (simple).
Plateau : pas d'API → alternative se plugger directement sur Google Agenda.
Ringover, JotForm, Pennylane : déjà disponibles. Modelo/Mynotary à envoyer.

