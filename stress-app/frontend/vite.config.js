import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (command === 'build') {
    const missing = [
      ['VITE_SUPABASE_URL', env.VITE_SUPABASE_URL],
      ['VITE_BACKEND_URL', env.VITE_BACKEND_URL],
    ]

    if (!env.VITE_SUPABASE_ANON_KEY && !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      missing.push(['VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY', null])
    }

    const missingNames = missing.filter(([, value]) => !value).map(([name]) => name)

    if (missingNames.length > 0) {
      throw new Error(`Missing required production env values: ${missingNames.join(', ')}`)
    }
  }

  return {
    base: mode === 'development' ? '/' : './',
    plugins: [react()],
  }
})
