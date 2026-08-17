import { createClient } from '@supabase/supabase-js'

/**
 * Shared Supabase client module.
 *
 * Eliminates the duplicated getSupabase() pattern that was copy-pasted across
 * 7+ route files. Uses the same lazy initialization pattern and env vars.
 */
let _supabase = null

export function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  _supabase = createClient(url, key)
  return _supabase
}
