import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xpxbxfuckljqdvkajlmx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweGJ4ZnVja2xqcWR2a2FqbG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODc4MDMsImV4cCI6MjA2MTg2MzgwM30.7NKWDfbBdCzvH39BrZBUopr12V_bKUqnNI-OdR-MdIs';

// Log the environment variables for debugging
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Provided' : 'Missing');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

// Log connection status
console.log('Initializing Supabase connection...');

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('Connected to Supabase successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('Disconnected from Supabase');
  }
});