'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import type { RollLoginFieldErrors } from '@/lib/student-auth';
import { Mail, Lock, AlertCircle, Hash, Calendar, Clock } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, isGuest, signInWithPassword, signInWithRoll, signInWithGoogle } =
    useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const [loginMode, setLoginMode] = useState<'student' | 'rollno' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [dob, setDob] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RollLoginFieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [electionStatus, setElectionStatus] = useState<'open' | 'closed' | 'paused' | 'scheduled'>('scheduled');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const fetchElectionStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('election_settings')
        .select('key, value')
        .eq('key', 'election_status')
        .single();
      
      if (data) {
        const val = typeof data.value === 'string' ? data.value.replace(/"/g, '') : data.value;
        console.log("[Student] Current election status:", val);
        setElectionStatus(val as any);
      }
    } catch (err) {
      console.error("Error fetching election status:", err);
    }
  };

  useEffect(() => {
    fetchElectionStatus();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('login_election_settings')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'election_settings',
          filter: 'key=eq.election_status'
        },
        (payload) => {
          console.log("[Student] Realtime status update received:", payload);
          const val = typeof payload.new.value === 'string' ? payload.new.value.replace(/"/g, '') : payload.new.value;
          console.log("[Student] Realtime status update received (val):", val);
          setElectionStatus(val as any);
        }
      )
      .subscribe();

    // Fallback polling
    const interval = setInterval(fetchElectionStatus, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const maxDob = new Date().toISOString().split('T')[0];

  useEffect(() => {
    console.log("Election Status From Database:", electionStatus);
    if (!loading && (user || isGuest)) {
      router.replace('/');
    }
  }, [user, isGuest, loading, router]);

  const clearRollErrors = () => {
    setFieldErrors({});
    setMessage(null);
  };

  const switchMode = (mode: 'student' | 'rollno' | 'admin') => {
    setLoginMode(mode);
    clearRollErrors();
  };

  const handleRollNoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearRollErrors();

    const { error: signInError, student } = await signInWithRoll(rollNo, dob);

    if (signInError) {
      if (signInError.fieldErrors) {
        setFieldErrors(signInError.fieldErrors);
      }
      setMessage({
        type: 'error',
        text: signInError.message || 'Invalid roll number or date of birth.',
      });
      setIsLoading(false);
      return;
    }

    setMessage({
      type: 'success',
      text: student?.name
        ? `Welcome, ${student.name}. Redirecting…`
        : 'Login successful. Redirecting…',
    });
    router.replace('/');
    setIsLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const { error: signInError } = await signInWithPassword(email, password);

    if (signInError) {
      setMessage({
        type: 'error',
        text: signInError.message || 'Admin login failed.',
      });
    } else {
      setMessage({ type: 'success', text: 'Admin login successful! Redirecting...' });
      setTimeout(() => router.push('/admin'), 1500);
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Google login failed.',
      });
      setIsLoading(false);
    }
  };

  const isSubmitDisabled =
    isLoading ||
    (loginMode === 'admin' && (!email.trim() || !password)) ||
    (loginMode === 'rollno' && (!rollNo.trim() || !dob));

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-start pt-12 md:pt-16 px-4 relative">
      {/* Election Status Overlay for Students */}
      {electionStatus !== 'open' && loginMode !== 'admin' && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md p-6 text-center">
          <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
            <div className={`mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] mx-auto shadow-2xl ${
              electionStatus === 'paused' ? 'bg-amber-500' : 'bg-rose-500'
            }`}>
              {electionStatus === 'paused' ? (
                <Clock className="h-12 w-12 text-white animate-pulse" />
              ) : (
                <Lock className="h-12 w-12 text-white" />
              )}
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight mb-4 uppercase">
              Election {electionStatus}
            </h2>
            <p className="text-xl text-slate-400 font-medium mb-12 leading-relaxed">
              {electionStatus === 'paused' 
                ? 'The election is currently paused by the administrator. Please wait for it to resume.' 
                : 'The election has been closed. Voting is no longer permitted.'}
            </p>
            <button
              onClick={() => setLoginMode('admin')}
              className="px-8 py-4 rounded-2xl border-2 border-white/20 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all text-sm"
            >
              Admin Login
            </button>
          </div>
        </div>
      )}

      {/* Background with minimal institutional lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header: Official Branding */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-block relative mb-4">
            <Image
              src="/logo.png"
              alt="CMR Logo"
              width={260}
              height={260}
              className="w-44 md:w-52 mx-auto object-contain drop-shadow-2xl"
              priority
            />
          </div>
          <div className="mt-1 space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              CMR Elections
            </h1>
            <p className="text-slate-400 text-sm md:text-base font-medium">
              Official Student Council Elections 2026
            </p>
          </div>
        </div>

        {/* Tab Navigation: Minimalist */}
        <div className="flex p-1 gap-1 mb-6 bg-white/[0.03] border border-white/5 rounded-2xl">
          {[
            { id: 'student', label: 'Student Login' },
            { id: 'rollno', label: 'Roll Number' },
            { id: 'admin', label: 'Admin Access' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchMode(tab.id as any)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                loginMode === tab.id
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Portal Card: Institutional Style */}
        <div className="bg-[#0f172a]/80 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl animate-fade-in animation-delay-200 min-h-[380px] flex flex-col justify-center">
          
          {error === 'invalid_domain' && (
            <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-xs font-medium text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Use your official @cmr.ac.in account only.</span>
            </div>
          )}

          {message && (
            <div
              className={`mb-6 p-4 rounded-2xl text-xs font-medium flex items-start gap-2 ${
                message.type === 'error'
                  ? 'bg-red-500/5 border border-red-500/20 text-red-400'
                  : 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400'
              }`}
              role="alert"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{message.text}</span>
            </div>
          )}

          {loginMode === 'student' && (
            <div className="space-y-10 py-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-3">Student Login</h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                  Sign in using your official CMR Google account to participate in the Student Council Elections.
                </p>
              </div>

              <div className="space-y-8">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-4 py-4 px-6 rounded-2xl font-bold text-slate-900 bg-white hover:bg-slate-100 transition-all disabled:opacity-50 text-base shadow-xl"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with CMR Google Account
                </button>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-3 px-1">
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">Google Authentication</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.51 12.09 1.011 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
                      </svg>
                      <span className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">Secured by Apple</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">High security</span>
                    </div>
                  </div>

                  <div className="pt-6 text-center border-t border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Protected by Google, Apple, Supabase authentication, HTTPS encryption
                    </p>
                    <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                      Only verified <span className="text-slate-400">@cmr.ac.in</span> accounts can access the voting portal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loginMode === 'rollno' && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Roll Number Login</h2>
                <p className="text-slate-400 text-sm">Secure fallback authentication</p>
              </div>

              <form onSubmit={handleRollNoLogin} className="space-y-4">
                <div className="space-y-4">
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      placeholder="Roll Number"
                      className={`w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all ${
                        fieldErrors.roll_no ? 'border-red-500/40 ring-red-500/10' : ''
                      }`}
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="date"
                      value={dob}
                      max={maxDob}
                      onChange={(e) => setDob(e.target.value)}
                      className={`w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all [color-scheme:dark] ${
                        fieldErrors.dob ? 'border-red-500/40 ring-red-500/10' : ''
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all disabled:opacity-50 text-sm tracking-wide shadow-lg"
                >
                  {isLoading ? 'Verifying...' : 'Login with Roll Number'}
                </button>
              </form>
            </div>
          )}

          {loginMode === 'admin' && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Admin Access</h2>
                <p className="text-slate-400 text-sm">Election Commission Credentials</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Admin Email"
                      className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white placeholder-slate-700 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-blue-900 border border-blue-800 hover:bg-blue-800 transition-all disabled:opacity-50 text-sm tracking-wide shadow-lg"
                >
                  {isLoading ? 'Authenticating...' : 'Sign in as Admin'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Official Footer: Minimalist */}
        <div className="mt-12 text-center animate-fade-in animation-delay-400">
          <div className="inline-block py-6 px-8 rounded-[2rem] bg-white/[0.02] border border-white/5 w-full">
            <p className="text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-wider">Designed & Developed by</p>
            <p className="text-white text-xl font-black tracking-tighter uppercase leading-none">Yeshwanth B</p>
          </div>
          
          <div className="mt-8 opacity-20">
             <div className="h-px w-16 bg-white mx-auto mb-4" />
             <p className="text-white text-[9px] font-bold uppercase tracking-[0.4em]">Official Student Council Elections 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
