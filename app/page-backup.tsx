'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BarChart2, CheckCircle2, LogOut, Shield, Vote as VoteIcon } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { CandidateCard } from '@/components/candidate-card';
import { ErrorModal } from '@/components/error-modal';
import { VoteConfirmModal } from '@/components/vote-confirm-modal';
import { VoteSuccessModal } from '@/components/vote-success-modal';
import { fetchCandidates } from '@/lib/candidates';
import { supabase, type Candidate, type Vote } from '@/lib/supabase';

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type PositionGroup = {
  position: string;
  candidates: Candidate[];
};

function getDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  const name = user?.user_metadata?.name;
  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }

  const email = user?.email?.trim();
  if (email) {
    return email.split('@')[0];
  }

  return 'Authenticated voter';
}

function isSupabaseErrorLike(error: unknown): error is SupabaseErrorLike {
  return typeof error === 'object' && error !== null && 'message' in error;
}

function formatSupabaseError(error: unknown) {
  if (!isSupabaseErrorLike(error)) {
    return {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: null,
      hint: null,
    };
  }

  return {
    code: error.code ?? 'UNKNOWN',
    message: error.message ?? 'Unknown Supabase error',
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function buildBallotErrorMessage(source: string, error: unknown) {
  const formatted = formatSupabaseError(error);
  const parts = [`${source} failed: [${formatted.code}] ${formatted.message}`];

  if (formatted.details) {
    parts.push(`Details: ${formatted.details}`);
  }

  if (formatted.hint) {
    parts.push(`Hint: ${formatted.hint}`);
  }

  return parts.join(' ');
}

function groupCandidatesByPosition(candidates: Candidate[]) {
  const grouped = new Map<string, Candidate[]>();

  for (const candidate of candidates) {
    const position = candidate.position.trim() || 'Unassigned Position';
    const current = grouped.get(position) ?? [];
    current.push(candidate);
    grouped.set(position, current);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([position, positionCandidates]) => ({
      position,
      candidates: [...positionCandidates].sort((a, b) => a.name.localeCompare(b.name)),
    })) satisfies PositionGroup[];
}

export default function HomePage() {
  const { user, loading, signOut, isAdmin, isGuest } = useAuth();
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState(false);
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [successCandidate, setSuccessCandidate] = useState<Candidate | null>(null);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [openPosition, setOpenPosition] = useState<string | null>(null);
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
        fetchCandidates(),
        user
          ? supabase
              .from('votes')
              .select('id,voter_id,voter_email,candidate_id,position,created_at')
              .eq('voter_id', user.id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as Vote[], error: null }),
      ]);

      if (candidatesRes.error) {
        throw new Error(buildBallotErrorMessage('Candidate query', candidatesRes.error));
      }

      if (votesRes.error) {
        throw new Error(buildBallotErrorMessage('Vote history query', votesRes.error));
      }

      setCandidates(candidatesRes.data ?? []);
      setVotes(votesRes.data ?? []);
    } catch (err) {
      console.error('Data loading error:', err);
      setErrorModal({
        title: 'Ballot Load Error',
        message: err instanceof Error ? err.message : buildBallotErrorMessage('Ballot loader', err),
      });
    } finally {
      setDataLoading(false);
    }
  }, [isGuest, user]);

  useEffect(() => {
    if (user || isGuest) {
      void fetchData();
    }
  }, [fetchData, isGuest, user]);

  const candidateGroups = useMemo(() => groupCandidatesByPosition(candidates), [candidates]);
  useEffect(() => {
  if (candidateGroups.length > 0 && !openPosition) {
    setOpenPosition(candidateGroups[0].position);
  }
}, [candidateGroups, openPosition]);
  const votesByPosition = useMemo(() => new Map(votes.map((vote) => [vote.position, vote])), [votes]);
  const votedCandidateIds = useMemo(() => new Set(votes.map((vote) => vote.candidate_id)), [votes]);
  const votedCandidates = useMemo(
    () =>
      votes
        .map((vote) => candidates.find((candidate) => candidate.id === vote.candidate_id) ?? null)
        .filter((candidate): candidate is Candidate => candidate !== null),
    [candidates, votes]
  );

  const handleVoteConfirm = async () => {
    if (!confirmCandidate) return;

    if (isGuest) {
      setConfirmCandidate(null);
      setErrorModal({
        title: 'Login Required',
        message:
          "You're currently previewing the election. Please log in with your student credentials to cast an official vote.",
      });
      return;
    }

    if (!user) return;

    if (votesByPosition.has(confirmCandidate.position)) {
      setConfirmCandidate(null);
      setErrorModal({
        title: 'Position Already Submitted',
        message: `Your vote for ${confirmCandidate.position} has already been recorded.`,
      });
      return;
    }

    setVotingLoading(true);
    try {
      const { data, error } = await supabase
        .from('votes')
        .insert({
          voter_id: user.id,
          voter_email: user.email ?? '',
          candidate_id: confirmCandidate.id,
          position: confirmCandidate.position,
        })
        .select('id,voter_id,voter_email,candidate_id,position,created_at')
        .single();

      if (error) throw error;

      const recordedVote =
        data ??
        ({
          id: `${user.id}-${confirmCandidate.id}`,
          voter_id: user.id,
          voter_email: user.email ?? '',
          candidate_id: confirmCandidate.id,
          position: confirmCandidate.position,
          created_at: new Date().toISOString(),
        } satisfies Vote);

      setVotes((current) => [...current, recordedVote].sort((a, b) => a.position.localeCompare(b.position)));
      setSuccessCandidate(confirmCandidate);
      setSelectedCandidateIds((current) => {
        const next = { ...current };
        delete next[confirmCandidate.position];
        return next;
      });
      setCandidates((current) =>
        current.map((candidate) =>
          candidate.id === confirmCandidate.id
            ? { ...candidate, vote_count: candidate.vote_count + 1 }
            : candidate
        )
      );
      setConfirmCandidate(null);
    } catch (err) {
      console.error('Vote submission error:', err);
      setErrorModal({
        title: 'Voting Error',
        message:
          'Your vote could not be submitted. If you already voted, the system will keep your original ballot safe.',
      });
    } finally {
      setVotingLoading(false);
    }
  };

  if ((loading && !isGuest) || (!user && !isGuest && !loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-700" />
          <p className="text-base font-medium text-slate-600">Loading your ballot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo.png"
              alt="CMR National PU College"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-xl object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 sm:text-base">CMR Elections</p>
              <p className="truncate text-[10px] font-medium text-slate-500 sm:text-xs">
                Official Student Ballot 2026
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <BarChart2 className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            {isGuest ? (
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800"
              >
                <LogOut className="h-4 w-4 rotate-180" aria-hidden />
                <span>Log in</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-4 sm:px-6 sm:pb-16 sm:pt-6">
        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-xl shadow-slate-900/10">
          <div className="grid gap-0 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Official Election Ballot
              </div>
              <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                Review candidates and cast one secure vote for each position.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                The ballot reads directly from the live Supabase tables for candidates and votes.
                Each authenticated voter can submit one vote per position.
              </p>
            </div>

            <div className="border-t border-white/10 bg-white/5 px-5 py-6 sm:px-8 lg:border-l lg:border-t-0">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Voter
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {isGuest ? 'Guest Preview' : getDisplayName(user)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Positions
                    </p>
                    <p className="mt-2 text-base font-bold text-white">{candidateGroups.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Vote Status
                    </p>
                    <p className="mt-2 text-base font-bold text-white">{votes.length} submitted</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  Duplicate voting is enforced at the database layer using the live `votes` table.
                </div>
              </div>
            </div>
          </div>
        </section>

        {dataLoading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-48 rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                <div className="p-6">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100" />
                  <div className="mt-4 h-5 w-32 rounded bg-slate-100" />
                  <div className="mt-3 h-4 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <VoteIcon className="h-6 w-6 text-slate-500" aria-hidden />
            </div>
            <h2 className="text-lg font-bold text-slate-950">Ballot is not ready yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              No candidates are available at the moment. Please check back later or contact the
              election committee.
            </p>
          </div>
        ) : (
          <>
            {votes.length > 0 && votedCandidates.length > 0 && (
              <section className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      Votes recorded
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-emerald-950">
                      {votes.length} position{votes.length === 1 ? '' : 's'} submitted
                    </h3>
                    <p className="mt-2 text-sm text-emerald-800">
                      You can continue voting in any remaining positions that have not been submitted.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    {votes.length} submitted
                  </div>
                </div>
              </section>
            )}

            <section className="mt-6 space-y-5">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                <div className="h-2 bg-gradient-to-r from-slate-500 via-slate-600 to-slate-800" />
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Election Ballot
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-950">All open positions</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Candidates are grouped by position using the live `candidates` table.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Positions
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{candidateGroups.length}</p>
                  </div>
                </div>
              </div>

              {candidateGroups.map((group) => {
                const selectedCandidateId = selectedCandidateIds[group.position];
                const selectedCandidate =
                  group.candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;
                const votedForPosition = votesByPosition.get(group.position);

                return (
                  <section
                    key={group.position}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div
                      onClick={() =>
                        setOpenPosition(
                          openPosition === group.position ? null : group.position
                        )
                      }
                      className="mb-4 flex cursor-pointer flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Position
                        </p>
                        <h3 className="text-xl font-bold text-slate-950">
                        {openPosition === group.position ? "▼" : "▶"} {group.position}
                        ({group.candidates.length} Candidates)
                      </h3>
                      </div>
                      <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                        {votedForPosition ? 'Vote submitted' : 'Select one candidate'}
                      </div>
                    </div>
{openPosition === group.position && (
  <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {group.candidates.map((candidate, index) => (
                        <CandidateCard
                          key={candidate.id}
                          candidate={candidate}
                          hasVoted={votesByPosition.has(candidate.position)}
                          isVotedFor={
                            votedCandidateIds.has(candidate.id) ||
                            selectedCandidateIds[candidate.position] === candidate.id
                          }
                          onSelect={(nextCandidate) => {
                            if (votesByPosition.has(nextCandidate.position)) return;
                            setSelectedCandidateIds((current) => ({
                              ...current,
                              [nextCandidate.position]: nextCandidate.id,
                            }));
                          }}
                          rank={index}
                        />
                      ))}
                    </div>
                      </>
                    )}

                    {openPosition === group.position && !votedForPosition && (
                      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-slate-700">
                          {selectedCandidate
                            ? `Selected: ${selectedCandidate.name}`
                            : `Choose a candidate for ${group.position}`}
                        </p>
                        <button
                          type="button"
                          onClick={() => selectedCandidate && setConfirmCandidate(selectedCandidate)}
                          disabled={!selectedCandidate || votingLoading}
                          className={`flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-bold ${
                            selectedCandidate
                              ? 'bg-slate-950 text-white hover:bg-slate-800'
                              : 'cursor-not-allowed bg-slate-300 text-slate-500'
                          }`}
                        >
                          Submit {group.position} vote
                        </button>
                      </div>
                    )}
                  </section>
                );
              })}
            </section>
          </>
        )}

        <footer className="mt-8 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-xs font-medium text-slate-600">
            Election Management System | Designed & Developed by Yeshwanth B
          </p>
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
        <VoteSuccessModal candidate={successCandidate} onDismiss={() => setSuccessCandidate(null)} />
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
