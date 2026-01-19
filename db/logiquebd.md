# 🏛️ Architecture & Logique de la Base de Données Ichri

Ce document détaille les choix d'architecture effectués pour moderniser la base de données, optimiser les performances de recherche et offrir une flexibilité maximale au Frontend.

---

## 1. 💰 Gestion des Prix ("La Logique Tunisienne")

Le stockage des prix dans un site d'annonces en Tunisie est complexe car les utilisateurs ont des habitudes de saisie variées (millièmes, devises étrangères, prix par période).

### Structure des colonnes
*   **`prix_annonce` (Text)** : Stocke la saisie brute de l'utilisateur. 
    *   *Exemples* : `"20"`, `"100 DT/semaine"`, `"500 EUR"`.
    *   **Usage** : Affichage direct sur le Frontend pour respecter l'intention du vendeur.
*   **`price_search` (BigInt)** : Colonne calculée et normalisée pour les outils de filtre et de tri.
    *   **Usage** : Comparaisons (Min/Max) et tris (Croissant/Décroissant).

### Logique de Normalisation
Lors de l'insertion ou de la migration, un script traite le prix :
1.  **Extraction** : On ne garde que les caractères numériques.
2.  **Conversion Auto (Catégorie 1)** : Si la catégorie est "Automobile" et que le prix extrait est `< 1000`, on multiplie automatiquement par 1000 (ex: "20" devient `20000`).
3.  **Filtrage du Spam** : Les valeurs manifestement aberrantes (plus de 12 chiffres) sont neutralisées pour ne pas fausser les filtres globaux.

---

## 2. 🚗 La table `annonces` (Cœur du Système)

La table `annonces` a été profondément modernisée pour devenir le moteur central du site.

### Structure Moderne
1.  **Données Fixes** : ID, Titre, URL, Description, Catégorie, Géo, **Meta Title**, **Meta Description**.
2.  **Données Flexibles (`attributes` JSONB)** : Regroupe toutes les spécificités techniques (km, énergie, surface, etc.) en un seul objet indexé.
3.  **Galerie d'Images (`images_list` Array)** : Un tableau de textes (`text[]`) permettant un nombre illimité d'images par annonce.
4.  **Moteur de Filtre (`price_search` BigInt)** : Version numérique et normalisée du prix.
5.  **Moteur de Recherche (`search_index` tsvector)** : Index Full Text gérant la pertinence (Titre > Description) et l'insensibilité aux accents (`unaccent`).

---

## 3. 🗺️ Landing Pages (Le Hub SEO Unifié)

Auparavant fragmentées, toutes les pages de destination (SEO) sont désormais centralisées dans une table unique `landing_pages`.

### Unification des concepts
La table `landing_pages` fusionne et remplace les anciens concepts de :
*   **Villes SEO** (anc. `seo_ville`)
*   **Pages Personnalisées** (anc. `custom_page`)
*   **Rubriques & Requêtes** (anc. `rubrique`)

### Fonctionnalités de Contrôle (Admin)
*   **Filtres Dynamiques** : Combinaisons de Catégorie, Sous-catégorie, Ville, Gouvernorat et Terme de recherche.
*   **Featured IDs (`featured_ids` integer[])** : Liste d'annonces choisies par l'admin pour être affichées en priorité.
*   **Banned IDs (`banned_ids` integer[])** : Liste d'annonces explicitement exclues de cette page.

---

## 4. 🌐 Tables de Référence & Fallback SEO

Les tables de classification (`categories`, `sous_categories`, `gouvernorats_tn`, `villes_tn`) ont été enrichies pour garantir un SEO de qualité par défaut.

### Colonnes SEO standardisées
Chaque table de référence dispose des champs suivants :
*   `meta_title`, `meta_description`, `h1`, `h2`, `text_top`, `text_bottom`, `keywords`.

### ⚠️ Logique de Migration (Hiérarchie Sémantique)
Lors de la migration depuis l'ancien système, une règle de "décalage" a été appliquée pour maximiser la valeur SEO :
*   L'ancien **`h2`** est devenu le nouveau **`h1`** principal.
*   L'ancien **`h2_bas`** est devenu le nouveau **`h2`** secondaire.
*   L'ancien **`text_bas`** a été consolidé dans **`text_bottom`**.

### Logique de Rendu
1.  Si une **Landing Page** existe pour l'URL demandée : on utilise son contenu éditorial et ses `featured_ids`.
2.  Sinon : on utilise le contenu SEO de la **Table de Référence** correspondante.

---

## 5. 🛠️ Exemples de requêtes SQL (PostgreSQL)

### Rechercher par prix normalisé
```sql
SELECT * FROM annonces 
WHERE price_search BETWEEN 15000 AND 25000 
ORDER BY price_search DESC;
```

### Rechercher par pertinence (Full Text)
```sql
SELECT titre_annonce, ts_rank(search_index, query) as rank
FROM public.annonces, to_tsquery('public.french_unaccent', 'voiture & peugeot') query
WHERE search_index @@ query
ORDER BY rank DESC;
```

---

## 6. 🛡️ Intégrité Référentielle

*   **Foreign Keys** : Toutes les relations critiques sont maintenues (Annonces -> Villes, Annonces -> Catégories).
*   **Sécurité RLS** : Les politiques Row Level Security sont configurées sur chaque table (Lecture Publique / Écriture Admin).

---

## 7. 📉 Philosophie "Lean Schema" (Optimisation)

Dans une approche d'Expert Data Architect, le schéma a été purgé de toutes les tables redondantes ou obsolètes pour minimiser la dette technique et maximiser la clarté.

### Tables supprimées (Nettoyage)
*   `custom_page` / `seo_ville` / `annonces_seo` / `rubrique` / `seo` : Toutes fusionnées dans le système unifié de **Landing Pages** et les tables de référence.
*   `messages` / `stats` / `date_stat` : Supprimées.
*   `annonceurs2` : Résidu de migration supprimé.
