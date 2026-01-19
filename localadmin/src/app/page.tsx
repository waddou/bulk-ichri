'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// MD5 hash function for password comparison
const md5Hash = async (text: string): Promise<string> => {
  if (typeof window !== 'undefined') {
    // Client-side MD5 implementation
    const CryptoJS = await import('crypto-js')
    return CryptoJS.MD5(text).toString()
  }
  // Server-side fallback (shouldn't be used in this context)
  return text
}

// Admin authentication interface
interface Admin {
  id_admin: number
  nom_admin: string
  prenom_admin: string
  mail_admin: string
  pseudo_admin: string
  droits_admin: number
}

const checkAuth = () => {
  if (typeof window !== 'undefined') {
    const adminData = localStorage.getItem('admin_session')
    return adminData !== null
  }
  return false
}

const getAdminSession = (): Admin | null => {
  if (typeof window !== 'undefined') {
    const adminData = localStorage.getItem('admin_session')
    return adminData ? JSON.parse(adminData) : null
  }
  return null
}

const AuthPrompt = ({ onAuth }: { onAuth: (admin: Admin) => void }) => {
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // First, get all admin records that match the pseudo/email
      const { data: adminRecords, error } = await supabase
        .from('admin')
        .select('*')
        .or(`pseudo_admin.eq.${pseudo},mail_admin.eq.${pseudo}`)

      if (error) {
        console.error('Auth error:', error)
        setError('Erreur de connexion à la base de données')
        return
      }

      if (!adminRecords || adminRecords.length === 0) {
        setError('Utilisateur non trouvé')
        return
      }

      // Check password against each matching record
      let authenticatedAdmin = null
      for (const admin of adminRecords) {
        // Try plain text password first
        if (admin.pwd_admin === password) {
          authenticatedAdmin = admin
          break
        }
        
        // Try MD5 hash
        const hashedPassword = await md5Hash(password)
        if (admin.pwd_admin === hashedPassword) {
          authenticatedAdmin = admin
          break
        }
      }

      if (!authenticatedAdmin) {
        setError('Mot de passe incorrect')
      } else {
        // Create a Supabase auth session using the admin's email
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: authenticatedAdmin.mail_admin || `admin${authenticatedAdmin.id_admin}@localadmin.com`,
          password: 'temp-password-' + authenticatedAdmin.id_admin
        })

        if (authError) {
          // If auth fails, try to sign up first then sign in
          await supabase.auth.signUp({
            email: authenticatedAdmin.mail_admin || `admin${authenticatedAdmin.id_admin}@localadmin.com`,
            password: 'temp-password-' + authenticatedAdmin.id_admin,
            options: {
              data: {
                admin_id: authenticatedAdmin.id_admin,
                name: `${authenticatedAdmin.prenom_admin} ${authenticatedAdmin.nom_admin}`
              }
            }
          })
          
          // Try signing in again
          await supabase.auth.signInWithPassword({
            email: authenticatedAdmin.mail_admin || `admin${authenticatedAdmin.id_admin}@localadmin.com`,
            password: 'temp-password-' + authenticatedAdmin.id_admin
          })
        }

        // Generate dynamic bearer token
        const bearerToken = `admin_${authenticatedAdmin.id_admin}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Store admin session and bearer token
        localStorage.setItem('admin_session', JSON.stringify(authenticatedAdmin))
        localStorage.setItem('bearer_token', bearerToken)
        
        onAuth(authenticatedAdmin)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Erreur de connexion')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">LocalAdmin - Connexion</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pseudo ou Email
            </label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Entrez votre pseudo ou email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Entrez votre mot de passe"
              required
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

interface Categorie {
  id: number
  url: string
  libelle: string
  meta_title?: string
  meta_description?: string
  h1?: string
  h2?: string
  text_top?: string
  text_bottom?: string
  keywords?: string
}

interface SousCategorie {
  id: number
  libelle: string
  idCategorie: number
  url: string
  meta_title?: string
  meta_description?: string
  h1?: string
  h2?: string
  text_top?: string
  text_bottom?: string
  keywords?: string
}

interface Gouvernorat {
  id: number
  libelle: string
  url: string
  meta_title?: string
  meta_description?: string
  h1?: string
  h2?: string
  text_top?: string
  text_bottom?: string
  keywords?: string
}

interface Ville {
  id: number
  libelle: string
  codeGouvernorat: number
  url: string
  meta_title?: string
  meta_description?: string
  h1?: string
  h2?: string
  text_top?: string
  text_bottom?: string
  keywords?: string
}

interface LandingPage {
  id: number
  slug: string
  active: boolean
  categoryId?: number
  subCategoryId?: number
  gouvernoratId?: number
  villeId?: number
  searchTerm?: string
  featuredIds: number[]
  bannedIds: number[]
  metaTitle?: string
  metaDescription?: string
  h1?: string
  h2?: string
  textTop?: string
  textBottom?: string
  tags?: string
  createdAt: string
  updatedAt: string
}

interface Marque {
  id: number
  libelle: string
  url: string
  categorieMarque: number
  titre?: string
  desc?: string
  h1?: string
  h2?: string
  meta_desc?: string
  cle?: string
}

const tabs = ['Catégories', 'Sous-catégories', 'Gouvernorats', 'Villes', 'Landing Pages', 'Marques']

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const tabs = ['Catégories', 'Sous-catégories', 'Gouvernorats', 'Villes', 'Landing Pages', 'Marques']
  
  // Catégories
  const [categories, setCategories] = useState<Categorie[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Categorie | null>(null)
  const [loading, setLoading] = useState(true)
  const [importMode, setImportMode] = useState(false)
  const [importJson, setImportJson] = useState('')

  // Sous-catégories
  const [sousCategories, setSousCategories] = useState<SousCategorie[]>([])
  const [selectedSousCategorie, setSelectedSousCategorie] = useState<SousCategorie | null>(null)
  const [loadingSousCategories, setLoadingSousCategories] = useState(false)
  const [importModeSousCategories, setImportModeSousCategories] = useState(false)
  const [importJsonSousCategories, setImportJsonSousCategories] = useState('')

  // Gouvernorats
  const [gouvernorats, setGouvernorats] = useState<Gouvernorat[]>([])
  const [selectedGouvernorat, setSelectedGouvernorat] = useState<Gouvernorat | null>(null)
  const [loadingGouvernorats, setLoadingGouvernorats] = useState(false)
  const [importModeGouvernorats, setImportModeGouvernorats] = useState(false)
  const [importJsonGouvernorats, setImportJsonGouvernorats] = useState('')

  // Villes
  const [villes, setVilles] = useState<Ville[]>([])
  const [selectedVille, setSelectedVille] = useState<Ville | null>(null)
  const [loadingVilles, setLoadingVilles] = useState(false)
  const [importModeVilles, setImportModeVilles] = useState(false)
  const [importJsonVilles, setImportJsonVilles] = useState('')

  // Landing Pages
  const [landingPages, setLandingPages] = useState<LandingPage[]>([])
  const [selectedLandingPage, setSelectedLandingPage] = useState<LandingPage | null>(null)
  const [loadingLandingPages, setLoadingLandingPages] = useState(false)
  const [importModeLandingPages, setImportModeLandingPages] = useState(false)
  const [importJsonLandingPages, setImportJsonLandingPages] = useState('')

  // Marques
  const [marques, setMarques] = useState<Marque[]>([])
  const [selectedMarque, setSelectedMarque] = useState<Marque | null>(null)
  const [loadingMarques, setLoadingMarques] = useState(false)
  const [importModeMarques, setImportModeMarques] = useState(false)
  const [importJsonMarques, setImportJsonMarques] = useState('')

  useEffect(() => {
    const isAuth = checkAuth()
    setIsAuthenticated(isAuth)
    if (isAuth) {
      setCurrentAdmin(getAdminSession())
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 0) {
        fetchCategories()
      } else if (activeTab === 1) {
        fetchSousCategories()
      } else if (activeTab === 2) {
        fetchGouvernorats()
      } else if (activeTab === 3) {
        fetchVilles()
      } else if (activeTab === 4) {
        fetchLandingPages()
      } else if (activeTab === 5) {
        fetchMarques()
      }
    }
  }, [activeTab, isAuthenticated])

  const fetchCategories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id_categorie')

    if (error) {
      console.error('Erreur lors de la récupération des catégories:', error)
    } else {
      setCategories(data.map(item => ({
        id: item.id_categorie,
        url: item.url_categorie,
        libelle: item.libelle_categorie,
        meta_title: item.meta_title,
        meta_description: item.meta_description,
        h1: item.h1,
        h2: item.h2,
        text_top: item.text_top,
        text_bottom: item.text_bottom,
        keywords: item.keywords
      })) || [])
    }
    setLoading(false)
  }

  const updateCategory = async (category: Categorie) => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session': adminSession
        },
        body: JSON.stringify({
          action: 'update',
          table: 'categories',
          id: category.id,
          idField: 'id_categorie',
          data: {
            meta_title: category.meta_title,
            meta_description: category.meta_description,
            h1: category.h1,
            h2: category.h2,
            text_top: category.text_top,
            text_bottom: category.text_bottom,
            keywords: category.keywords
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Erreur lors de la mise à jour:', result.error)
        alert('Erreur lors de la mise à jour: ' + result.error)
      } else {
        alert('Mise à jour réussie')
        setSelectedCategory(null)
        fetchCategories()
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      alert('Erreur de connexion au serveur')
    }
  }

  const exportCategories = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(categories, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "categories.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const importCategories = async () => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const data = JSON.parse(importJson)
      if (!Array.isArray(data)) {
        alert('Le JSON doit être un tableau d\'objets')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const item of data) {
        const updateData = {
          url_categorie: item.url,
          libelle_categorie: item.libelle,
          meta_title: item.meta_title,
          meta_description: item.meta_description,
          h1: item.h1,
          h2: item.h2,
          text_top: item.text_top,
          text_bottom: item.text_bottom,
          keywords: item.keywords
        }

        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-session': adminSession
          },
          body: JSON.stringify({
            action: item.id ? 'update' : 'insert',
            table: 'categories',
            id: item.id,
            idField: 'id_categorie',
            data: updateData
          })
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
          const result = await response.json()
          console.error('Erreur import:', result.error)
        }
      }
      
      alert(`Importation terminée!\n✅ Succès: ${successCount}\n❌ Erreurs: ${errorCount}`)
      setImportMode(false)
      setImportJson('')
      fetchCategories()
    } catch (error) {
      alert('Erreur lors de l\'importation: ' + error)
    }
  }

  // Fonctions pour Sous-catégories
  const fetchSousCategories = async () => {
    setLoadingSousCategories(true)
    const { data, error } = await supabase
      .from('sous_categories')
      .select('*')
      .order('id_sous_categorie')

    if (error) {
      console.error('Erreur lors de la récupération des sous-catégories:', error)
    } else {
      setSousCategories(data.map(item => ({
        id: item.id_sous_categorie,
        libelle: item.libelle_sous_categorie,
        idCategorie: item.id_categorie,
        url: item.url_sous_categorie,
        meta_title: item.meta_title,
        meta_description: item.meta_description,
        h1: item.h1,
        h2: item.h2,
        text_top: item.text_top,
        text_bottom: item.text_bottom,
        keywords: item.keywords
      })) || [])
    }
    setLoadingSousCategories(false)
  }

  const updateSousCategorie = async (sousCategorie: SousCategorie) => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session': adminSession
        },
        body: JSON.stringify({
          action: 'update',
          table: 'sous_categories',
          id: sousCategorie.id,
          idField: 'id_sous_categorie',
          data: {
            meta_title: sousCategorie.meta_title,
            meta_description: sousCategorie.meta_description,
            h1: sousCategorie.h1,
            h2: sousCategorie.h2,
            text_top: sousCategorie.text_top,
            text_bottom: sousCategorie.text_bottom,
            keywords: sousCategorie.keywords
          }
        })
      })

      if (!response.ok) {
        const result = await response.json()
        console.error('Erreur lors de la mise à jour:', result.error)
        alert('Erreur lors de la mise à jour: ' + result.error)
      } else {
        alert('Mise à jour réussie')
        setSelectedSousCategorie(null)
        fetchSousCategories()
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      alert('Erreur de connexion au serveur')
    }
  }

  const exportSousCategories = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sousCategories, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "sous_categories.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const importSousCategories = async () => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const data = JSON.parse(importJsonSousCategories)
      if (!Array.isArray(data)) {
        alert('Le JSON doit être un tableau d\'objets')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const item of data) {
        const updateData = {
          libelle_sous_categorie: item.libelle,
          id_categorie: item.idCategorie,
          url_sous_categorie: item.url,
          meta_title: item.meta_title,
          meta_description: item.meta_description,
          h1: item.h1,
          h2: item.h2,
          text_top: item.text_top,
          text_bottom: item.text_bottom,
          keywords: item.keywords
        }

        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-session': adminSession
          },
          body: JSON.stringify({
            action: item.id ? 'update' : 'insert',
            table: 'sous_categories',
            id: item.id,
            idField: 'id_sous_categorie',
            data: updateData
          })
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
          const result = await response.json()
          console.error('Erreur import:', result.error)
        }
      }
      
      alert(`Importation terminée!\n✅ Succès: ${successCount}\n❌ Erreurs: ${errorCount}`)
      setImportModeSousCategories(false)
      setImportJsonSousCategories('')
      fetchSousCategories()
    } catch (error) {
      alert('Erreur lors de l\'importation: ' + error)
    }
  }

  // Fonctions pour Gouvernorats
  const fetchGouvernorats = async () => {
    setLoadingGouvernorats(true)
    const { data, error } = await supabase
      .from('gouvernorats_tn')
      .select('*')
      .order('id_gouvernorat')

    if (error) {
      console.error('Erreur lors de la récupération des gouvernorats:', error)
    } else {
      setGouvernorats(data.map(item => ({
        id: item.id_gouvernorat,
        libelle: item.libelle_gouvernorat,
        url: item.url_gouvernorat,
        meta_title: item.meta_title,
        meta_description: item.meta_description,
        h1: item.h1,
        h2: item.h2,
        text_top: item.text_top,
        text_bottom: item.text_bottom,
        keywords: item.keywords
      })) || [])
    }
    setLoadingGouvernorats(false)
  }

  const updateGouvernorat = async (gouvernorat: Gouvernorat) => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session': adminSession
        },
        body: JSON.stringify({
          action: 'update',
          table: 'gouvernorats_tn',
          id: gouvernorat.id,
          idField: 'id_gouvernorat',
          data: {
            meta_title: gouvernorat.meta_title,
            meta_description: gouvernorat.meta_description,
            h1: gouvernorat.h1,
            h2: gouvernorat.h2,
            text_top: gouvernorat.text_top,
            text_bottom: gouvernorat.text_bottom,
            keywords: gouvernorat.keywords
          }
        })
      })

      if (!response.ok) {
        const result = await response.json()
        console.error('Erreur lors de la mise à jour:', result.error)
        alert('Erreur lors de la mise à jour: ' + result.error)
      } else {
        alert('Mise à jour réussie')
        setSelectedGouvernorat(null)
        fetchGouvernorats()
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      alert('Erreur de connexion au serveur')
    }
  }

  const exportGouvernorats = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gouvernorats, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "gouvernorats.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const importGouvernorats = async () => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const data = JSON.parse(importJsonGouvernorats)
      if (!Array.isArray(data)) {
        alert('Le JSON doit être un tableau d\'objets')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const item of data) {
        const updateData = {
          libelle_gouvernorat: item.libelle,
          url_gouvernorat: item.url,
          meta_title: item.meta_title,
          meta_description: item.meta_description,
          h1: item.h1,
          h2: item.h2,
          text_top: item.text_top,
          text_bottom: item.text_bottom,
          keywords: item.keywords
        }

        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-session': adminSession
          },
          body: JSON.stringify({
            action: item.id ? 'update' : 'insert',
            table: 'gouvernorats_tn',
            id: item.id,
            idField: 'id_gouvernorat',
            data: updateData
          })
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
          const result = await response.json()
          console.error('Erreur import:', result.error)
        }
      }
      
      alert(`Importation terminée!\n✅ Succès: ${successCount}\n❌ Erreurs: ${errorCount}`)
      setImportModeGouvernorats(false)
      setImportJsonGouvernorats('')
      fetchGouvernorats()
    } catch (error) {
      alert('Erreur lors de l\'importation: ' + error)
    }
  }

  // Fonctions pour Villes
  const fetchVilles = async () => {
    setLoadingVilles(true)
    const { data, error } = await supabase
      .from('villes_tn')
      .select('*')
      .order('id_ville')

    if (error) {
      console.error('Erreur lors de la récupération des villes:', error)
    } else {
      setVilles(data.map(item => ({
        id: item.id_ville,
        libelle: item.libelle_ville,
        codeGouvernorat: item.code_gouvernorat,
        url: item.url_ville,
        meta_title: item.meta_title,
        meta_description: item.meta_description,
        h1: item.h1,
        h2: item.h2,
        text_top: item.text_top,
        text_bottom: item.text_bottom,
        keywords: item.keywords
      })) || [])
    }
    setLoadingVilles(false)
  }

  const updateVille = async (ville: Ville) => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session': adminSession
        },
        body: JSON.stringify({
          action: 'update',
          table: 'villes_tn',
          id: ville.id,
          idField: 'id_ville',
          data: {
            meta_title: ville.meta_title,
            meta_description: ville.meta_description,
            h1: ville.h1,
            h2: ville.h2,
            text_top: ville.text_top,
            text_bottom: ville.text_bottom,
            keywords: ville.keywords
          }
        })
      })

      if (!response.ok) {
        const result = await response.json()
        console.error('Erreur lors de la mise à jour:', result.error)
        alert('Erreur lors de la mise à jour: ' + result.error)
      } else {
        alert('Mise à jour réussie')
        setSelectedVille(null)
        fetchVilles()
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      alert('Erreur de connexion au serveur')
    }
  }

  const exportVilles = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(villes, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "villes.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const importVilles = async () => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const data = JSON.parse(importJsonVilles)
      if (!Array.isArray(data)) {
        alert('Le JSON doit être un tableau d\'objets')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const item of data) {
        const updateData = {
          libelle_ville: item.libelle,
          code_gouvernorat: item.codeGouvernorat,
          url_ville: item.url,
          meta_title: item.meta_title,
          meta_description: item.meta_description,
          h1: item.h1,
          h2: item.h2,
          text_top: item.text_top,
          text_bottom: item.text_bottom,
          keywords: item.keywords
        }

        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-session': adminSession
          },
          body: JSON.stringify({
            action: item.id ? 'update' : 'insert',
            table: 'villes_tn',
            id: item.id,
            idField: 'id_ville',
            data: updateData
          })
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
          const result = await response.json()
          console.error('Erreur import:', result.error)
        }
      }
      
      alert(`Importation terminée!\n✅ Succès: ${successCount}\n❌ Erreurs: ${errorCount}`)
      setImportModeVilles(false)
      setImportJsonVilles('')
      fetchVilles()
    } catch (error) {
      alert('Erreur lors de l\'importation: ' + error)
    }
  }

  // Fonctions pour Landing Pages
  const fetchLandingPages = async () => {
    setLoadingLandingPages(true)
    const { data, error } = await supabase
      .from('landing_pages')
      .select('*')
      .order('id')

    if (error) {
      console.error('Erreur lors de la récupération des landing pages:', error)
    } else {
      setLandingPages(data.map(item => ({
        id: item.id,
        slug: item.slug,
        active: item.active,
        categoryId: item.category_id,
        subCategoryId: item.sub_category_id,
        gouvernoratId: item.gouvernorat_id,
        villeId: item.ville_id,
        searchTerm: item.search_term,
        featuredIds: item.featured_ids,
        bannedIds: item.banned_ids,
        metaTitle: item.meta_title,
        metaDescription: item.meta_description,
        h1: item.h1,
        h2: item.h2,
        textTop: item.text_top,
        textBottom: item.text_bottom,
        tags: item.tags,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) || [])
    }
    setLoadingLandingPages(false)
  }

  const updateLandingPage = async (landingPage: LandingPage) => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session': adminSession
        },
        body: JSON.stringify({
          action: 'update',
          table: 'landing_pages',
          id: landingPage.id,
          idField: 'id',
          data: {
            meta_title: landingPage.metaTitle,
            meta_description: landingPage.metaDescription,
            h1: landingPage.h1,
            h2: landingPage.h2,
            text_top: landingPage.textTop,
            text_bottom: landingPage.textBottom,
            tags: landingPage.tags
          }
        })
      })

      if (!response.ok) {
        const result = await response.json()
        console.error('Erreur lors de la mise à jour:', result.error)
        alert('Erreur lors de la mise à jour: ' + result.error)
      } else {
        alert('Mise à jour réussie')
        setSelectedLandingPage(null)
        fetchLandingPages()
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      alert('Erreur de connexion au serveur')
    }
  }

  const exportLandingPages = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(landingPages, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "landing_pages.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const importLandingPages = async () => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const data = JSON.parse(importJsonLandingPages)
      if (!Array.isArray(data)) {
        alert('Le JSON doit être un tableau d\'objets')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const item of data) {
        const updateData = {
          slug: item.slug,
          active: item.active,
          category_id: item.categoryId,
          sub_category_id: item.subCategoryId,
          gouvernorat_id: item.gouvernoratId,
          ville_id: item.villeId,
          search_term: item.searchTerm,
          featured_ids: item.featuredIds || [],
          banned_ids: item.bannedIds || [],
          meta_title: item.metaTitle,
          meta_description: item.metaDescription,
          h1: item.h1,
          h2: item.h2,
          text_top: item.textTop,
          text_bottom: item.textBottom,
          tags: item.tags
        }

        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-session': adminSession
          },
          body: JSON.stringify({
            action: item.id ? 'update' : 'insert',
            table: 'landing_pages',
            id: item.id,
            idField: 'id',
            data: updateData
          })
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
          const result = await response.json()
          console.error('Erreur import:', result.error)
        }
      }
      
      alert(`Importation terminée!\n✅ Succès: ${successCount}\n❌ Erreurs: ${errorCount}`)
      setImportModeLandingPages(false)
      setImportJsonLandingPages('')
      fetchLandingPages()
    } catch (error) {
      alert('Erreur lors de l\'importation: ' + error)
    }
  }

  // Fonctions pour Marques
  const fetchMarques = async () => {
    setLoadingMarques(true)
    const { data, error } = await supabase
      .from('marques')
      .select('*')
      .order('id_marque')

    if (error) {
      console.error('Erreur lors de la récupération des marques:', error)
    } else {
      setMarques(data.map(item => ({
        id: item.id_marque,
        libelle: item.libelle_marque,
        url: item.url_marque,
        categorieMarque: item.categorie_marque,
        titre: item.titre,
        desc: item.desc,
        h1: item.h1,
        h2: item.h2,
        meta_desc: item.meta_desc,
        cle: item.cle
      })) || [])
    }
    setLoadingMarques(false)
  }

  const updateMarque = async (marque: Marque) => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session': adminSession
        },
        body: JSON.stringify({
          action: 'update',
          table: 'marques',
          id: marque.id,
          idField: 'id_marque',
          data: {
            titre: marque.titre,
            desc: marque.desc,
            h1: marque.h1,
            h2: marque.h2,
            meta_desc: marque.meta_desc,
            cle: marque.cle
          }
        })
      })

      if (!response.ok) {
        const result = await response.json()
        console.error('Erreur lors de la mise à jour:', result.error)
        alert('Erreur lors de la mise à jour: ' + result.error)
      } else {
        alert('Mise à jour réussie')
        setSelectedMarque(null)
        fetchMarques()
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      alert('Erreur de connexion au serveur')
    }
  }

  const exportMarques = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(marques, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "marques.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const importMarques = async () => {
    const adminSession = localStorage.getItem('admin_session')
    
    if (!adminSession) {
      alert('Session admin expirée. Veuillez vous reconnecter.')
      return
    }

    try {
      const data = JSON.parse(importJsonMarques)
      if (!Array.isArray(data)) {
        alert('Le JSON doit être un tableau d\'objets')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const item of data) {
        const updateData = {
          libelle_marque: item.libelle,
          url_marque: item.url,
          categorie_marque: item.categorieMarque,
          titre: item.titre,
          desc: item.desc,
          h1: item.h1,
          h2: item.h2,
          meta_desc: item.meta_desc,
          cle: item.cle
        }

        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-session': adminSession
          },
          body: JSON.stringify({
            action: item.id ? 'update' : 'insert',
            table: 'marques',
            id: item.id,
            idField: 'id_marque',
            data: updateData
          })
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
          const result = await response.json()
          console.error('Erreur import:', result.error)
        }
      }
      
      alert(`Importation terminée!\n✅ Succès: ${successCount}\n❌ Erreurs: ${errorCount}`)
      setImportModeMarques(false)
      setImportJsonMarques('')
      fetchMarques()
    } catch (error) {
      alert('Erreur lors de l\'importation: ' + error)
    }
  }

  const renderCategoriesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Catégories SEO</h2>
        <div className="flex space-x-4">
          <button
            onClick={exportCategories}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📤</span>
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => setImportMode(!importMode)}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📥</span>
            <span>{importMode ? 'Annuler Import' : 'Import JSON'}</span>
          </button>
        </div>
      </div>

      {importMode && (
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Importer des catégories (JSON)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Données JSON</label>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Collez votre JSON ici..."
                className="w-full h-64 p-2 border rounded font-mono text-sm"
              />
              <button
                onClick={importCategories}
                className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Importer les catégories
              </button>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Structure JSON attendue:</h4>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`[
  {
    "id": 1,
    "url": "categorie-url",
    "libelle": "Nom catégorie",
    "meta_title": "Meta titre",
    "meta_description": "Meta description",
    "h1": "Titre H1",
    "h2": "Titre H2",
    "text_top": "Texte du haut",
    "text_bottom": "Texte du bas",
    "keywords": "mots-clés"
  }
]`}
              </pre>
              <div className="mt-2">
                <h5 className="font-semibold">Champs obligatoires:</h5>
                <ul className="text-sm text-gray-600">
                  <li>• url</li>
                  <li>• libelle</li>
                </ul>
                <p className="text-sm text-gray-500 mt-1">
                  L\'ID est optionnel: s\'il existe, la ligne sera mise à jour, sinon elle sera insérée.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Liste des catégories</h3>
            <div className="space-y-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
 {cat.libelle}
                </button>
              ))}
            </div>
          </div>
          {selectedCategory && (
            <div className="lg:col-span-2" key={selectedCategory.id}>
              <h3 className="text-lg font-semibold mb-2">Éditer SEO pour {selectedCategory.libelle}</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target as HTMLFormElement)
                  const updated = {
                    ...selectedCategory,
                    meta_title: formData.get('meta_title') as string,
                    meta_description: formData.get('meta_description') as string,
                    h1: formData.get('h1') as string,
                    h2: formData.get('h2') as string,
                    text_top: formData.get('text_top') as string,
                    text_bottom: formData.get('text_bottom') as string,
                    keywords: formData.get('keywords') as string
                  }
                  updateCategory(updated)
                }}
                className="grid grid-cols-1 gap-6"
              >
                <div className="">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations SEO</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                  <input
                    type="text"
                    name="meta_title"
                    defaultValue={selectedCategory.meta_title || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                  <textarea
                    name="meta_description"
                    defaultValue={selectedCategory.meta_description || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H1</label>
                  <input
                    type="text"
                    name="h1"
                    defaultValue={selectedCategory.h1 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H2</label>
                  <input
                    type="text"
                    name="h2"
                    defaultValue={selectedCategory.h2 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texte du haut</label>
                  <textarea
                    name="text_top"
                    defaultValue={selectedCategory.text_top || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={5}
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texte du bas</label>
                  <textarea
                    name="text_bottom"
                    defaultValue={selectedCategory.text_bottom || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={5}
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mots-clés</label>
                  <input
                    type="text"
                    name="keywords"
                    defaultValue={selectedCategory.keywords || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div className=" flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <span>💾</span>
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
  const renderSousCategoriesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Sous-catégories SEO</h2>
        <div className="flex space-x-4">
          <button
            onClick={exportSousCategories}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📤</span>
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => setImportModeSousCategories(!importModeSousCategories)}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📥</span>
            <span>{importModeSousCategories ? 'Annuler Import' : 'Import JSON'}</span>
          </button>
        </div>
      </div>

      {importModeSousCategories && (
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Importer des sous-catégories (JSON)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Données JSON</label>
              <textarea
                value={importJsonSousCategories}
                onChange={(e) => setImportJsonSousCategories(e.target.value)}
                placeholder="Collez votre JSON ici..."
                className="w-full h-64 p-2 border rounded font-mono text-sm"
              />
              <button
                onClick={importSousCategories}
                className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Importer les sous-catégories
              </button>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Structure JSON attendue:</h4>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`[
  {
    "id": 1,
    "libelle": "Nom sous-catégorie",
    "idCategorie": 1,
    "url": "sous-categorie-url",
    "meta_title": "Meta titre",
    "meta_description": "Meta description",
    "h1": "Titre H1",
    "h2": "Titre H2",
    "text_top": "Texte du haut",
    "text_bottom": "Texte du bas",
    "keywords": "mots-clés"
  }
]`}
              </pre>
              <div className="mt-2">
                <h5 className="font-semibold">Champs obligatoires:</h5>
                <ul className="text-sm text-gray-600">
                  <li>• libelle</li>
                  <li>• idCategorie</li>
                  <li>• url</li>
                </ul>
                <p className="text-sm text-gray-500 mt-1">
                  L\'ID est optionnel: s\'il existe, la ligne sera mise à jour, sinon elle sera insérée.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingSousCategories ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Liste des sous-catégories</h3>
            <div className="space-y-2">
              {sousCategories.map((subCat) => (
                <button
                  key={subCat.id}
                  onClick={() => setSelectedSousCategorie(subCat)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
 {subCat.libelle}
                </button>
              ))}
            </div>
          </div>
          {selectedSousCategorie && (
            <div className="lg:col-span-2" key={selectedSousCategorie.id}>
              <h3 className="text-lg font-semibold mb-2">Éditer SEO pour {selectedSousCategorie.libelle}</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target as HTMLFormElement)
                  const updated = {
                    ...selectedSousCategorie,
                    meta_title: formData.get('meta_title') as string,
                    meta_description: formData.get('meta_description') as string,
                    h1: formData.get('h1') as string,
                    h2: formData.get('h2') as string,
                    text_top: formData.get('text_top') as string,
                    text_bottom: formData.get('text_bottom') as string,
                    keywords: formData.get('keywords') as string
                  }
                  updateSousCategorie(updated)
                }}
                className="grid grid-cols-1 gap-6"
              >
                <div className="">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations SEO</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                  <input
                    type="text"
                    name="meta_title"
                    defaultValue={selectedSousCategorie.meta_title || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                  <textarea
                    name="meta_description"
                    defaultValue={selectedSousCategorie.meta_description || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H1</label>
                  <input
                    type="text"
                    name="h1"
                    defaultValue={selectedSousCategorie.h1 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H2</label>
                  <input
                    type="text"
                    name="h2"
                    defaultValue={selectedSousCategorie.h2 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texte du haut</label>
                  <textarea
                    name="text_top"
                    defaultValue={selectedSousCategorie.text_top || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={5}
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texte du bas</label>
                  <textarea
                    name="text_bottom"
                    defaultValue={selectedSousCategorie.text_bottom || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={5}
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mots-clés</label>
                  <input
                    type="text"
                    name="keywords"
                    defaultValue={selectedSousCategorie.keywords || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div className=" flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <span>💾</span>
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderGouvernoratsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Gouvernorats SEO</h2>
        <div className="flex space-x-4">
          <button
            onClick={exportGouvernorats}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📤</span>
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => setImportModeGouvernorats(!importModeGouvernorats)}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📥</span>
            <span>{importModeGouvernorats ? 'Annuler Import' : 'Import JSON'}</span>
          </button>
        </div>
      </div>

      {importModeGouvernorats && (
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Importer des gouvernorats (JSON)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Données JSON</label>
              <textarea
                value={importJsonGouvernorats}
                onChange={(e) => setImportJsonGouvernorats(e.target.value)}
                placeholder="Collez votre JSON ici..."
                className="w-full h-64 p-2 border rounded font-mono text-sm"
              />
              <button
                onClick={importGouvernorats}
                className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Importer les gouvernorats
              </button>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Structure JSON attendue:</h4>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`[
  {
    "id": 1,
    "libelle": "Nom gouvernorat",
    "url": "gouvernorat-url",
    "meta_title": "Meta titre",
    "meta_description": "Meta description",
    "h1": "Titre H1",
    "h2": "Titre H2",
    "text_top": "Texte du haut",
    "text_bottom": "Texte du bas",
    "keywords": "mots-clés"
  }
]`}
              </pre>
              <div className="mt-2">
                <h5 className="font-semibold">Champs obligatoires:</h5>
                <ul className="text-sm text-gray-600">
                  <li>• libelle</li>
                  <li>• url</li>
                </ul>
                <p className="text-sm text-gray-500 mt-1">
                  L\'ID est optionnel: s\'il existe, la ligne sera mise à jour, sinon elle sera insérée.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingGouvernorats ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Liste des gouvernorats</h3>
            <div className="space-y-2">
              {gouvernorats.map((gov) => (
                <button
                  key={gov.id}
                  onClick={() => setSelectedGouvernorat(gov)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
 {gov.libelle}
                </button>
              ))}
            </div>
          </div>
          {selectedGouvernorat && (
            <div className="lg:col-span-2" key={selectedGouvernorat.id}>
              <h3 className="text-lg font-semibold mb-2">Éditer SEO pour {selectedGouvernorat.libelle}</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target as HTMLFormElement)
                  const updated = {
                    ...selectedGouvernorat,
                    meta_title: formData.get('meta_title') as string,
                    meta_description: formData.get('meta_description') as string,
                    h1: formData.get('h1') as string,
                    h2: formData.get('h2') as string,
                    text_top: formData.get('text_top') as string,
                    text_bottom: formData.get('text_bottom') as string,
                    keywords: formData.get('keywords') as string
                  }
                  updateGouvernorat(updated)
                }}
                className="grid grid-cols-1 gap-6"
              >
                <div className="">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations SEO</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                  <input
                    type="text"
                    name="meta_title"
                    defaultValue={selectedGouvernorat.meta_title || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                  <textarea
                    name="meta_description"
                    defaultValue={selectedGouvernorat.meta_description || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H1</label>
                  <input
                    type="text"
                    name="h1"
                    defaultValue={selectedGouvernorat.h1 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H2</label>
                  <input
                    type="text"
                    name="h2"
                    defaultValue={selectedGouvernorat.h2 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texte du haut</label>
                  <textarea
                    name="text_top"
                    defaultValue={selectedGouvernorat.text_top || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={5}
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texte du bas</label>
                  <textarea
                    name="text_bottom"
                    defaultValue={selectedGouvernorat.text_bottom || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={5}
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mots-clés</label>
                  <input
                    type="text"
                    name="keywords"
                    defaultValue={selectedGouvernorat.keywords || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div className=" flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <span>💾</span>
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
  const renderVillesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Villes SEO</h2>
        <div className="flex space-x-4">
          <button
            onClick={exportVilles}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📤</span>
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => setImportModeVilles(!importModeVilles)}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📥</span>
            <span>{importModeVilles ? 'Annuler Import' : 'Import JSON'}</span>
          </button>
        </div>
      </div>

      {importModeVilles && (
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Importer des villes (JSON)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Données JSON</label>
              <textarea
                value={importJsonVilles}
                onChange={(e) => setImportJsonVilles(e.target.value)}
                placeholder="Collez votre JSON ici..."
                className="w-full h-64 p-2 border rounded font-mono text-sm"
              />
              <button
                onClick={importVilles}
                className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Importer les villes
              </button>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Structure JSON attendue:</h4>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`[
  {
    "id": 1,
    "libelle": "Nom ville",
    "codeGouvernorat": 1,
    "url": "ville-url",
    "meta_title": "Meta titre",
    "meta_description": "Meta description",
    "h1": "Titre H1",
    "h2": "Titre H2",
    "text_top": "Texte du haut",
    "text_bottom": "Texte du bas",
    "keywords": "mots-clés"
  }
]`}
              </pre>
              <div className="mt-2">
                <h5 className="font-semibold">Champs obligatoires:</h5>
                <ul className="text-sm text-gray-600">
                  <li>• libelle</li>
                  <li>• codeGouvernorat</li>
                  <li>• url</li>
                </ul>
                <p className="text-sm text-gray-500 mt-1">
                  L\'ID est optionnel: s\'il existe, la ligne sera mise à jour, sinon elle sera insérée.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingVilles ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Liste des villes</h3>
            <div className="space-y-2">
              {villes.map((ville) => (
                <button
                  key={ville.id}
                  onClick={() => setSelectedVille(ville)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
 {ville.libelle}
                </button>
              ))}
            </div>
          </div>
          {selectedVille && (
            <div className="lg:col-span-2" key={selectedVille.id}>
              <h3 className="text-lg font-semibold mb-2">Éditer SEO pour {selectedVille.libelle}</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target as HTMLFormElement)
                  const updated = {
                    ...selectedVille,
                    meta_title: formData.get('meta_title') as string,
                    meta_description: formData.get('meta_description') as string,
                    h1: formData.get('h1') as string,
                    h2: formData.get('h2') as string,
                    text_top: formData.get('text_top') as string,
                    text_bottom: formData.get('text_bottom') as string,
                    keywords: formData.get('keywords') as string
                  }
                  updateVille(updated)
                }}
                className="grid grid-cols-1 gap-6"
              >
                <div className="">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations SEO</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                  <input
                    type="text"
                    name="meta_title"
                    defaultValue={selectedVille.meta_title || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                  <textarea
                    name="meta_description"
                    defaultValue={selectedVille.meta_description || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H1</label>
                  <input
                    type="text"
                    name="h1"
                    defaultValue={selectedVille.h1 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H2</label>
                  <input
                    type="text"
                    name="h2"
                    defaultValue={selectedVille.h2 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texte du haut</label>
                  <textarea
                    name="text_top"
                    defaultValue={selectedVille.text_top || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={5}
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texte du bas</label>
                  <textarea
                    name="text_bottom"
                    defaultValue={selectedVille.text_bottom || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={5}
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mots-clés</label>
                  <input
                    type="text"
                    name="keywords"
                    defaultValue={selectedVille.keywords || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div className=" flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <span>💾</span>
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderLandingPagesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Landing Pages SEO</h2>
        <div className="flex space-x-4">
          <button
            onClick={exportLandingPages}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📤</span>
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => setImportModeLandingPages(!importModeLandingPages)}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📥</span>
            <span>{importModeLandingPages ? 'Annuler Import' : 'Import JSON'}</span>
          </button>
        </div>
      </div>

      {importModeLandingPages && (
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Importer des landing pages (JSON)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Données JSON</label>
              <textarea
                value={importJsonLandingPages}
                onChange={(e) => setImportJsonLandingPages(e.target.value)}
                placeholder="Collez votre JSON ici..."
                className="w-full h-64 p-2 border rounded font-mono text-sm"
              />
              <button
                onClick={importLandingPages}
                className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Importer les landing pages
              </button>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Structure JSON attendue:</h4>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`[
  {
    "id": 1,
    "slug": "landing-slug",
    "active": true,
    "categoryId": 1,
    "subCategoryId": 1,
    "gouvernoratId": 1,
    "villeId": 1,
    "searchTerm": "terme de recherche",
    "featuredIds": [1,2,3],
    "bannedIds": [],
    "metaTitle": "Meta titre",
    "metaDescription": "Meta description",
    "h1": "Titre H1",
    "h2": "Titre H2",
    "textTop": "Texte du haut",
    "textBottom": "Texte du bas",
    "tags": "tags"
  }
]`}
              </pre>
              <div className="mt-2">
                <h5 className="font-semibold">Champs obligatoires:</h5>
                <ul className="text-sm text-gray-600">
                  <li>• slug</li>
                  <li>• active</li>
                </ul>
                <p className="text-sm text-gray-500 mt-1">
                  L\'ID est optionnel: s\'il existe, la ligne sera mise à jour, sinon elle sera insérée.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingLandingPages ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Liste des landing pages</h3>
            <div className="space-y-2">
              {landingPages.map((lp) => (
                <button
                  key={lp.id}
                  onClick={() => setSelectedLandingPage(lp)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
 {lp.slug}
                </button>
              ))}
            </div>
          </div>
          {selectedLandingPage && (
            <div className="lg:col-span-2" key={selectedLandingPage.id}>
              <h3 className="text-lg font-semibold mb-2">Éditer SEO pour {selectedLandingPage.slug}</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target as HTMLFormElement)
                  const updated = {
                    ...selectedLandingPage,
                    metaTitle: formData.get('metaTitle') as string,
                    metaDescription: formData.get('metaDescription') as string,
                    h1: formData.get('h1') as string,
                    h2: formData.get('h2') as string,
                    textTop: formData.get('textTop') as string,
                    textBottom: formData.get('textBottom') as string,
                    tags: formData.get('tags') as string
                  }
                  updateLandingPage(updated)
                }}
                className="grid grid-cols-1 gap-6"
              >
                <div className="">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations SEO</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                  <input
                    type="text"
                    name="metaTitle"
                    defaultValue={selectedLandingPage.metaTitle || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                  <textarea
                    name="metaDescription"
                    defaultValue={selectedLandingPage.metaDescription || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H1</label>
                  <input
                    type="text"
                    name="h1"
                    defaultValue={selectedLandingPage.h1 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H2</label>
                  <input
                    type="text"
                    name="h2"
                    defaultValue={selectedLandingPage.h2 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texte du haut</label>
                  <textarea
                    name="textTop"
                    defaultValue={selectedLandingPage.textTop || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={5}
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texte du bas</label>
                  <textarea
                    name="textBottom"
                    defaultValue={selectedLandingPage.textBottom || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={5}
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    name="tags"
                    defaultValue={selectedLandingPage.tags || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div className=" flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <span>💾</span>
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderMarquesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Marques SEO</h2>
        <div className="flex space-x-4">
          <button
            onClick={exportMarques}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📤</span>
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => setImportModeMarques(!importModeMarques)}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📥</span>
            <span>{importModeMarques ? 'Annuler Import' : 'Import JSON'}</span>
          </button>
        </div>
      </div>

      {importModeMarques && (
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Importer des marques (JSON)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Données JSON</label>
              <textarea
                value={importJsonMarques}
                onChange={(e) => setImportJsonMarques(e.target.value)}
                placeholder="Collez votre JSON ici..."
                className="w-full h-64 p-2 border rounded font-mono text-sm"
              />
              <button
                onClick={importMarques}
                className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Importer les marques
              </button>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Structure JSON attendue:</h4>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`[
  {
    "id": 1,
    "libelle": "Nom marque",
    "url": "marque-url",
    "categorieMarque": 1,
    "titre": "Meta titre",
    "desc": "Description",
    "h1": "Titre H1",
    "h2": "Titre H2",
    "meta_desc": "Meta description",
    "cle": "Mots-clés"
  }
]`}
              </pre>
              <div className="mt-2">
                <h5 className="font-semibold">Champs obligatoires:</h5>
                <ul className="text-sm text-gray-600">
                  <li>• libelle</li>
                  <li>• url</li>
                  <li>• categorieMarque</li>
                </ul>
                <p className="text-sm text-gray-500 mt-1">
                  L'ID est optionnel: s'il existe, la ligne sera mise à jour, sinon elle sera insérée.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingMarques ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Liste des marques</h3>
            <div className="space-y-2">
              {marques.map((marque) => (
                <button
                  key={marque.id}
                  onClick={() => setSelectedMarque(marque)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
 {marque.libelle}
                </button>
              ))}
            </div>
          </div>
          {selectedMarque && (
            <div className="lg:col-span-2" key={selectedMarque.id}>
              <h3 className="text-lg font-semibold mb-2">Éditer SEO pour {selectedMarque.libelle}</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target as HTMLFormElement)
                  const updated = {
                    ...selectedMarque,
                    titre: formData.get('titre') as string,
                    desc: formData.get('desc') as string,
                    h1: formData.get('h1') as string,
                    h2: formData.get('h2') as string,
                    meta_desc: formData.get('meta_desc') as string,
                    cle: formData.get('cle') as string
                  }
                  updateMarque(updated)
                }}
                className="grid grid-cols-1 gap-6"
              >
                <div className="">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations SEO</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                  <input
                    type="text"
                    name="titre"
                    defaultValue={selectedMarque.titre || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="desc"
                    defaultValue={selectedMarque.desc || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H1</label>
                  <input
                    type="text"
                    name="h1"
                    defaultValue={selectedMarque.h1 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">H2</label>
                  <input
                    type="text"
                    name="h2"
                    defaultValue={selectedMarque.h2 || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                  <textarea
                    name="meta_desc"
                    defaultValue={selectedMarque.meta_desc || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    rows={3}
                  />
                </div>
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mots-clés</label>
                  <input
                    type="text"
                    name="cle"
                    defaultValue={selectedMarque.cle || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div className=" flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <span>💾</span>
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return renderCategoriesTab()
      case 1:
        return renderSousCategoriesTab()
      case 2:
        return renderGouvernoratsTab()
      case 3:
        return renderVillesTab()
      case 4:
        return renderLandingPagesTab()
      case 5:
        return renderMarquesTab()
      default:
        return <p>Onglet en développement</p>
    }
  }

  const handleLogin = (admin: Admin) => {
    setCurrentAdmin(admin)
    setIsAuthenticated(true)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('admin_session')
    localStorage.removeItem('bearer_token')
    setCurrentAdmin(null)
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <AuthPrompt onAuth={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">LocalAdmin</h1>
          <p className="text-sm text-gray-600 mt-1">Gestion SEO</p>
          {currentAdmin && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800">
                {currentAdmin.prenom_admin} {currentAdmin.nom_admin}
              </p>
              <p className="text-xs text-blue-600">@{currentAdmin.pseudo_admin}</p>
              <p className="text-xs text-blue-600">Droits: {currentAdmin.droits_admin}</p>
              <button
                onClick={handleLogout}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
        <nav className="mt-6">
          <div className="px-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Navigation</p>
            <div className="space-y-1">
              {tabs.map((tab, index) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(index)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3 ${
                    activeTab === index
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="w-5 h-5 flex-shrink-0">
                    {index === 0 && '🏷️'}
                    {index === 1 && '📂'}
                    {index === 2 && '🏛️'}
                    {index === 3 && '🏙️'}
                    {index === 4 && '📄'}
                    {index === 5 && '🚗'}
                  </span>
                  <span className="font-medium">{tab}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
