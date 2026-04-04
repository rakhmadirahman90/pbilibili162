import { createClient } from '@supabase/supabase-js';

// Pastikan hanya berisi URL
const supabaseUrl = 'https://missjyvqfehamtpyodjr.supabase.co';

// HAPUS teks "VITE_SUPABASE_ANON_KEY=" di dalam string ini
const supabaseAnonKey = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
