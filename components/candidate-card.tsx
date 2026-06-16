'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import {
  CheckCircle2,
  Briefcase,
  BookOpen,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  UserRound,
  MapPin,
} from 'lucide-react';
import type { Candidate } from '@/lib/supabase';

type Props = {
  candidate: Candidate;
  hasVoted: boolean;
  isVotedFor: boolean;
  onSelect: (candidate: Candidate) => void;
  rank?: number;
};

function CandidateCardComponent({ candidate, hasVoted, isVotedFor, onSelect, rank = 0 }: Props) {
  const isSubmittedChoice = hasVoted && isVotedFor;
  const isActiveSelection = !hasVoted && isVotedFor;

  return (
    <article
      className={`candidate-card relative flex h-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border transition-all duration-500 ease-out ${
        isSubmittedChoice
          ? 'border-emerald-500 bg-emerald-50 shadow-lg ring-2 ring-emerald-500/20'
          : isActiveSelection
            ? 'scale-[1.01] sm:scale-[1.02] border-emerald-500 bg-[#e6f9f0] shadow-[0_12px_32px_-12px_rgba(16,185,129,0.35)] ring-2 sm:ring-4 ring-emerald-500/30'
            : hasVoted
              ? 'border-slate-200 opacity-50'
              : 'cursor-pointer border-slate-200 bg-white hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl'
      }`}
      onClick={() => !hasVoted && onSelect(candidate)}
      onKeyDown={(event) => {
        if (hasVoted) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(candidate);
        }
      }}
      role="button"
      tabIndex={hasVoted ? -1 : 0}
    >
      {/* 95% Photo Fill Section */}
      <div className="relative aspect-[4/5] sm:aspect-[3/4] w-full overflow-hidden">
        {candidate.photo_url && candidate.photo_url.length > 0 ? (
          <Image
            src={candidate.photo_url}
            alt={candidate.name}
            fill
            sizes="(max-width: 480px) 45vw, (max-width: 768px) 50vw, 33vw"
            className="object-cover object-top"
            priority={rank < 6}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <UserRound className="h-8 w-8 sm:h-12 sm:w-12 text-slate-300" />
          </div>
        )}

        {/* Selection Status Overlay */}
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
          <div
            className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border-1.5 sm:border-2 transition-all duration-500 ${
              isVotedFor
                ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_4px_8px_-2px_rgba(16,185,129,0.4)]'
                : 'border-white/40 bg-black/20 text-white backdrop-blur-md'
            }`}
          >
            {isVotedFor && (
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 animate-in zoom-in duration-300" aria-hidden />
            )}
          </div>
        </div>

        {/* Bottom Info Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2.5 sm:px-4 pb-3 sm:pb-5 pt-8 sm:pt-12">
          <h3 className="text-sm font-black leading-tight tracking-tight text-white sm:text-xl">
            {candidate.name}
          </h3>
        </div>
      </div>

      {/* Details Section */}
      <div className="flex flex-1 flex-col p-2 sm:p-3">
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold text-slate-700">
            <Briefcase className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 text-slate-500" aria-hidden />
            {candidate.department}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold text-slate-700">
            <GraduationCap className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 text-slate-500" aria-hidden />
            {candidate.year}
          </span>
        </div>
      </div>
    </article>
  );
}

export const CandidateCard = memo(CandidateCardComponent);
