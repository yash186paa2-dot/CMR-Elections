'use client';

import Image from 'next/image';
import { CheckCircle2, PartyPopper, ArrowRight } from 'lucide-react';
import type { Candidate } from '@/lib/supabase';

type Props = {
  candidate: Candidate;
  onDismiss: () => void;
};

export function VoteSuccessModal({ candidate, onDismiss }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vote-success-title"
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-fade-in" aria-hidden />
      <div className="relative z-10 w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-8 text-center shadow-2xl animate-fade-in-up sm:max-w-md sm:rounded-3xl sm:animate-scale-in">
        <div className="relative mx-auto mb-6 inline-flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-40" aria-hidden />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden />
          </div>
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
          <PartyPopper className="h-4 w-4" aria-hidden />
          Vote recorded successfully
        </div>

        <h3 id="vote-success-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Thank you for voting!
        </h3>
        <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-slate-600">
          Your vote for{' '}
          <span className="font-bold text-slate-900">{candidate.name}</span> as{' '}
          <span className="font-bold text-slate-900">{candidate.position}</span> has been saved.
        </p>

        {candidate.photo_url && (
          <div className="relative mx-auto mt-6 h-32 w-32 overflow-hidden rounded-2xl border-4 border-emerald-200 shadow-lg">
            <Image
              src={candidate.photo_url}
              alt={candidate.name}
              fill
              className="object-cover object-[center_20%]"
              sizes="128px"
            />
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-base leading-relaxed text-slate-700">
            You can continue voting in any remaining positions that you have not submitted yet.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-base font-bold text-white shadow-lg transition-all hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          Return to ballot
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
