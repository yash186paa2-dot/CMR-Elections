'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string) => Promise<{ error: any }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
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
      console.log('SESSION:', session);
      console.log('USER:', session?.user);
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

    return await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:'https://cmr-elections-3k3d.vercel.app/auth/callback',
      },
    });
  };

  const signInWithPassword = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
