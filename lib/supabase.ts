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
  house: string;
  display_order: number;
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
  name: string;
  dob: string;
  class: string;
  has_voted: boolean;
  auth_user_id: string | null;
  created_at: string;
};

export type ElectionSetting = {
  id: string;
  key: string;
  value: any;
  updated_at: string;
  updated_by: string | null;
};

export type TimerSettings = {
  enabled: boolean;
  duration: number; // in seconds
  status: 'stopped' | 'running' | 'paused';
  start_time: string | null;
};

export type House = {
  id: number | string;
  name: string;
  display_order: number;
  color: string;
  created_at: string;
};

