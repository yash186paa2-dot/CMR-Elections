'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { supabase, type Candidate, type Vote } from '@/lib/supabase';
import { CandidateCard } from '@/components/candidate-card';
import { VoteConfirmModal } from '@/components/vote-confirm-modal';
import { VoteSuccessModal } from '@/components/vote-success-modal';
import { ErrorModal } from '@/components/error-modal';
import {
  LogOut,
  Vote as VoteIcon,
  BarChart2,
  CheckCircle2,
  Shield,
  Info,
  ListChecks,
} from 'lucide-react';

const POSITION_SORT_ORDER = [
  'president',
  'vice president',
  'secretary',
  'treasurer',
  'principle',
  'principal',
];

function sortPositionEntries(entries: [string, Candidate[]][]): [string, Candidate[]][] {
  return [...entries].sort(([a], [b]) => {
    const aKey = a.toLowerCase();
    const bKey = b.toLowerCase();
    const aIndex = POSITION_SORT_ORDER.indexOf(aKey);
    const bIndex = POSITION_SORT_ORDER.indexOf(bKey);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
}

const POSITION_ACCENT: Record<string, string> = {
  president: 'from-blue-600 to-blue-800',
  'vice president': 'from-cyan-600 to-cyan-800',
  secretary: 'from-violet-600 to-violet-800',
  treasurer: 'from-amber-600 to-amber-800',
};

function getPositionAccent(position: string): string {
  return POSITION_ACCENT[position.toLowerCase()] ?? 'from-slate-700 to-slate-900';
}

export default function HomePage() {
  const { user, loading, signOut, isAdmin, isGuest } = useAuth();
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [successCandidate, setSuccessCandidate] = useState<Candidate | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      router.replace('/login');
    }
  }, [user, isGuest, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      const isCollegeEmail = user.email?.endsWith('@cmr.ac.in');
      const isRollStudent = user.user_metadata?.login_type === 'roll_student';
      if (!isCollegeEmail && !isRollStudent) {
        signOut().then(() => router.replace('/login?error=invalid_domain'));
      }
    }
  }, [user, loading, signOut, router]);

  const fetchData = useCallback(async () => {
    if (!user && !isGuest) return;
    setDataLoading(true);
    try {
      const [candidatesRes, votesRes] = await Promise.all([
        supabase
          .from('candidates')
          .select('id,name,position,department,year,bio,photo_url,manifesto,vote_count,created_at')
          .order('position')
          .order('name'),
        user
          ? supabase
              .from('votes')
              .select('id,voter_id,voter_email,candidate_id,position,created_at')
              .eq('voter_id', user.id)
          : Promise.resolve({ data: [] as Vote[], error: null }),
      ]);

      if (candidatesRes.error) throw candidatesRes.error;
      if (votesRes.error) throw votesRes.error;

      setCandidates(candidatesRes.data ?? []);
      setMyVotes(votesRes.data ?? []);
    } catch (err) {
      console.error('Data loading error:', err);
      setErrorModal({
        title: 'Unable to Load Ballot',
        message: 'We could not load the ballot right now. Please refresh once your connection is stable.',
      });
    } finally {
      setDataLoading(false);
    }
  }, [user, isGuest]);

  useEffect(() => {
    if (user || isGuest) fetchData();
  }, [user, isGuest, fetchData]);

  const positions = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.position))),
    [candidates]
  );

  const grouped = useMemo(
    () =>
      candidates.reduce<Record<string, Candidate[]>>((acc, c) => {
        if (!acc[c.position]) acc[c.position] = [];
        acc[c.position].push(c);
        return acc;
      }, {}),
    [candidates]
  );

  const sortedBallot = useMemo(
    () => sortPositionEntries(Object.entries(grouped)),
    [grouped]
  );

  const handleVoteConfirm = async () => {
    if (!confirmCandidate) return;

    if (isGuest) {
      setErrorModal({
        title: 'Login Required',
        message:
          "You're viewing as a guest. Please login with your @cmr.ac.in email to cast your vote and save it.",
      });
      setConfirmCandidate(null);
      return;
    }

    if (!user) return;

    if (myVotes.some((vote) => vote.position === confirmCandidate.position)) {
      setConfirmCandidate(null);
      setErrorModal({
        title: 'Already Voted for This Position',
        message: 'You have already cast your vote for this position. Your vote will remain as cast.',
      });
      return;
    }

    setVotingLoading(true);
    try {
      const { data, error } = await supabase
        .from('votes')
        .insert({
          voter_id: user.id,
          voter_email: user.email,
          candidate_id: confirmCandidate.id,
          position: confirmCandidate.position,
        })
        .select('id,voter_id,voter_email,candidate_id,position,created_at')
        .single();

      if (error) {
        if (error.code === '23505') {
          setErrorModal({
            title: 'Already Voted for This Position',
            message:
              'You have already cast your vote for this position. Remember, you can only vote once per position. Your vote will remain as cast.',
          });
        } else {
          console.error('Vote error:', error);
          setErrorModal({
            title: 'Voting Error',
            message:
              'There was an error submitting your vote. Please check your internet connection and try again.',
          });
        }
      } else {
        setConfirmCandidate(null);
        setSuccessCandidate(confirmCandidate);
        const recordedVote =
          data ??
          ({
            id: `${confirmCandidate.position}-${confirmCandidate.id}`,
            voter_id: user.id,
            voter_email: user.email ?? '',
            candidate_id: confirmCandidate.id,
            position: confirmCandidate.position,
            created_at: new Date().toISOString(),
          } satisfies Vote);

        setMyVotes((current) => [...current, recordedVote]);
        setCandidates((current) =>
          current.map((candidate) =>
            candidate.id === confirmCandidate.id
              ? { ...candidate, vote_count: candidate.vote_count + 1 }
              : candidate
          )
        );
      }
    } catch (err) {
      console.error('Vote submission error:', err);
      setErrorModal({
        title: 'Error',
        message: 'An unexpected error occurred. Please try again later.',
      });
    } finally {
      setVotingLoading(false);
    }
  };

  const totalPositions = positions.length;
  const votedPositions = myVotes.length;
  const completionPercent =
    totalPositions > 0 ? Math.round((votedPositions / totalPositions) * 100) : 0;

  const currentStep = useMemo(() => {
    if (totalPositions === 0) return 0;
    const firstUnvotedIndex = sortedBallot.findIndex(
      ([position]) => !myVotes.some((v) => v.position === position)
    );
    if (firstUnvotedIndex === -1) return totalPositions;
    return firstUnvotedIndex + 1;
  }, [sortedBallot, myVotes, totalPositions]);

  const allPositionsComplete = totalPositions > 0 && votedPositions >= totalPositions;

  if ((loading && !isGuest) || (!user && !isGuest && !loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-700" />
          <p className="text-base font-medium text-slate-600">Loading your ballot…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] max-w-3xl items-center justify-between gap-3 px-4 sm:max-w-7xl sm:px-6 sm:h-16">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo.png"
              alt="CMR National PU College"
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-xl object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900 sm:text-lg">CMR Elections</p>
              <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
                Student Council 2026
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => router.push('/admin')}
                aria-label="Open admin dashboard"
                className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-w-0 sm:px-4"
              >
                <BarChart2 className="h-5 w-5" aria-hidden />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            {isGuest ? (
              <button
                type="button"
                onClick={() => router.push('/login')}
                aria-label="Log in to vote"
                className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <LogOut className="h-4 w-4 rotate-180" aria-hidden />
                <span>Log in</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signOut}
                aria-label="Sign out"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 sm:min-w-0 sm:gap-2 sm:px-4"
              >
                <LogOut className="h-5 w-5" aria-hidden />
                <span className="hidden text-sm font-semibold sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:max-w-7xl sm:px-6 sm:pt-8">
        {/* Progress & instructions */}
        <section
          className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5"
          aria-label="Voting progress"
        >
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-6 sm:px-8 sm:py-7">
            <div className="mb-1 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Official ballot · CMR National PU College
              </span>
            </div>
            <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
              Student Council Elections
            </h1>
            {!isGuest && totalPositions > 0 && (
              <p className="mt-3 text-lg font-semibold text-cyan-100 sm:text-xl">
                {allPositionsComplete ? (
                  <>All {totalPositions} positions completed</>
                ) : (
                  <>
                    Step {currentStep} of {totalPositions} positions
                  </>
                )}
              </p>
            )}
            <p className="mt-2 text-base leading-relaxed text-slate-300">
              Select one candidate for each position
            </p>

            {!isGuest && totalPositions > 0 && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-300">
                  <span>Your progress</span>
                  <span className="text-white">
                    {votedPositions} of {totalPositions} voted
                  </span>
                </div>
                <div
                  className="h-3 overflow-hidden rounded-full bg-white/15"
                  role="progressbar"
                  aria-valuenow={completionPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Ballot completion"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-700"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-0 sm:grid-cols-2">
            <div className="flex gap-4 border-b border-slate-100 p-5 sm:border-b-0 sm:border-r sm:p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                <Info className="h-6 w-6 text-blue-700" aria-hidden />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Before you vote</p>
                <p className="mt-1 text-base leading-relaxed text-slate-700">
                  Read each candidate&apos;s details and manifesto carefully before casting your
                  vote.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-5 sm:p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50">
                <ListChecks className="h-6 w-6 text-amber-700" aria-hidden />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">One vote per position</p>
                <p className="mt-1 text-base leading-relaxed text-slate-700">
                  You can vote only once per position. Your choice cannot be changed after you
                  confirm.
                </p>
              </div>
            </div>
          </div>
        </section>

        {dataLoading ? (
          <div className="space-y-12">
            {[...Array(2)].map((_, sectionIndex) => (
              <div
                key={sectionIndex}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-8 h-10 w-48 animate-pulse rounded-xl bg-slate-100" />
                <div className="grid grid-cols-1 gap-8">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-2xl border border-slate-100 animate-pulse"
                    >
                      <div className="aspect-[3/4] bg-slate-100" />
                      <div className="space-y-3 p-5">
                        <div className="h-6 w-3/4 rounded-lg bg-slate-100" />
                        <div className="h-14 rounded-2xl bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <VoteIcon className="h-8 w-8 text-slate-500" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-slate-950">Ballot is not ready yet</h2>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-600">
              No candidates are available right now. Please check back later or contact the election
              committee.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {sortedBallot.map(([position, positionCandidates], sectionIndex) => {
              const positionVote = myVotes.find((v) => v.position === position);
              const isComplete = !!positionVote;
              const accent = getPositionAccent(position);

              return (
                <section
                  key={position}
                  id={`position-${sectionIndex}`}
                  aria-labelledby={`heading-${sectionIndex}`}
                 className="mb-40 scroll-mt-24 last:mb-16 sm:mb-48"
                >
                  <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] mb-24">
                    <header className={`bg-gradient-to-r ${accent} px-5 py-8 sm:px-8 sm:py-10`}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                            Position {sectionIndex + 1} of {sortedBallot.length}
                          </p>
                          <h2
                            id={`heading-${sectionIndex}`}
                            className="mt-2 text-2xl font-black uppercase tracking-wide text-white sm:text-4xl"
                          >
                            {position}
                          </h2>
                          <p className="mt-3 text-base font-medium text-white/90 sm:text-lg">
                            Select one candidate for this position.
                          </p>
                        </div>
                        {isComplete && (
                          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-white/40 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur">
                            <CheckCircle2 className="h-5 w-5" aria-hidden />
                            Vote recorded
                          </span>
                        )}
                      </div>
                    </header>

                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 sm:p-8 pb-20">
                      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3 mb-20">
                        {positionCandidates.map((candidate, index) => (
                          <CandidateCard
                            key={candidate.id}
                            candidate={candidate}
                            hasVoted={!!positionVote}
                            isVotedFor={positionVote?.candidate_id === candidate.id}
                            position={position}
                            onVote={setConfirmCandidate}
                            rank={index}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                </section>
              );
            })}
          </div>
        )}

        <footer className="mt-12 flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <Shield className="h-5 w-5 text-slate-500" aria-hidden />
          <p className="max-w-lg text-base leading-relaxed text-slate-600">
            All votes are securely recorded. Each student may vote once per position only.
          </p>
          <p className="text-sm font-semibold text-slate-500">CMR National PU College · 2026</p>
        </footer>
      </main>

      {confirmCandidate && (
        <VoteConfirmModal
          candidate={confirmCandidate}
          onConfirm={handleVoteConfirm}
          onCancel={() => !votingLoading && setConfirmCandidate(null)}
          loading={votingLoading}
        />
      )}
      {successCandidate && (
        <VoteSuccessModal
          candidate={successCandidate}
          onDismiss={() => setSuccessCandidate(null)}
        />
      )}
      {errorModal && (
        <ErrorModal
          title={errorModal.title}
          message={errorModal.message}
          onDismiss={() => setErrorModal(null)}
        />
      )}
    </div>
  );
}
