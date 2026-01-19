# 🛠️ Guide Admin : CRUD Landing Pages & Annonces

Ce document explique comment gérer les nouvelles structures de données depuis l'interface d'administration.

---

## 1. 🗺️ Gestion des Landing Pages

Les Landing Pages sont les points d'entrée SEO du site. Elles permettent de créer des pages de destination "sur mesure".

### Création d'une page
Lors de la création, vous devez définir :
1.  **Le Slug** : L'URL unique (ex: `immobilier-luxe-tunis`).
2.  **Les Filtres** : 
    *   Sélectionnez une catégorie et/ou une ville.
    *   Ou entrez un `search_term` (ex: "Peugeot 206").
3.  **Le Contenu SEO** : Remplissez le meta title, h1, et les textes riches (`text_top` / `text_bottom`).

### 🌟 Featured (Mise en avant)
Dans le champ `featured_ids`, entrez une liste d'IDs d'annonces séparés par des virgules.
*   **Logique Backend** : Ces annonces seront chargées en priorité, suivies par les annonces répondant aux filtres automatiques.

### 🚫 Banned (Exclusion)
Dans le champ `banned_ids`, entrez les IDs des annonces que vous ne voulez **pas** voir sur cette page.

---

## 2. 🚗 Création d'une Annonce (Modernisée)

Le formulaire de création d'annonce doit maintenant gérer les attributs de manière dynamique.

### Saisie des Images
Ne demandez plus "Image 1", "Image 2". Proposez un champ de type **Multi-Upload**. 
*   **Stockage** : Les URLs générées doivent être envoyées à la base de données sous forme de tableau (`images_list`).

### Attributs Dynamiques
Selon la catégorie choisie, affichez les champs correspondants :
*   **Auto** : Kilométrage, Énergie, Année.
*   **Immo** : Surface, Meublé, Chambres.
*   **Technique** : Ces données doivent être encapsulées dans un objet JSON unique nommé `attributes`.

### 💰 Traitement du Prix
L'admin doit sauvegarder deux valeurs :
1.  `prix_annonce` : Ce que l'utilisateur a tapé (ex: "20").
2.  `price_search` : La version calculée (ex: 20000). 
    *   *Note* : Prévoyez une fonction de normalisation côté serveur ou frontend pour automatiser ce calcul lors de la sauvegarde.

---

## 3. 🌐 Tables de Référence

N'oubliez pas que vous pouvez maintenant personnaliser le SEO de chaque Ville et chaque Catégorie directement dans leurs formulaires respectifs (Meta title, h1, text_top).
