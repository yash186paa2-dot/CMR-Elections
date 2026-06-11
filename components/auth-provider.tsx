'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import type { RollLoginFieldErrors } from '@/lib/student-auth';
import { validateRollLoginInput } from '@/lib/student-auth';
import type { User, Session } from '@supabase/supabase-js';

type AuthError = {
  message: string;
  fieldErrors?: RollLoginFieldErrors;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithRoll: (
    rollNo: string,
    dob: string
  ) => Promise<{
    error: AuthError | null;
    student?: { id: string; roll_no: string; name: string };
  }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInAsGuest: () => void;
  signInAsAdminGuest: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isGuest: false,
  signInWithEmail: async () => ({ error: null }),
  signInWithPassword: async () => ({ error: null }),
  signInWithRoll: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInAsGuest: () => {},
  signInAsAdminGuest: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) checkAdmin(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await checkAdmin(session.user.id);
        })();
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string) => {
    // Validate @cmr.ac.in domain
    if (!email.endsWith('@cmr.ac.in')) {
      return { error: { message: 'Only @cmr.ac.in email addresses are allowed' } };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error: error ? { message: error.message } : null };
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? { message: error.message } : null };
  };

  const signInWithRoll = async (rollNo: string, dob: string) => {
    const validation = validateRollLoginInput(rollNo, dob);
    if (!validation.valid) {
      return {
        error: {
          message: validation.message,
          fieldErrors: validation.errors,
        },
      };
    }

    let response: Response;
    try {
      response = await fetch('/api/auth/roll-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_no: validation.roll_no,
          dob: validation.dob,
        }),
      });
    } catch {
      return {
        error: { message: 'Network error. Check your connection and try again.' },
      };
    }

    const payload = (await response.json()) as {
      error?: string;
      fieldErrors?: RollLoginFieldErrors;
      email?: string;
      token_hash?: string;
      student?: { id: string; roll_no: string; name: string };
    };

    if (!response.ok) {
      return {
        error: {
          message: payload.error || 'Invalid roll number or date of birth.',
          fieldErrors: payload.fieldErrors,
        },
      };
    }

    if (!payload.token_hash) {
      return { error: { message: 'Unable to complete login. Please try again.' } };
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: payload.token_hash,
      type: 'magiclink',
    });

    if (error) {
      return { error: { message: error.message || 'Unable to complete login.' } };
    }

    return { error: null, student: payload.student };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error: error ? { message: error.message } : null };
  };

  const signInAsGuest = () => {
    setIsGuest(true);
    setLoading(false);
  };

  const signInAsAdminGuest = () => {
    setIsGuest(true);
    setIsAdmin(true);
    setLoading(false);
  };

  const signOut = async () => {
    if (user) {
      localStorage.removeItem(`selectedHouse_${user.id}`);
    }
    setIsGuest(false);
    setIsAdmin(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        isGuest,
        signInWithEmail,
        signInWithPassword,
        signInWithRoll,
        signInWithGoogle,
        signInAsGuest,
        signInAsAdminGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
