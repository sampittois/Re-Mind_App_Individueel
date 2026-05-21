import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ejjyjkyyssuqvvuzaiui.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqanlqa3l5c3N1cXZ2dXphaXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDMwMjksImV4cCI6MjA5MzExOTAyOX0.6dNTWgsxBFeEziDz6xkt8akXcWvs2F5n87zNA0C5LBs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
