import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fxznwdzgniitaidiemto.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4em53ZHpnbmlpdGFpZGllbXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NjIzNzIsImV4cCI6MjEwNDAzODM3Mn0.N4sVY3V0xJN0UmNlnv0qldf2CEs9pcaxunjcZTkZoso';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)