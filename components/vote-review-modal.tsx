'use client';

import { memo } from 'react';
import Image from 'next/image';
import { X, CheckCircle2, Edit2 } from 'lucide-react';
import type { Candidate } from '@/lib/supabase';

type Props = {
  selections: Record<string, Candidate>;
  onEdit: (position: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

function VoteReviewModalComponent({ selections, onEdit, onConfirm, onCancel, loading = false }: Props) {
  const positionOrder = Object.keys(selections);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Review Your Selections</h2>
            <p className="mt-1 text-sm text-slate-600">
              Please review your choices before final submission
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Selections */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {positionOrder.map((position) => {
              const candidate = selections[position];
              return (
                <div
                  key={position}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                    {candidate.photo_url ? (
                      <Image
                        src={candidate.photo_url}
                        alt={candidate.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-200">
                        <CheckCircle2 className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-600 uppercase">{position}</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">{candidate.name}</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {candidate.department} · {candidate.year}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEdit(position)}
                    disabled={loading}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50"
                  >
                    <Edit2 className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:min-h-12 sm:px-8 sm:text-base"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 sm:min-h-12 sm:px-8 sm:text-base"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export const VoteReviewModal = memo(VoteReviewModalComponent);
