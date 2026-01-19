# 🛠️ Guide : Gestion des Types de Services (JSONB)

Dans l'architecture modernisée d'IchriV2, le champ `type_service` a été supprimé du schéma SQL fixe pour être intégré de manière flexible dans le champ `attributes` (JSONB).

---

## 1. 🔍 Pourquoi ce changement ?

L'ancien champ `type_service` n'était utilisé que pour une petite fraction des annonces (principalement dans la catégorie **Services**). L'intégrer dans `attributes` permet de :
1.  **Alléger la table principale** (Lean Schema).
2.  **Garder une flexibilité totale** : On peut ajouter de nouveaux types de services sans modifier la structure de la base de données.

---

## 2. 📊 Types de Services Existants (Valeurs Migrées)

Lors de la migration, les valeurs suivantes ont été injectées dans `attributes -> 'type_service'` pour les sous-catégories correspondantes :

| Sous-Catégorie | Types de Services trouvés |
| :--- | :--- |
| **Services informatique** | Maintenance informatique, Formation, Autre |
| **Installation - Dépannage** | Plombier, Electricien, Construction, Déménagement, Artisan |
| **Agences de voyage - Hôtels** | Voyage, Babysitting, Soin et Beauté |

---

## 💻 3. Utilisation pour le Développement

### Backend (Prisma)
Pour créer une annonce de service avec son type spécifique :

```typescript
const nouvelleAnnonce = await prisma.annonce.create({
  data: {
    // ... autres champs
    attributes: {
      type_service: "Plombier"
    }
  }
});
```

### Frontend (Filtrage)
Pour filtrer les annonces par type de service via l'API :

```typescript
const plombiers = await prisma.annonce.findMany({
  where: {
    attributes: {
      path: ['type_service'],
      equals: 'Plombier'
    }
  }
});
```

---

## 🎨 4. Recommandation UI/UX

Lorsqu'un utilisateur sélectionne une sous-catégorie de type **Service** (ex: ID 7, 8 ou 9), une liste déroulante dynamique doit apparaître pour lui permettre de choisir la spécialité. Cette spécialité doit ensuite être enregistrée dans la clé `type_service` de l'objet `attributes`.
