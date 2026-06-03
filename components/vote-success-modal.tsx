'use client';

import { CheckCircle2, PartyPopper, ArrowRight } from 'lucide-react';
import type { Candidate } from '@/lib/supabase';

type Props = {
  candidate: Candidate;
  onDismiss: () => void;
};

export function VoteSuccessModal({ candidate, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-scale-in text-center">
        {/* Animated success icon */}
        <div className="relative inline-flex items-center justify-center w-20 h-20 mb-5">
          <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-30" />
          <div className="relative w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200 mb-4">
          <PartyPopper className="w-3.5 h-3.5" />
          Vote Recorded!
        </div>

        <h3 className="text-2xl font-bold text-slate-900 mb-2">You&apos;re all set!</h3>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Your vote for <span className="font-semibold text-slate-700">{candidate.name}</span> for{' '}
          <span className="font-semibold text-slate-700">{candidate.position}</span> has been securely recorded.
        </p>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
          <p className="text-xs text-slate-500">Every vote counts. Thank you for participating in the democratic process!</p>
        </div>

        <button
          onClick={onDismiss}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Continue Voting
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
