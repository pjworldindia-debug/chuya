import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = typeof import.meta !== 'undefined' 
  ? (import.meta as Record<string, Record<string, string>>).env?.VITE_SUPABASE_URL 
  : process.env.SUPABASE_URL

const supabaseAnonKey = typeof import.meta !== 'undefined'
  ? (import.meta as Record<string, Record<string, string>>).env?.VITE_SUPABASE_ANON_KEY
  : process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key not set. Using placeholder values for development.')
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

/**
 * Admin client with service role key — bypasses RLS.
 * Only use this server-side (apps/api).
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client')
  }
  return createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export type { Database }
