'use client';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Vote, Shield, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, isGuest, signInWithEmail, signInWithPassword, signInAsGuest, signInAsAdminGuest, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const [loginMode, setLoginMode] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loading && (user || isGuest)) {
      router.replace('/');
    }
  }, [user, isGuest, loading, router]);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const { error } = await signInWithEmail(email);

    if (error) {
      setMessage({ type: 'error', text: error.message || 'Login failed. Please try again.' });
    } else {
      setMessage({
        type: 'success',
        text: 'Check your email for a login link. Click the link to verify and vote!',
      });
      setEmail('');
    }
    setIsLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

  const { error } = await signInWithPassword(email, password);

    console.log('LOGIN ERROR:', error);

   const { data } = await supabase.auth.getSession();
    console.log('CURRENT SESSION:', data.session);

    if (error) {
  console.error('FULL LOGIN ERROR:', error);
  alert(
    JSON.stringify(
      {
        message: error.message,
        status: error.status,
        name: error.name,
      },
      null,
      2
    )
  );

  setMessage({
    type: 'error',
    text: error.message || 'Admin login failed.',
  });
} else {
      setMessage({ type: 'success', text: 'Admin login successful! Redirecting...' });
      setTimeout(() => router.push('/admin'), 1500);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo + college name */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="text-center mb-6">
            <img
              src="/logo.png"
              alt="CMR Logo"
              className="w-40 mx-auto"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">CMR Elections</h1>
          <p className="text-blue-300 text-lg">Student Council Elections 2026</p>
          <p className="text-slate-400 text-sm mt-1">CMR NATIONAL PU COLLEGE</p>
        </div>

        {/* Login Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setLoginMode('student');
              setMessage(null);
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              loginMode === 'student'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10'
            }`}
          >
            Student Login
          </button>
          <button
            onClick={() => {
              setLoginMode('admin');
              setMessage(null);
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              loginMode === 'admin'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Lock className="w-4 h-4" />
              Admin
            </div>
          </button>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in-up animation-delay-200">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">
              {loginMode === 'student' ? 'Welcome, Voter' : 'Admin Access'}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {loginMode === 'student'
                ? 'Sign in with your CMR college email to cast your vote in the student council elections.'
                : 'Sign in with your admin credentials to manage the election.'}
            </p>
          </div>

          {error === 'invalid_domain' && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center animate-shake flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Only <span className="font-semibold text-red-200">@cmr.ac.in</span> email addresses are allowed.</span>
            </div>
          )}

          <form
            onSubmit={loginMode === 'student' ? handleStudentLogin : handleAdminLogin}
            className="space-y-4"
          >
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    loginMode === 'student' ? 'your.name@cmr.ac.in' : 'admin@cmr.ac.in'
                  }
                  required
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Password Input (Admin Only) */}
            {loginMode === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                loginMode === 'student'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-500/30'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg hover:shadow-purple-500/30'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : loginMode === 'student' ? (
                'Send Magic Link'
              ) : (
                'Admin Login'
              )}
            </button>

          </form>

          {/* Info message */}
          <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <p className="text-xs text-blue-300 leading-relaxed">
              {loginMode === 'student'
                ? '📧 We\'ll send you a secure login link via email. Click it to vote!'
                : '🔐 Use admin credentials for accessing the dashboard.'}
            </p>
          </div>
        </div>

        {/* Features row */}
        <div className="mt-8 grid grid-cols-3 gap-4 animate-fade-in-up animation-delay-400">
          {[
            
            { label: 'Email verification', desc: 'No password required' },
            { label: 'Developed by', desc: 'Yeshwanth B -_- 2B PCMC' },
            { label: 'Fast & Secure', desc: 'Instant voting experience' },
            
          ].map((item) => (
            <div key={item.label} className="text-center p-3 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-white text-xs font-semibold mb-0.5">{item.label}</p>
              <p className="text-slate-500 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
