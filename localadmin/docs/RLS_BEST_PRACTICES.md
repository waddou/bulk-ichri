# Guide RLS Supabase - Sécurité et Bonnes Pratiques

## 📋 Table des matières
1. [Comprendre RLS](#1-comprendre-rls)
2. [Architecture recommandée](#2-architecture-recommandée)
3. [Configuration étape par étape](#3-configuration-étape-par-étape)
4. [Patterns de politiques RLS](#4-patterns-de-politiques-rls)
5. [Erreurs courantes à éviter](#5-erreurs-courantes-à-éviter)
6. [Checklist de sécurité](#6-checklist-de-sécurité)

---

## 1. Comprendre RLS

### Qu'est-ce que RLS ?
**Row Level Security (RLS)** est une fonctionnalité PostgreSQL qui permet de contrôler l'accès aux lignes d'une table en fonction de l'utilisateur qui exécute la requête.

### Les 2 clés Supabase

| Clé | Rôle Postgres | Utilisation | Sécurité |
|-----|---------------|-------------|----------|
| `anon` | `anon` | Client-side (navigateur, mobile) | ⚠️ Exposée publiquement |
| `service_role` | `service_role` | Server-side uniquement | 🔒 Jamais exposée |

### Règle d'or
```
🔒 service_role = BYPASS RLS (accès total)
⚠️ anon/authenticated = Soumis aux politiques RLS
```

---

## 2. Architecture recommandée

### Pattern sécurisé pour applications admin

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  (Next.js, React, Vue...)                                   │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │ Lecture publique│    │ Opérations admin (CRUD)         │ │
│  │ (anon key)      │    │ → API Route avec session check  │ │
│  └────────┬────────┘    └────────────────┬────────────────┘ │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            ▼                              ▼
┌───────────────────────┐    ┌────────────────────────────────┐
│   Supabase Direct     │    │   API Route (Server-side)      │
│   avec clé anon       │    │   avec service_role key        │
│                       │    │                                │
│   RLS ACTIVÉ ✓        │    │   1. Vérifie session admin     │
│   SELECT only         │    │   2. Valide les permissions    │
│                       │    │   3. Exécute avec service_role │
└───────────────────────┘    └────────────────────────────────┘
```

---

## 3. Configuration étape par étape

### Étape 1: Activer RLS sur toutes les tables

```sql
-- TOUJOURS activer RLS sur chaque table
ALTER TABLE public.ma_table ENABLE ROW LEVEL SECURITY;
```

### Étape 2: Créer les politiques de lecture publique

```sql
-- Politique SELECT pour les utilisateurs anonymes
CREATE POLICY "anon_read_ma_table" ON public.ma_table
FOR SELECT
TO anon
USING (true);  -- ou une condition plus restrictive
```

### Étape 3: Créer les politiques pour utilisateurs authentifiés

```sql
-- Lecture pour utilisateurs connectés
CREATE POLICY "authenticated_read_ma_table" ON public.ma_table
FOR SELECT
TO authenticated
USING (true);

-- Écriture pour utilisateurs connectés (avec condition)
CREATE POLICY "authenticated_write_ma_table" ON public.ma_table
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);  -- L'utilisateur ne peut créer que ses propres données

-- Mise à jour pour utilisateurs connectés
CREATE POLICY "authenticated_update_ma_table" ON public.ma_table
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Suppression pour utilisateurs connectés
CREATE POLICY "authenticated_delete_ma_table" ON public.ma_table
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### Étape 4: Configurer l'API Route sécurisée (Next.js)

```typescript
// src/app/api/admin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client avec service_role (BYPASS RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Vérification de session admin
async function verifyAdminSession(request: NextRequest): Promise<boolean> {
  const adminSession = request.headers.get('x-admin-session')
  
  if (!adminSession) return false

  try {
    const admin = JSON.parse(adminSession)
    
    // Vérifier que l'admin existe en base
    const { data, error } = await supabaseAdmin
      .from('admin')
      .select('id_admin')
      .eq('id_admin', admin.id_admin)
      .single()

    return !error && data !== null
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  // 1. Vérifier l'authentification
  const isAdmin = await verifyAdminSession(request)
  
  if (!isAdmin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // 2. Valider les paramètres
  const { action, table, data, id, idField } = await request.json()

  const allowedTables = ['categories', 'products', 'users']
  if (!allowedTables.includes(table)) {
    return NextResponse.json({ error: 'Table non autorisée' }, { status: 400 })
  }

  // 3. Exécuter l'opération avec service_role
  switch (action) {
    case 'update':
      const { data: result, error } = await supabaseAdmin
        .from(table)
        .update(data)
        .eq(idField, id)
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ data: result })
      
    // ... autres actions
  }
}
```

### Étape 5: Appeler l'API depuis le frontend

```typescript
// Fonction d'update sécurisée
const updateData = async (table: string, id: number, data: object) => {
  const adminSession = localStorage.getItem('admin_session')
  
  if (!adminSession) {
    throw new Error('Session expirée')
  }

  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-session': adminSession
    },
    body: JSON.stringify({
      action: 'update',
      table,
      id,
      idField: 'id',
      data
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return response.json()
}
```

---

## 4. Patterns de politiques RLS

### Pattern 1: Lecture publique, écriture admin

```sql
-- Tout le monde peut lire
CREATE POLICY "public_read" ON public.articles
FOR SELECT TO anon, authenticated USING (true);

-- Seuls les admins peuvent écrire (via API Route avec service_role)
-- Pas de politique INSERT/UPDATE/DELETE pour anon/authenticated
```

### Pattern 2: Données utilisateur privées

```sql
-- L'utilisateur ne voit que ses propres données
CREATE POLICY "user_own_data" ON public.user_profiles
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Pattern 3: Données avec visibilité conditionnelle

```sql
-- Voir les données publiques OU ses propres données
CREATE POLICY "public_or_own" ON public.posts
FOR SELECT TO authenticated
USING (
  is_public = true 
  OR auth.uid() = author_id
);
```

### Pattern 4: Hiérarchie de rôles

```sql
-- Créer une fonction pour vérifier le rôle
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin 
    WHERE mail_admin = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Utiliser dans les politiques
CREATE POLICY "admin_full_access" ON public.sensitive_data
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
```

---

## 5. Erreurs courantes à éviter

### ❌ Erreur 1: Oublier d'activer RLS

```sql
-- MAUVAIS: Table sans RLS = accès total avec anon key
CREATE TABLE public.secrets (id int, data text);

-- BON: Toujours activer RLS
ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;
```

### ❌ Erreur 2: Exposer service_role côté client

```typescript
// MAUVAIS: service_role dans le navigateur
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)

// BON: service_role uniquement côté serveur (API Routes)
```

### ❌ Erreur 3: Politique trop permissive

```sql
-- MAUVAIS: Tout le monde peut tout faire
CREATE POLICY "allow_all" ON public.users
FOR ALL USING (true) WITH CHECK (true);

-- BON: Restreindre par action et condition
CREATE POLICY "users_read_own" ON public.users
FOR SELECT TO authenticated USING (auth.uid() = id);
```

### ❌ Erreur 4: Ne pas valider côté serveur

```typescript
// MAUVAIS: Faire confiance aux données client
const { table } = req.body
await supabaseAdmin.from(table).delete()  // SQL Injection possible!

// BON: Valider les entrées
const allowedTables = ['categories', 'products']
if (!allowedTables.includes(table)) {
  return res.status(400).json({ error: 'Table non autorisée' })
}
```

### ❌ Erreur 5: Oublier WITH CHECK pour INSERT/UPDATE

```sql
-- MAUVAIS: USING seul ne protège pas INSERT
CREATE POLICY "insert_policy" ON public.posts
FOR INSERT TO authenticated
USING (auth.uid() = author_id);  -- Ne fonctionne pas!

-- BON: Utiliser WITH CHECK pour INSERT/UPDATE
CREATE POLICY "insert_policy" ON public.posts
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);
```

---

## 6. Checklist de sécurité

### Avant déploiement

- [ ] RLS activé sur **toutes** les tables
- [ ] Aucune table sans politique (vérifier avec Security Advisor)
- [ ] `service_role` key **jamais** exposée côté client
- [ ] Variables d'environnement correctement configurées
- [ ] API Routes valident les sessions avant opérations
- [ ] Tables sensibles n'ont pas de politique `anon` pour écriture

### Vérification SQL

```sql
-- Lister les tables sans RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;

-- Lister toutes les politiques
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### Test de sécurité

```bash
# Tester avec curl sans authentification
curl -X POST "https://your-project.supabase.co/rest/v1/categories" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Injection"}'

# Doit retourner 401 ou erreur RLS, pas un succès!
```

---

## 📚 Ressources

- [Documentation officielle RLS Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Security Advisor](https://supabase.com/dashboard/project/_/advisors/security)

---

*Guide créé le 19/01/2026 - Projet LocalAdmin Ichri*
