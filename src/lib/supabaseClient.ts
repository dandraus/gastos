// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://zswrqbhrxlawnwocyduj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzd3JxYmhyeGxhd253b2N5ZHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxOTg1NDQsImV4cCI6MjA1MTc3NDU0NH0.6th1Cpf63yciic_NpwWg6NDPfuOpJG5cr6SuQi-MKZ4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
