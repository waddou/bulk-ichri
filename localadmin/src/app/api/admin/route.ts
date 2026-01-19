import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Verify admin session from request
async function verifyAdminSession(request: NextRequest): Promise<boolean> {
  const adminSession = request.headers.get('x-admin-session')
  
  console.log('Verifying admin session...')
  console.log('Admin session header present:', !!adminSession)
  
  if (!adminSession) {
    console.log('No admin session header found')
    return false
  }

  try {
    const admin = JSON.parse(adminSession)
    console.log('Parsed admin ID:', admin.id_admin)
    
    // Verify admin exists in database
    const { data, error } = await supabaseAdmin
      .from('admin')
      .select('id_admin')
      .eq('id_admin', admin.id_admin)
      .single()

    console.log('Database verification result:', { data, error: error?.message })
    
    if (error) {
      console.error('Database error during verification:', error)
      return false
    }
    
    return data !== null
  } catch (e) {
    console.error('Error parsing admin session:', e)
    return false
  }
}

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const isAdmin = await verifyAdminSession(request)
  
  if (!isAdmin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, table, data, id, idField } = body

    // Validate table name to prevent injection
    const allowedTables = ['categories', 'sous_categories', 'gouvernorats_tn', 'villes_tn', 'landing_pages', 'marques']
    if (!allowedTables.includes(table)) {
      return NextResponse.json({ error: 'Table non autorisée' }, { status: 400 })
    }

    // Validate action
    const allowedActions = ['select', 'update', 'insert', 'delete']
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ error: 'Action non autorisée' }, { status: 400 })
    }

    switch (action) {
      case 'select': {
        const { data: selectResult, error: selectError } = await supabaseAdmin
          .from(table)
          .select('*')
          .order(idField || 'id')

        if (selectError) {
          return NextResponse.json({ error: selectError.message }, { status: 400 })
        }

        return NextResponse.json({ data: selectResult })
      }

      case 'update': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updateResult, error: updateError } = await (supabaseAdmin
          .from(table)
          .update(data)
          .eq(idField || 'id', id)
          .select() as any)

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 400 })
        }

        return NextResponse.json({ data: updateResult })
      }

      case 'insert': {
        const { data: insertResult, error: insertError } = await supabaseAdmin
          .from(table)
          .insert(data)
          .select()

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 400 })
        }

        return NextResponse.json({ data: insertResult })
      }

      case 'delete': {
        const { error: deleteError } = await supabaseAdmin
          .from(table)
          .delete()
          .eq(idField || 'id', id)

        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
