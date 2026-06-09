'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import type { RollLoginFieldErrors } from '@/lib/student-auth';
import { Mail, Lock, AlertCircle, Hash, Calendar } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, isGuest, signInWithEmail, signInWithPassword, signInWithRoll } =
    useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const [loginMode, setLoginMode] = useState<'student' | 'rollno' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [dob, setDob] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [fieldErrors, setFieldErrors] = useState<RollLoginFieldErrors>({});

  const maxDob = new Date().toISOString().split('T')[0];

  useEffect(() => {
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

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const { error: signInError } = await signInWithEmail(email);

    if (signInError) {
      setMessage({
        type: 'error',
        text: signInError.message || 'Login failed. Please try again.',
      });
    } else {
      setMessage({
        type: 'success',
        text: 'Check your email for a login link from Supabase Auth. Click the link to verify and vote!',
      });
      setEmail('');
    }
    setIsLoading(false);
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

  const isSubmitDisabled =
    isLoading ||
    (loginMode === 'student' && !email.trim()) ||
    (loginMode === 'rollno' && (!rollNo.trim() || !dob)) ||
    (loginMode === 'admin' && (!email.trim() || !password));

  const cardTitle =
    loginMode === 'student'
      ? 'Welcome, Voter'
      : loginMode === 'rollno'
        ? 'Roll Number Login'
        : 'Admin Access';

  const cardDescription =
    loginMode === 'student'
      ? 'Sign in with your CMR college email to cast your vote in the student council elections.'
      : loginMode === 'rollno'
        ? 'Sign in with your roll number and date of birth.'
        : 'Sign in with your admin credentials to manage the election.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="text-center mb-6">
            <Image
              src="/logo.png"
              alt="CMR Logo"
              width={160}
              height={160}
              className="w-40 mx-auto object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
            CMR Elections
          </h1>
          <p className="text-blue-300 text-lg">Student Council Elections 2026</p>
          <p className="text-slate-400 text-sm mt-1">CMR NATIONAL PU COLLEGE</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => switchMode('student')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              loginMode === 'student'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10'
            }`}
          >
            2nd PUC Student Login
          </button>

          <button
            type="button"
            onClick={() => switchMode('rollno')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              loginMode === 'rollno'
                ? 'bg-green-600 text-white'
                : 'bg-white/10 text-slate-300'
            }`}
          >
            1st PUC Student Login
          </button>

          <button
            type="button"
            onClick={() => switchMode('admin')}
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

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 md:p-8 shadow-2xl animate-fade-in-up animation-delay-200">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">{cardTitle}</h2>
            <p className="text-slate-400 text-sm leading-relaxed">{cardDescription}</p>
          </div>

          {error === 'invalid_domain' && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center animate-shake flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Only <span className="font-semibold text-red-200">@cmr.ac.in</span> email addresses
                are allowed for email login.
              </span>
            </div>
          )}

          {message && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm flex items-start gap-2 ${
                message.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              }`}
              role="alert"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{message.text}</span>
            </div>
          )}

          <form
            onSubmit={
              loginMode === 'student'
                ? handleStudentLogin
                : loginMode === 'rollno'
                  ? handleRollNoLogin
                  : handleAdminLogin
            }
            className="space-y-4"
          >
            {(loginMode === 'student' || loginMode === 'admin') && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      loginMode === 'student' ? 'your.name@cmr.ac.in' : 'admin@cmr.ac.in'
                    }
                    required
                    autoComplete="email"
                    className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            {loginMode === 'rollno' && (
              <>
                <div>
                  <label htmlFor="roll_no" className="block text-sm font-medium text-slate-200 mb-2">
                    Roll Number
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="roll_no"
                      type="text"
                      value={rollNo}
                      onChange={(e) => {
                        setRollNo(e.target.value);
                        if (fieldErrors.roll_no) {
                          setFieldErrors((current) => ({ ...current, roll_no: undefined }));
                        }
                      }}
                      placeholder="e.g. 1B19"
                      required
                      autoComplete="off"
                      aria-invalid={!!fieldErrors.roll_no}
                      aria-describedby={fieldErrors.roll_no ? 'roll_no_error' : undefined}
                      className={`w-full pl-12 pr-4 py-3 bg-white/10 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.roll_no
                          ? 'border-red-400/60 focus:ring-red-500'
                          : 'border-white/20 focus:ring-green-500'
                      }`}
                    />
                  </div>
                  {fieldErrors.roll_no && (
                    <p id="roll_no_error" className="mt-2 text-sm text-red-300" role="alert">
                      {fieldErrors.roll_no}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="dob" className="block text-sm font-medium text-slate-200 mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                      id="dob"
                      type="date"
                      value={dob}
                      max={maxDob}
                      onChange={(e) => {
                        setDob(e.target.value);
                        if (fieldErrors.dob) {
                          setFieldErrors((current) => ({ ...current, dob: undefined }));
                        }
                      }}
                      required
                      aria-invalid={!!fieldErrors.dob}
                      aria-describedby={fieldErrors.dob ? 'dob_error' : undefined}
                      className={`w-full pl-12 pr-4 py-3 bg-white/10 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all [color-scheme:dark] ${
                        fieldErrors.dob
                          ? 'border-red-400/60 focus:ring-red-500'
                          : 'border-white/20 focus:ring-green-500'
                      }`}
                    />
                  </div>
                  {fieldErrors.dob && (
                    <p id="dob_error" className="mt-2 text-sm text-red-300" role="alert">
                      {fieldErrors.dob}
                    </p>
                  )}
                </div>
              </>
            )}

            {loginMode === 'admin' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                loginMode === 'student'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-500/30'
                  : loginMode === 'rollno'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg hover:shadow-green-500/30'
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
              ) : loginMode === 'rollno' ? (
                'Login with Roll Number'
              ) : (
                'Admin Login'
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <p className="text-xs text-blue-300 leading-relaxed">
              {loginMode === 'student'
                ? "📧 We'll send you a secure login link via email. Click it to vote!"
                : loginMode === 'rollno'
                  ? '🔐 Use the roll number and date of birth registered with the college.'
                  : '🔐 Use admin credentials for accessing the dashboard.'}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 animate-fade-in-up animation-delay-400">
          {[
            { label: 'Email verification', desc: 'No password required' },
            { label: 'Developed by', desc: 'Yeshwanth B -_- 2B PCMC' },
            { label: 'Fast & Secure', desc: 'Instant voting experience' },
          ].map((item) => (
            <div
              key={item.label}
              className="text-center p-3 bg-white/5 rounded-2xl border border-white/5"
            >
              <p className="text-white text-xs font-semibold mb-0.5">{item.label}</p>
              <p className="text-slate-500 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
