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
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className={`candidate-card relative flex flex-col overflow-hidden rounded-xl border-2 bg-white transition-all duration-300 ease-out ${
        isVotedFor
          ? 'scale-[1.02] border-emerald-300 bg-emerald-50 shadow-lg ring-2 ring-emerald-200'
          : hasVoted
            ? 'border-slate-200 opacity-60'
            : 'border-slate-200 hover:border-slate-300 cursor-pointer'
      }`}
      onClick={() => !hasVoted && onSelect(candidate)}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200">
        {candidate.photo_url ? (
          <Image
            src={candidate.photo_url}
            alt={`Portrait of ${candidate.name}`}
            fill
            priority={rank < 2}
            loading={rank < 2 ? 'eager' : 'lazy'}
            className={`object-cover object-[center_20%] ${
              isVotedFor ? 'brightness-105' : ''
            }`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
              <UserRound className="h-8 w-8 text-slate-400" aria-hidden />
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
        
        {/* Radio button indicator */}
        <div className="absolute top-2 right-2 z-10">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
              isVotedFor
                ? 'border-emerald-500 bg-emerald-500 shadow-md shadow-emerald-200'
                : 'border-white/80 bg-white/60'
            }`}
          >
            {isVotedFor && (
              <CheckCircle2 className="h-5 w-5 text-white animate-in zoom-in duration-300" aria-hidden />
            )}
          </div>
        </div>

        <div className="absolute bottom-2 left-2 right-2">
          <h3 className="text-sm font-bold leading-tight text-white drop-shadow-md sm:text-base">
            {candidate.name}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
            {candidate.position}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
            <Briefcase className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
            {candidate.department}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
            <GraduationCap className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
            {candidate.year}
          </span>
        </div>

        <p className="mb-2 text-xs leading-relaxed text-slate-700 line-clamp-2">{candidate.bio}</p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200 min-h-[36px] sm:min-h-0 sm:py-1.5"
          aria-expanded={expanded}
        >
          <BookOpen className="h-3 w-3 shrink-0" aria-hidden />
          {expanded ? 'Hide' : 'Manifesto'}
          {expanded ? (
            <ChevronUp className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
          )}
        </button>

        {expanded && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs leading-relaxed text-slate-800">
            {candidate.manifesto}
          </div>
        )}
      </div>
    </article>
  );
}

export const CandidateCard = memo(CandidateCardComponent);
