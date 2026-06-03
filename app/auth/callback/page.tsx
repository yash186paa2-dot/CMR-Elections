'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const finishSignIn = async () => {
      const error = searchParams.get('error');
      const code = searchParams.get('code');

      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error)}`);
        return;
      }

      if (!code) {
        router.replace('/login?error=auth_failed');
        return;
      }

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError || !data.user) {
        router.replace('/login?error=auth_failed');
        return;
      }

      const email = data.user.email ?? '';
      if (!email.endsWith('@cmr.ac.in')) {
        await supabase.auth.signOut();
        router.replace('/login?error=invalid_domain');
        return;
      }

      router.replace('/');
    };

    finishSignIn();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-11 h-11 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
        <div>
          <h1 className="text-lg font-semibold text-white">Signing you in</h1>
          <p className="text-sm text-slate-400">Verifying your secure voting session...</p>
        </div>
      </div>
    </div>
  );
}
