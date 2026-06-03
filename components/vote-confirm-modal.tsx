'use client';

import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import type { Candidate } from '@/lib/supabase';

type Props = {
  candidate: Candidate;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
};

export function VoteConfirmModal({ candidate, onConfirm, onCancel, loading }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-1">Confirm Your Vote</h3>
          <p className="text-slate-500 text-sm mb-6">This action cannot be undone. You can only vote once per position.</p>

          <div className="w-full bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">You are voting for</p>
            <p className="text-lg font-bold text-slate-900">{candidate.name}</p>
            <p className="text-sm text-blue-600 font-medium">{candidate.position}</p>
            <p className="text-xs text-slate-500 mt-0.5">{candidate.department} &middot; {candidate.year}</p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-md shadow-blue-200 hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Voting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Vote
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
