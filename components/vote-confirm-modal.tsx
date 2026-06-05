'use client';

import Image from 'next/image';
import { AlertTriangle, X, CheckCircle2, Shield } from 'lucide-react';
import type { Candidate } from '@/lib/supabase';

type Props = {
  candidate: Candidate;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
};

export function VoteConfirmModal({ candidate, onConfirm, onCancel, loading }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-vote-title"
    >
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden
      />
      <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl animate-fade-in-up sm:max-w-md sm:rounded-3xl sm:animate-scale-in">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          aria-label="Close confirmation"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
            <AlertTriangle className="h-9 w-9 text-amber-600" aria-hidden />
          </div>

          <h3 id="confirm-vote-title" className="text-2xl font-bold text-slate-900">
            Confirm your vote
          </h3>
          <p className="mt-2 max-w-xs text-base leading-relaxed text-slate-600">
            Please check the details below. You can only vote once for this position and cannot
            change your vote later.
          </p>

          <div className="mt-6 w-full overflow-hidden rounded-2xl border-2 border-blue-100 bg-blue-50/50 text-left">
            {candidate.photo_url && (
              <div className="relative h-40 w-full bg-slate-100">
                <Image
                  src={candidate.photo_url}
                  alt=""
                  fill
                  className="object-cover object-[center_20%]"
                  sizes="400px"
                />
              </div>
            )}
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                You are voting for
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">{candidate.name}</p>
              <p className="mt-1 text-base font-semibold text-blue-800">{candidate.position}</p>
              <p className="mt-1 text-sm text-slate-600">
                {candidate.department} · {candidate.year}
              </p>
            </div>
          </div>

          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Shield className="h-4 w-4 shrink-0" aria-hidden />
            Your vote is recorded securely
          </p>

          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="min-h-14 flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
            >
              Go back
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="min-h-14 flex-1 rounded-2xl bg-blue-700 px-4 text-base font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Submitting…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  Yes, confirm vote
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
