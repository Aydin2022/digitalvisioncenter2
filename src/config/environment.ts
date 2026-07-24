/**
 * Safe Environment Configuration
 * 
 * This file exports only necessary environment variables.
 * - VITE_* variables are available in browser
 * - Other variables are server-side only
 */

// Zain Cash Client-Side Configuration
export const zaincashConfig = {
  clientId: import.meta.env.VITE_ZAINCASH_CLIENT_ID || '',
  msisdn: import.meta.env.VITE_ZAINCASH_MSISDN || '',
  apiUrl: import.meta.env.VITE_ZAINCASH_API_URL || 'https://pg-api.zaincash.iq',
}

// Supabase Client-Side Configuration
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
}

// Validate critical configuration
function validateConfig() {
  const errors: string[] = []

  if (!zaincashConfig.clientId) {
    errors.push('VITE_ZAINCASH_CLIENT_ID is not defined')
  }
  if (!zaincashConfig.msisdn) {
    errors.push('VITE_ZAINCASH_MSISDN is not defined')
  }
  if (!supabaseConfig.url) {
    errors.push('VITE_SUPABASE_URL is not defined')
  }
  if (!supabaseConfig.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is not defined')
  }

  if (errors.length > 0) {
    console.warn('⚠️  Environment Configuration Warnings:\n' + errors.map(e => `  - ${e}`).join('\n'))
  }
}

validateConfig()

export default {
  zaincash: zaincashConfig,
  supabase: supabaseConfig,
}
