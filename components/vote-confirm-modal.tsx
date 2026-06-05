'use client';

import Image from 'next/image';
import { X, CheckCircle2, Shield, Vote } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-vote-title"
    >
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-h-[90dvh] max-w-[560px] flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl shadow-slate-900/25 animate-fade-in-up sm:max-h-[92dvh] sm:rounded-3xl sm:animate-scale-in">
        {/* Election header band */}
        <div className="shrink-0 border-b border-slate-900/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 pr-14 sm:px-7 sm:py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 sm:text-xs">
            CMR Elections · Official ballot
          </p>
          <h3 id="confirm-vote-title" className="mt-1 text-lg font-bold text-white sm:text-xl">
            Confirm your vote
          </h3>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          aria-label="Close confirmation"
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:right-4 sm:top-4 sm:h-11 sm:w-11 sm:bg-slate-100 sm:text-slate-500 sm:hover:bg-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Scrollable body — full portrait fits; buttons stay pinned below */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="px-4 py-4 sm:px-7 sm:py-6">
            <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-md">
              {candidate.photo_url ? (
                <div className="relative flex min-h-[300px] w-full items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 sm:min-h-[380px]">
                  <div className="relative h-[300px] w-full sm:h-[380px]">
                    <Image
                      src={candidate.photo_url}
                      alt={`Full photo of ${candidate.name}`}
                      fill
                      priority
                      className="object-contain object-center"
                      sizes="(max-width: 640px) 100vw, 560px"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[200px] items-center justify-center bg-gradient-to-b from-slate-100 to-slate-50">
                  <p className="text-sm font-medium text-slate-400">No photo available</p>
                </div>
              )}

              <div className="border-t border-slate-100 bg-gradient-to-b from-emerald-50/80 to-white px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50 sm:h-12 sm:w-12"
                    aria-hidden
                  >
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-emerald-800 sm:text-base">
                      You are about to vote for:
                    </p>
                    <p className="mt-1 text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">
                      {candidate.name}
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-700 sm:text-xl">
                      {candidate.position}
                    </p>
                    {(candidate.department || candidate.year) && (
                      <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
                        {[candidate.department, candidate.year].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-500 sm:mt-4 sm:text-sm">
              <Shield className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              One vote per position · cannot be changed after confirming
            </p>
          </div>
        </div>

        {/* Actions — always visible */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="order-2 min-h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50 sm:order-1 sm:min-h-14 sm:flex-1"
            >
              Go back
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="order-1 min-h-[3.25rem] w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 text-base font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-900/25 transition-all hover:from-emerald-700 hover:to-emerald-800 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-70 sm:order-2 sm:min-h-14 sm:flex-[1.35]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2 normal-case tracking-normal">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Submitting your vote…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2.5">
                  <Vote className="h-5 w-5 shrink-0" aria-hidden />
                  Confirm vote
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
