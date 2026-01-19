# 🧠 Logique de Filtrage et Recherche (Backend Edition)

Ce guide explique comment implémenter les filtres avancés sur la table `annonces` en utilisant les nouvelles colonnes modernisées.

---

## 1. 💰 Filtrage par Prix (Normalisé)

Ne jamais filtrer sur `prix_annonce` (qui est du texte). Utilisez `price_search`.

### Requête Prisma
```typescript
const annonces = await prisma.annonce.findMany({
  where: {
    priceSearch: {
      gte: 15000,
      lte: 30000
    }
  },
  orderBy: {
    priceSearch: 'asc'
  }
});
```

---

## 2. 🚗 Attributs Techniques (JSONB)

Les filtres spécifiques à une catégorie (ex: kilométrage, surface) se trouvent dans l'objet `attributes`.

### Requête SQL (Recommandée pour la performance)
Pour filtrer efficacement, utilisez l'opérateur `->>` de PostgreSQL.

```sql
-- Trouver les voitures Diesel avec moins de 100k km
SELECT * FROM annonces 
WHERE attributes ->> 'energie' = 'Diesel'
AND (attributes ->> 'kilometrage')::int < 100000;
```

### Utilisation avec Prisma
Prisma supporte le filtrage JSONB nativement :
```typescript
const result = await prisma.annonce.findMany({
  where: {
    attributes: {
      path: ['energie'],
      equals: 'Diesel'
    }
  }
});
```

---

## 🔎 3. Recherche Full-Text (Sémantique)

L'indexation Full-Text est gérée par la colonne `searchIndex` (tsvector).

### Requête SQL (Ranking)
Pour trier les résultats par pertinence (ceux qui ont le mot dans le titre sortent en premier) :

```sql
SELECT titre_annonce, ts_rank(search_index, query) as rank
FROM public.annonces, to_tsquery('public.french_unaccent', 'Vente & Appartement') query
WHERE search_index @@ query
ORDER BY rank DESC;
```

---

## 🖼️ 4. Gestion des Images

La colonne `images_list` est un tableau de chaînes de caractères.

### Frontend (React/Next.js)
```jsx
const AnnonceGallery = ({ imagesList }) => {
  if (!imagesList || imagesList.length === 0) return <Placeholder />;
  
  return (
    <div className="gallery">
      {imagesList.map((url, index) => (
        <img key={index} src={url} alt={`Vue ${index + 1}`} />
      ))}
    </div>
  );
};
```
