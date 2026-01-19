# Signalement d'abus - Documentation Technique

## Vue d'ensemble

Le système de signalement d'abus permet aux utilisateurs de signaler des annonces suspectes, frauduleuses ou inappropriées. Les signalements sont sauvegardés dans la table `contact` existante et une notification email est automatiquement envoyée à l'administrateur concerné.

## Schéma de données

### Table `contact` (existante)

```sql
CREATE TABLE public.contact (
  id_contact serial NOT NULL,
  nom character varying(70) NOT NULL,
  email character varying(70) NOT NULL,
  tel character varying(50) NOT NULL,
  text text NOT NULL,
  id_annonce integer NOT NULL,
  date_contact date NOT NULL,
  CONSTRAINT contact_pkey PRIMARY KEY (id_contact),
  CONSTRAINT contact_id_annonce_fkey FOREIGN KEY (id_annonce) 
    REFERENCES annonces (id_annonce) ON UPDATE CASCADE ON DELETE CASCADE
);
```

### Format de stockage des signalements

Pour rester compatible avec le schéma existant, les signalements utilisent le champ `text` pour stocker un objet JSON structuré :

```json
{
  "type": "SIGNALEMENT_ABUS",
  "typeSignalement": "arnaque",
  "typeLabel": "Arnaque ou fraude",
  "urlAnnonce": "https://ichri.net/a/voiture-a-vendre",
  "titreAnnonce": "Voiture Toyota Prius 2019",
  "description": "Le vendeur demande un paiement par virement Western Union...",
  "signaleurNom": "Jean Dupont",
  "signaleurEmail": "jean.dupont@email.com",
  "dateSignalement": "2026-01-16T14:30:00.000Z"
}
```

## Types de signalement

| Clé | Libellé | Description |
|-----|---------|-------------|
| `arnaque` | Arnaque ou fraude | Prix trop beau pour être vrai, demande de virement suspect, phishing |
| `contenu_illegal` | Contenu illégal | Produits interdits, substances illicites, contenu prohibé |
| `faux_compte` | Faux compte | Photos volées, fausse identité, profil suspect |
| `doublon` | Annonce en double | Même annonce publiée plusieurs fois |
| `autre` | Autre raison | Autres types de problèmes non couverts |

## Flux de données

### 1. Soumission du formulaire (Frontend → Backend)

**Endpoint :** `POST /api/signalement`

**Headers :**
```
Content-Type: application/json
```

**Corps de la requête :**
```json
{
  "annonceId": 123,
  "titreAnnonce": "Voiture Toyota Prius 2019",
  "annonceUrl": "https://ichri.net/a/voiture-toyota-prius-2019",
  "typeSignalement": "arnaque",
  "description": "Le vendeur demande un paiement par virement Western Union...",
  "nom": "Jean Dupont",
  "email": "jean.dupont@email.com"
}
```

**Champs obligatoires :**
- `annonceId` (integer) : ID de l'annonce signalée
- `typeSignalement` (string) : Type de signalement
- `description` (string) : Description détaillée du problème

**Champs optionnels :**
- `titreAnnonce` (string) : Titre de l'annonce
- `annonceUrl` (string) : URL complète de l'annonce
- `nom` (string) : Nom du signaleur (défaut: "Anonyme")
- `email` (string) : Email du signaleur (défaut: "signalement@ichri.net")

### 2. Traitement Backend

```typescript
// Récupération de l'admin destinataire (ID 2)
const admin = await prisma.admin.findUnique({
  where: { id: 2 }
});

// Sauvegarde dans la table contact
const contact = await prisma.contact.create({
  data: {
    nom: nom || 'Anonyme',
    email: email || 'signalement@ichri.net',
    tel: '', // Champ obligatoire mais non utilisé
    text: JSON.stringify({
      type: 'SIGNALEMENT_ABUS',
      typeSignalement,
      typeLabel: getTypeSignalementLabel(typeSignalement),
      urlAnnonce,
      titreAnnonce,
      description,
      signaleurNom: nom || 'Anonyme',
      signaleurEmail: email || '',
      dateSignalement: new Date().toISOString()
    }),
    idAnnonce: Number(annonceId),
    dateContact: new Date()
  }
});

// Envoi de l'email à l'admin
await sendSignalementEmail(admin.mail, {
  idSignalement: contact.id,
  idAnnonce: Number(annonceId),
  titreAnnonce,
  urlAnnonce,
  typeSignalement: getTypeSignalementLabel(typeSignalement),
  description,
  signaleurNom: nom || 'Anonyme',
  signaleurEmail: email || 'Non fourni',
  dateSignalement: contact.dateContact.toISOString()
}, admin.nom);
```

### 3. Réponse Backend

**Succès (201 Created) :**
```json
{
  "success": true,
  "message": "Signalement envoyé avec succès",
  "data": {
    "id": 42,
    "date": "2026-01-16T14:30:00.000Z"
  }
}
```

**Erreur (400 Bad Request) :**
```json
{
  "success": false,
  "error": "Champs obligatoires manquants"
}
```

**Annonce non trouvée (404 Not Found) :**
```json
{
  "success": false,
  "error": "Annonce non trouvée"
}
```

## Notification Email

### Destinataire

L'email est envoyé à l'administrateur avec `id = 2`.

### Sujet du email

```
[SIGNALEMENT ABUS] Annonce #123 - Arnaque ou fraude
```

### Template HTML

Le template `signalement_admin.hbs` (ou défaut intégré) contient :
- ID du signalement et date
- Informations sur l'annonce (titre, URL)
- Type de signalement avec icône
- Description complète du problème
- Coordonnées du signaleur (si fournies)
- Lien vers la gestion dans l'admin

### Données du template

```typescript
{
  idSignalement: number,
  idAnnonce: number,
  titreAnonce: string,
  urlAnnonce: string,
  typeSignalement: string,
  description: string,
  signaleurNom: string,
  signaleurEmail: string,
  dateSignalement: string,
  adminNom: string,
  siteUrl: string,
  year: number
}
```

## Récupération des signalements (Admin)

### Endpoint

```
GET /api/signalement/:id
```

### Réponse

```json
{
  "success": true,
  "data": {
    "id": 42,
    "nom": "Jean Dupont",
    "email": "jean.dupont@email.com",
    "tel": "",
    "idAnnonce": 123,
    "dateContact": "2026-01-16",
    "estSignalement": true,
    "signalementDetails": {
      "type": "SIGNALEMENT_ABUS",
      "typeSignalement": "arnaque",
      "typeLabel": "Arnaque ou fraude",
      "urlAnnonce": "https://...",
      "titreAnnonce": "...",
      "description": "...",
      "signaleurNom": "...",
      "signaleurEmail": "...",
      "dateSignalement": "..."
    }
  }
}
```

## Intégration Frontend

### Composant BlocSignalement.astro

```astro
<BlocSignalement 
  annonceId={annonce.id_annonce}
  titre={annonce.titre_annonce}
  url={`${Astro.url.origin}${Astro.url.pathname}`}
/>
```

### Configuration environment

Dans le fichier `.env` du frontend :

```env
VITE_API_URL=http://localhost:3000
```

## Journalisation

Les actions sont journalisées avec le préfixe `[SIGNALEMENT]` :

```
[SIGNALEMENT] Nouveau signalement #42 pour annonce 123
[SIGNALEMENT] Erreur envoi email admin: ...
[SIGNALEMENT] Admin ID 2 non trouvé
```

## Considérations de sécurité

1. **Validation des entrées** : Tous les champs sont validés avant traitement
2. **Vérification de l'annonce** : L'existence de l'annonce est vérifiée
3. **Email admin** : L'admin destinataire est récupéré en base de données
4. **Sanitization** : Les données utilisateur sont échappées dans les emails

## Améliorations futures possibles

1. **Table dédiée** : Créer une table `signalements` avec des colonnes spécifiques
2. **Statut du signalement** : Ajouter un champ pour suivre l'état (nouveau, en cours, résolu)
3. **Historique** : Traçabilité des actions de l'admin sur le signalement
4. **Auto-moderation** : Bloquer automatiquement les annonces avec plusieurs signalements
5. **Confirmation email** : Envoyer un email de confirmation au signaleur
