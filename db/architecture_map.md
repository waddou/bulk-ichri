# 🏗️ Architecture et Dépendances (Ichri Modernisé)

Ce document présente les relations entre les tables et l'ordre de priorité pour l'intégrité des données.

---

## 1. 🗺️ Carte des Dépendances (Relations)

L'intégrité de la base de données repose sur les relations suivantes. Les flèches `A -> B` indiquent qu'une ligne dans `A` a besoin d'un ID valide dans `B`.

### Noyau Central
*   **Annonce** ➡️ `Annonceur` (Propriétaire)
*   **Annonce** ➡️ `Categorie` & `SousCategorie` (Classification)
*   **Annonce** ➡️ `Gouvernorat` & `Ville` (Localisation)
*   **Annonce** ➡️ `Marque` (Optionnel)

### SEO & Navigation
*   **Landing Page** ➡️ `Categorie` / `SousCategorie` (Optionnel)
*   **Landing Page** ➡️ `Gouvernorat` / `Ville` (Optionnel)

---

## 2. 🛡️ Ordre d'Insertion (Data Integrity)

Si vous devez peupler la base de données de zéro, respectez scrupuleusement cet ordre pour éviter les erreurs de clés étrangères :

1.  **Référentiels Indépendants** : `Gouvernorat`, `Categorie`.
2.  **Référentiels Dépendants** : `Ville` (dépend du Gouvernorat), `SousCategorie` (dépend de la Catégorie), `Marque`.
3.  **Utilisateurs** : `Annonceur`, `Admin`.
4.  **Contenu** : `Annonce` (dépend de tout ce qui précède).
5.  **Interactions** : `Contact`, `ContactAnnonceur`, `ActivationAnnonceur`.
6.  **SEO Unifié** : `LandingPage`.

---

## 📉 3. Résumé du Nettoyage (Dette Technique Éliminée)

Le schéma a été purgé des tables redondantes suivantes. Leurs fonctionnalités sont désormais intégrées dans `LandingPage` ou `Annonce` :

| Ancienne Table | Remplacée par |
| :--- | :--- |
| `custom_page` | `landing_pages` |
| `seo_ville` | `landing_pages` |
| `annonces_seo` | `annonces` (colonnes meta_*) |
| `rubrique` | `landing_pages` |
| `seo` | `categories` / `sous_categories` / `landing_pages` |
| `messages` / `stats` / `date_stat` | Supprimées (Analytics Externes recommandés) |

---

## 🚀 4. Recommandation Indexation

Les index suivants sont critiques et déjà en place via les migrations récentes :
*   `idx_annonces_attributes` (**GIN**) : Recherche JSONB.
*   `idx_annonces_search` (**GIN**) : Full-Text Search.
*   `idx_landing_pages_slug` (**B-Tree**) : Résolution d'URL.
*   `idx_annonces_price_search` (**B-Tree**) : Tris et filtres numériques.
