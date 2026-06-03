'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Vote, Briefcase, BookOpen, GraduationCap, ChevronDown, ChevronUp, UserRound } from 'lucide-react';
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
    <div
      className={`candidate-card relative bg-white rounded-[1.35rem] shadow-[0_16px_50px_rgba(15,23,42,0.07)] border transition-all duration-300 overflow-hidden group transform-gpu ${
        isVotedFor
          ? 'border-emerald-400 ring-4 ring-emerald-100'
          : 'border-slate-200/80 hover:border-cyan-300 hover:shadow-[0_22px_70px_rgba(8,145,178,0.16)] sm:hover:-translate-y-1'
      }`}
    >
      {isVotedFor && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-900/15">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Your Vote
          </div>
        </div>
      )}

      {/* Photo */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 via-cyan-50 to-emerald-50 overflow-hidden">
        {candidate.photo_url ? (
          <Image
            src={candidate.photo_url}
            alt={candidate.name}
            fill
            priority={rank < 2}
            loading={rank < 2 ? 'eager' : 'lazy'}
            className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.035]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/80 shadow-sm">
              <UserRound className="h-10 w-10 text-slate-400" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/5 to-transparent" />
        <div className="absolute bottom-3 left-4">
          <span className="bg-white/95 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
            {candidate.position}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-950 mb-1 leading-snug">{candidate.name}</h3>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
            <Briefcase className="w-3 h-3" />
            {candidate.department}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
            <GraduationCap className="w-3 h-3" />
            {candidate.year}
          </span>
        </div>

        <p className="text-slate-600 text-sm leading-relaxed mb-3 line-clamp-2">{candidate.bio}</p>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex min-h-9 items-center gap-1 text-cyan-700 text-xs font-semibold mb-4 hover:text-cyan-800 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          {expanded ? 'Hide Manifesto' : 'Read Manifesto'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="mb-4 p-3 bg-cyan-50 rounded-xl border border-cyan-100 text-sm text-slate-700 leading-relaxed animate-fade-in">
            {candidate.manifesto}
          </div>
        )}

        {hasVoted ? (
          isVotedFor ? (
            <div className="h-12 w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 font-semibold rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              Vote Cast
            </div>
          ) : (
            <div className="h-12 w-full flex items-center justify-center bg-slate-50 text-slate-400 font-medium rounded-2xl border border-slate-100 text-sm">
              Already Voted
            </div>
          )
        ) : (
          <button
            onClick={() => onVote(candidate)}
            className="h-12 w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-cyan-700 active:bg-cyan-800 text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-slate-950/15 hover:shadow-cyan-700/20 active:scale-[0.98]"
          >
            <Vote className="w-4 h-4" />
            Cast Vote
          </button>
        )}
      </div>
    </div>
  );
}

export const CandidateCard = memo(CandidateCardComponent);
