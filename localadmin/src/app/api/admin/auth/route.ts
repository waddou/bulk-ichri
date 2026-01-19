import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import md5 from 'crypto-js/md5'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pseudo, password } = body

    // Get admin records matching pseudo/email
    const { data: adminRecords, error } = await supabaseAdmin
      .from('admin')
      .select('*')
      .or(`pseudo_admin.eq.${pseudo},mail_admin.eq.${pseudo}`)

    if (error) {
      return NextResponse.json({ error: 'Erreur de connexion à la base de données' }, { status: 500 })
    }

    if (!adminRecords || adminRecords.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Check password
    let authenticatedAdmin = null
    for (const admin of adminRecords) {
      // Try plain text password first
      if (admin.pwd_admin === password) {
        authenticatedAdmin = admin
        break
      }
      
      // Try MD5 hash
      const hashedPassword = md5(password).toString()
      if (admin.pwd_admin === hashedPassword) {
        authenticatedAdmin = admin
        break
      }
    }

    if (!authenticatedAdmin) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }

    // Generate session token
    const sessionToken = `admin_${authenticatedAdmin.id_admin}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return NextResponse.json({
      success: true,
      admin: authenticatedAdmin,
      sessionToken
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Erreur de connexion' }, { status: 500 })
  }
}
