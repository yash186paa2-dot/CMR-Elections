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
  const [expanded, setExpanded] = useState(false);
  const isSubmittedChoice = hasVoted && isVotedFor;
  const isActiveSelection = !hasVoted && isVotedFor;

  return (
    <article
      className={`candidate-card relative flex flex-col overflow-hidden rounded-[2.5rem] border transition-all duration-500 ease-out ${
        isSubmittedChoice
          ? 'border-emerald-500 bg-emerald-50 shadow-lg ring-2 ring-emerald-500/20'
          : isActiveSelection
            ? 'scale-[1.02] border-emerald-500 bg-[#e6f9f0] shadow-[0_20px_50px_-12px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/30'
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
      {/* 90% Photo Fill Section */}
      <div className="relative aspect-[3/4.5] w-full overflow-hidden">
        {candidate.photo_url && candidate.photo_url.length > 0 ? (
          <Image
            src={candidate.photo_url}
            alt={candidate.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover object-top"
            priority={rank < 4}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <UserRound className="h-20 w-20 text-slate-300" />
          </div>
        )}

        {/* Selection Status Overlay */}
        <div className="absolute top-4 right-4 z-10">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500 ${
              isVotedFor
                ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_16px_-4px_rgba(16,185,129,0.4)]'
                : 'border-white/40 bg-black/20 text-white backdrop-blur-md'
            }`}
          >
            {isVotedFor && (
              <CheckCircle2 className="h-7 w-7 animate-in zoom-in duration-300" aria-hidden />
            )}
          </div>
        </div>

        {/* Bottom Info Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 pt-16">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
            {candidate.position}
          </p>
          <h3 className="mt-1 text-xl font-black leading-tight tracking-tight text-white sm:text-2xl">
            {candidate.name}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {candidate.house && candidate.house !== 'None' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                <MapPin className="h-2.5 w-2.5" />
                {candidate.house}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700">
            <Briefcase className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
            {candidate.department}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700">
            <GraduationCap className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
            {candidate.year}
          </span>
        </div>

        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-700">
          {candidate.bio}
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
        >
          <BookOpen className="h-4 w-4" />
          {expanded ? 'Hide Manifesto' : 'Read Manifesto'}
        </button>

        {expanded && (
          <div className="animate-fade-in mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            {candidate.manifesto}
          </div>
        )}
      </div>
    </article>
  );
}

export const CandidateCard = memo(CandidateCardComponent);
