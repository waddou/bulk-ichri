<!--
SYNC IMPACT REPORT
==================
Version change: 0.0.0 → 1.0.0 (MAJOR - Initial constitution)
Modified principles: N/A (initial creation)
Added sections:
  - Core Principles (5 principles)
  - Security Requirements
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (Constitution Check section exists)
  - .specify/templates/spec-template.md ✅ (Compatible)
  - .specify/templates/tasks-template.md ✅ (Compatible)
Follow-up TODOs: None
-->

# LocalAdmin Bulk-Ichri Constitution

## Core Principles

### I. Security-First (NON-NEGOTIABLE)

Toute fonctionnalité DOIT respecter les règles de sécurité suivantes :

- **Row Level Security (RLS)** DOIT être activé sur TOUTES les tables Supabase
- La clé `service_role` ne DOIT JAMAIS être exposée côté client
- Les opérations admin DOIVENT passer par des API Routes server-side avec vérification de session
- La clé `anon` est réservée aux opérations de lecture publique uniquement
- Toute nouvelle table DOIT avoir des politiques RLS définies avant mise en production

**Rationale**: Une plateforme d'annonces classées manipule des données utilisateurs sensibles. Une faille de sécurité compromettrait la confiance des utilisateurs et l'intégrité des données.

### II. API-First Design

Toute fonctionnalité backend DOIT exposer une API REST claire :

- Les endpoints DOIVENT suivre le pattern `/api/[resource]` pour Next.js
- Les réponses DOIVENT être en JSON avec structure cohérente `{ data, error }`
- Les erreurs DOIVENT retourner des codes HTTP appropriés (400, 401, 403, 404, 500)
- La validation des entrées DOIT être effectuée côté serveur (whitelist de tables, sanitization)

**Rationale**: L'architecture admin/frontend séparée nécessite des contrats d'API clairs pour maintenir la cohérence et faciliter les évolutions.

### III. Data Integrity

L'intégrité des données DOIT être garantie par :

- Respect de l'ordre d'insertion : Référentiels → Utilisateurs → Contenu → Interactions → SEO
- Les clés étrangères DOIVENT être validées avant insertion
- Les tables de backup (`*_copy`) DOIVENT être maintenues pour les données critiques
- Les migrations DOIVENT être versionnées et réversibles

**Rationale**: Le schéma de base de données a des dépendances complexes (Annonce → Catégorie, Ville, Annonceur). Violer l'ordre d'insertion cause des erreurs de clés étrangères.

### IV. SEO-Centric Architecture

Le SEO est une fonctionnalité centrale, pas un ajout :

- Chaque entité publique (catégorie, ville, landing page) DOIT avoir des champs meta_title, meta_description
- Les slugs DOIVENT être uniques et indexés (B-Tree)
- La table `landing_pages` unifie toutes les pages SEO (remplace les anciennes tables fragmentées)
- Les URLs DOIVENT être prévisibles et stables

**Rationale**: Le projet est une plateforme d'annonces classées où le trafic organique est critique pour l'acquisition d'utilisateurs.

### V. Simplicity & YAGNI

Privilégier la simplicité :

- Commencer par la solution la plus simple qui fonctionne
- Éviter les abstractions prématurées
- Une fonctionnalité non utilisée est une dette technique
- Préférer la composition à l'héritage
- Limiter les dépendances externes au strict nécessaire

**Rationale**: Le projet a déjà subi un nettoyage de dette technique (suppression de tables redondantes). Maintenir cette discipline évite l'accumulation de complexité.

## Security Requirements

### Authentification Admin

- Session admin stockée côté client avec vérification serveur à chaque requête
- Header `x-admin-session` obligatoire pour toutes les opérations CRUD
- Validation de l'existence de l'admin en base avant exécution

### Politiques RLS Obligatoires

| Type de table | Politique anon | Politique authenticated |
|---------------|----------------|------------------------|
| Référentiels publics | SELECT only | SELECT only |
| Données utilisateur | Aucune | CRUD sur propres données |
| Tables admin | Aucune | Aucune (service_role only) |

### Validation des Entrées

- Whitelist des tables autorisées dans les API Routes
- Sanitization des paramètres avant requêtes SQL
- Pas de construction dynamique de requêtes avec entrées utilisateur non validées

## Development Workflow

### Stack Technique

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL), API Routes Next.js
- **ORM**: Prisma (pour génération de types et migrations)
- **Déploiement**: Vercel (frontend), Supabase (backend)

### Structure de Projet

```
localadmin/
├── src/app/           # Pages et API Routes Next.js
├── src/lib/           # Clients Supabase, utilitaires
├── docs/              # Documentation technique
db/
├── schema.prisma      # Schéma de base de données
├── *.md               # Documentation architecture
```

### Conventions de Code

- TypeScript strict mode activé
- Imports absolus avec alias `@/`
- Composants React fonctionnels uniquement
- Gestion d'erreurs explicite (pas de catch silencieux)

### Checklist Pré-Déploiement

- [ ] RLS activé sur toutes les nouvelles tables
- [ ] Variables d'environnement configurées
- [ ] Tests de sécurité curl effectués
- [ ] Documentation mise à jour

## Governance

### Hiérarchie des Documents

1. Cette Constitution (priorité maximale)
2. Documentation technique (`db/*.md`, `docs/*.md`)
3. Code source et commentaires

### Processus d'Amendement

1. Proposer la modification avec justification
2. Vérifier l'impact sur les templates existants
3. Mettre à jour la version selon SemVer :
   - **MAJOR**: Suppression/redéfinition de principe
   - **MINOR**: Ajout de principe ou section
   - **PATCH**: Clarifications, corrections mineures
4. Mettre à jour `LAST_AMENDED_DATE`

### Conformité

- Toute PR DOIT vérifier la conformité aux principes
- Les violations DOIVENT être justifiées dans le Complexity Tracking du plan
- Le fichier `localadmin/docs/RLS_BEST_PRACTICES.md` sert de guide de référence pour la sécurité

**Version**: 1.0.0 | **Ratified**: 2026-01-19 | **Last Amended**: 2026-01-19
