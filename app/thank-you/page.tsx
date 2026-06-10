'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle2, Home, Shield } from 'lucide-react';

export default function ThankYouPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#eef2f7] flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-[2.5rem] p-10 md:p-16 shadow-2xl border border-white text-center animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center">
          {/* Large Success Icon */}
          <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-[3rem] bg-emerald-50 text-emerald-600 shadow-inner">
            <CheckCircle2 className="h-20 w-20" />
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Thank You for Voting
          </h1>
          
          <p className="text-xl font-bold text-slate-600 mb-12">
            Your vote has been successfully recorded.
          </p>

          {/* Quote Card */}
          <div className="w-full p-8 rounded-[2rem] bg-slate-50 border border-slate-100 mb-12 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Shield className="h-24 w-24 text-slate-900" />
             </div>
             <blockquote className="relative">
                <p className="text-2xl md:text-3xl font-black text-slate-800 leading-tight italic">
                  &quot;The future depends on what we do today.&quot;
                </p>
                <footer className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                  — Mahatma Gandhi
                </footer>
             </blockquote>
          </div>

          <div className="space-y-6">
            <p className="text-slate-500 font-medium leading-relaxed">
              Your participation helps shape the future of <br className="hidden md:block" />
              <span className="text-slate-900 font-bold">CMR National PU College.</span>
            </p>

            <button
              onClick={() => router.push('/')}
              className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-[#002B5B] px-10 text-lg font-black uppercase tracking-widest text-white shadow-xl hover:bg-[#003a7a] transition-all active:scale-[0.98]"
            >
              <Home className="h-6 w-6" />
              Return to Home
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 opacity-50">
            <Image
              src="/logo.png"
              alt="CMR Logo"
              width={30}
              height={30}
              className="object-contain"
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Official Student Council Election Portal 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
