'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import {
  CheckCircle2,
  Vote,
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
  position: string;
  onVote: (candidate: Candidate) => void;
  rank?: number;
};

function CandidateCardComponent({ candidate, hasVoted, isVotedFor, onVote, rank = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className={`candidate-card group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all duration-300 sm:rounded-[1.35rem] ${
        isVotedFor
          ? 'border-emerald-500 ring-4 ring-emerald-200/80 shadow-[0_20px_50px_rgba(16,185,129,0.2)]'
          : hasVoted
            ? 'border-slate-200 opacity-75'
            : 'border-slate-200 hover:border-cyan-400 hover:shadow-[0_20px_55px_rgba(8,145,178,0.14)] active:scale-[0.99] sm:hover:-translate-y-1'
      }`}
    >
      {isVotedFor && (
        <div
          className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 bg-emerald-600 py-2.5 text-sm font-bold uppercase tracking-wide text-white"
          aria-label="Your selected candidate"
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          Your vote for this position
        </div>
      )}

      <div
        className={`relative aspect-[3/4] w-full min-h-[22rem] overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 sm:min-h-[26rem] md:min-h-[28rem] ${
          isVotedFor ? 'mt-10' : ''
        }`}
      >
        {candidate.photo_url ? (
          <Image
            src={candidate.photo_url}
            alt={`Portrait of ${candidate.name}`}
            fill
            priority={rank < 2}
            loading={rank < 2 ? 'eager' : 'lazy'}
            className={`object-cover object-[center_20%] transition-transform duration-500 ${
              !hasVoted ? 'group-hover:scale-[1.02]' : ''
            } ${isVotedFor ? 'brightness-[1.02]' : ''}`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-md">
              <UserRound className="h-12 w-12 text-slate-400" aria-hidden />
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold leading-tight text-white drop-shadow-md sm:text-2xl">
            {candidate.name}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
            <Briefcase className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            {candidate.department}
          </span>
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
            <GraduationCap className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            {candidate.year}
          </span>
        </div>

        <p className="mb-4 text-base leading-relaxed text-slate-700 line-clamp-3">{candidate.bio}</p>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mb-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-900 transition-colors hover:bg-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
          aria-expanded={expanded}
        >
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
          {expanded ? 'Hide manifesto' : 'Read full manifesto'}
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </button>

        {expanded && (
          <div className="mb-5 rounded-xl border border-cyan-100 bg-cyan-50/80 p-4 text-base leading-relaxed text-slate-800 animate-fade-in">
            {candidate.manifesto}
          </div>
        )}

        <div className="mt-auto">
          {hasVoted ? (
            isVotedFor ? (
              <div
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 text-base font-bold text-emerald-800"
                role="status"
              >
                <CheckCircle2 className="h-5 w-5" aria-hidden />
                Vote recorded
              </div>
            ) : (
              <div className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-base font-medium text-slate-500">
                You already voted for this position
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={() => onVote(candidate)}
              className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-slate-950 px-6 text-base font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 active:scale-[0.98] active:bg-cyan-800"
            >
              <Vote className="h-5 w-5" aria-hidden />
              Cast vote
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export const CandidateCard = memo(CandidateCardComponent);
