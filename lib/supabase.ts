import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'cmr-voting-web',
    },
  },
});

export type Candidate = {
  id: string;
  name: string;
  position: string;
  department: string;
  year: string;
  bio: string;
  photo_url: string;
  manifesto: string;
  vote_count: number;
  created_at: string;
};

export type Vote = {
  id: string;
  voter_id: string;
  voter_email: string;
  candidate_id: string;
  position: string;
  created_at: string;
};

export type Admin = {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
};

export type Student = {
  id: string;
  roll_no: string;
  dob: string;
  full_name: string;
  department: string;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
};
