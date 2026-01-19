# 🏷️ Guide d'Utilisation des Marques

Ce document explique quelles catégories et sous-catégories sont autorisées à utiliser la table `marques`. Ce filtrage est essentiel pour maintenir la cohérence des données lors de la création d'annonces.

---

## 1. 📊 Catégories Autorisées

La table `marques` est segmentée par catégorie via la colonne `categorie_marque`. Seules les catégories suivantes disposent de marques associées dans la base de données :

| ID | Libellé Catégorie | Exemples de Marques |
| :--- | :--- | :--- |
| **1** | **Auto** | Peugeot, Renault, Volkswagen, Audi... |
| **2** | **Moto** | Yamaha, Piaggio, Vespa, Peugeot (Moto)... |
| **4** | **Informatique** | HP, Dell, Apple, Asus... |
| **5** | **GSM** | Samsung, iPhone, Huawei, Xiaomi... |
| **10** | **Image & Son** | Sony, Nikon, Canon (Photo)... |
| **11** | **Électroménager** | Samsung (Frigo), LG, Whirlpool... |
| **12** | **Mode & Vêtements** | Zara, Nike, Adidas... |

---

## 2. 🚫 Catégories Interdites (Exemples)

Certaines catégories n'utilisent **jamais** la table des marques. Pour ces annonces, le champ `marqueId` doit rester `NULL`.

*   **Service (ID 9)** : On ne lie pas une marque à un service de plomberie ou d'électricien.
*   **Immobilier (ID 3)** : Une maison ou un terrain n'a pas de "Marque" au sens industriel.
*   **Emploi** : Une offre d'emploi est liée à un annonceur/entreprise, pas à une marque de produit.

---

## 🛠️ Logique pour le Développement

### Frontend (Formulaire d'annonce)
1.  L'utilisateur choisit une **Catégorie**.
2.  Si l'ID de la catégorie fait partie de la liste autorisée (voir section 1) :
    *   Afficher le champ de sélection "Marque".
    *   Charger les marques via `SELECT * FROM marques WHERE categorie_marque = [ID_CHOISI]`.
3.  Sinon :
    *   Masquer le champ "Marque".
    *   Envoyer `null` pour le champ `marqueId` lors de la sauvegarde.

### Backend (Validation)
Lors de la réception d'une annonce, vérifiez que si un `marqueId` est fourni, sa propriété `categorie_marque` correspond bien à la `categorieId` de l'annonce.

---

## 3. ⚠️ Cas Particuliers : Sous-Catégories "Génériques"

Même au sein des catégories autorisées, certaines sous-catégories ont souvent des objets sans marque ou dont la marque n'est pas répertoriée. Pour celles-ci, il est conseillé de rendre le champ **facultatif** ou de ne pas l'imposer :

### Accessoires et Consommables
*   **GSM > Accessoires téléphonie (ID 15)** : Chargeurs, coques, câbles (très souvent générique).
*   **Informatique > Accessoires informatique (ID 12)** : Tapis de souris, câbles, sacoches.
*   **Auto > Pièces - Accessoires (ID 3)** : Enjoliveurs, tapis de sol, ampoules.
*   **Moto > Pièces moto (ID 6)** : Outillage de base, accessoires génériques.

### Beauté et Jardinage
*   **Electroménager > Bricolage - Jardinage (ID 33)** : Outillage manuel, pots de fleurs.
*   **Mode > Produits de beauté (ID 36)** : Maquillage, parfums (les marques sont importantes mais rarement présentes dans la table `marques` qui est centrée sur le "dur").

**Conseil UI** : Pour ces sous-catégories, il est recommandé d'afficher le champ Marque comme **facultatif** et de sélectionner l'option **"Générique / Autre"** par défaut.
