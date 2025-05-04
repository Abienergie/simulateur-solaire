import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = 'https://xpxbxfuckljqdvkajlmx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweGJ4ZnVja2xqcWR2a2FqbG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODc4MDMsImV4cCI6MjA2MTg2MzgwM30.7NKWDfbBdCzvH39BrZBUopr12V_bKUqnNI-OdR-MdIs';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);