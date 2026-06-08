'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart2,
  CheckCircle2,
  Droplets,
  Flame,
  Lock,
  LogOut,
  Mountain,
  Shield,
  Vote as VoteIcon,
  Wind,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { CandidateCard } from '@/components/candidate-card';
import { ErrorModal } from '@/components/error-modal';
import { VoteConfirmModal } from '@/components/vote-confirm-modal';
import { VoteSuccessModal } from '@/components/vote-success-modal';
import { HOUSE_OPTIONS, HOUSE_OPTIONS_BY_VALUE, type HouseName } from '@/lib/houses';
import { fetchCandidatesWithHouseSupport } from '@/lib/candidates';
import { supabase, type Candidate, type ElectionUser, type Vote } from '@/lib/supabase';

const HOUSE_ICONS: Record<HouseName, LucideIcon> = {
  'Agni House': Flame,
  'Jal House': Droplets,
  'Bhoomi House': Mountain,
  'Vayu House': Wind,
};

function getFullName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  const fullName = user?.user_metadata?.full_name;
  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim();
  }

  const name = user?.user_metadata?.name;
  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }

  return user?.email ?? '';
}

export default function HomePage() {
  const { user, loading, signOut, isAdmin, isGuest } = useAuth();
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [electionUser, setElectionUser] = useState<ElectionUser | null>(null);
  const [guestHouse, setGuestHouse] = useState<HouseName | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [lockingHouse, setLockingHouse] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [successCandidate, setSuccessCandidate] = useState<Candidate | null>(null);
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

  const syncElectionUser = useCallback(async (): Promise<ElectionUser | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          id: user.id,
          email: user.email ?? '',
          full_name: getFullName(user),
        },
        { onConflict: 'id' }
      )
      .select('id,email,full_name,house,house_locked_at,created_at,updated_at')
      .single();

    if (error) throw error;
    return data;
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user && !isGuest) return;

    setDataLoading(true);
    try {
      const [profileRes, candidatesRes, votesRes] = await Promise.all([
        user ? syncElectionUser() : Promise.resolve(null),
        fetchCandidatesWithHouseSupport(),
        user
          ? supabase
              .from('votes')
              .select('id,voter_id,voter_email,candidate_id,position,house,created_at')
              .eq('voter_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
          : Promise.resolve({ data: [] as Vote[], error: null }),
      ]);

      if (candidatesRes.error) throw candidatesRes.error;
      if (votesRes.error) throw votesRes.error;

      setElectionUser(profileRes);
      setCandidates(candidatesRes.data ?? []);
      setMyVote(votesRes.data?.[0] ?? null);
      setSelectedCandidateId(votesRes.data?.[0]?.candidate_id ?? null);
    } catch (err) {
      console.error('Data loading error:', err);
      setErrorModal({
        title: 'Unable to Load Ballot',
        message: 'We could not load the house ballot right now. Please refresh and try again.',
      });
    } finally {
      setDataLoading(false);
    }
  }, [isGuest, syncElectionUser, user]);

  useEffect(() => {
    if (user || isGuest) {
      fetchData();
    }
  }, [fetchData, isGuest, user]);

  const selectedHouse = isGuest ? guestHouse : electionUser?.house ?? null;
  const selectedHouseTheme = selectedHouse ? HOUSE_OPTIONS_BY_VALUE[selectedHouse] : null;

  const filteredCandidates = useMemo(
    () =>
      selectedHouse
        ? candidates.filter(
            (candidate) => candidate.house === 'None' || candidate.house === selectedHouse
          )
        : [],
    [candidates, selectedHouse]
  );

  const selectedCandidate = useMemo(
    () => filteredCandidates.find((candidate) => candidate.id === selectedCandidateId) ?? null,
    [filteredCandidates, selectedCandidateId]
  );

  const votedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === myVote?.candidate_id) ?? null,
    [candidates, myVote]
  );

  const houseCounts = useMemo(
    () =>
      HOUSE_OPTIONS.reduce<Record<HouseName, number>>((acc, house) => {
        acc[house.value] = candidates.filter(
          (candidate) => candidate.house === 'None' || candidate.house === house.value
        ).length;
        return acc;
      }, {} as Record<HouseName, number>),
    [candidates]
  );

  const handleLockHouse = async (house: HouseName) => {
    if (isGuest) {
      setGuestHouse(house);
      setSelectedCandidateId(null);
      return;
    }

    if (!user) return;
    if (electionUser?.house) return;

    setLockingHouse(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert(
          {
            id: user.id,
            email: user.email ?? '',
            full_name: getFullName(user),
            house,
          },
          { onConflict: 'id' }
        )
        .select('id,email,full_name,house,house_locked_at,created_at,updated_at')
        .single();

      if (error) throw error;

      setElectionUser(data);
      setSelectedCandidateId(null);
    } catch (err) {
      console.error('House selection error:', err);
      setErrorModal({
        title: 'Unable to Lock House',
        message:
          'We could not lock your selected house right now. Please try again. Once locked, your house cannot be changed.',
      });
    } finally {
      setLockingHouse(false);
    }
  };

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

    if (!user || !selectedHouse) return;

    if (myVote) {
      setConfirmCandidate(null);
      setErrorModal({
        title: 'Vote Already Submitted',
        message: 'Your vote has already been recorded. Duplicate votes are not allowed.',
      });
      return;
    }

    if (confirmCandidate.house !== 'None' && confirmCandidate.house !== selectedHouse) {
      setConfirmCandidate(null);
      setErrorModal({
        title: 'House Mismatch',
        message: 'You can only vote for candidates visible to your locked house.',
      });
      return;
    }

    setVotingLoading(true);
    try {
      const { data, error } = await supabase
        .from('votes')
        .insert({
          voter_id: user.id,
          voter_email: user.email ?? electionUser?.email ?? '',
          candidate_id: confirmCandidate.id,
          position: confirmCandidate.position,
          house: selectedHouse,
        })
        .select('id,voter_id,voter_email,candidate_id,position,house,created_at')
        .single();

      if (error) throw error;

      const recordedVote =
        data ??
        ({
          id: `${user.id}-${confirmCandidate.id}`,
          voter_id: user.id,
          voter_email: user.email ?? electionUser?.email ?? '',
          candidate_id: confirmCandidate.id,
          position: confirmCandidate.position,
          house: selectedHouse,
          created_at: new Date().toISOString(),
        } satisfies Vote);

      setMyVote(recordedVote);
      setSuccessCandidate(confirmCandidate);
      setSelectedCandidateId(confirmCandidate.id);
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
                House-Based Voting 2026
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
                Select your house, lock it once, and vote only within that house.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Choose one of the four official college houses. After your selection is locked, the
                ballot shows only candidates from that house and accepts one final vote.
              </p>
            </div>

            <div className="border-t border-white/10 bg-white/5 px-5 py-6 sm:px-8 lg:border-l lg:border-t-0">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Voter
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {isGuest ? 'Guest Preview' : electionUser?.full_name || getFullName(user)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Locked House
                    </p>
                    <p className="mt-2 text-base font-bold text-white">
                      {selectedHouse ?? 'Not selected'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Vote Status
                    </p>
                    <p className="mt-2 text-base font-bold text-white">
                      {myVote ? 'Submitted' : 'Pending'}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  House lock, ballot filtering, and duplicate-vote protection are enforced at the
                  database layer for authenticated voters.
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
            <section className="mt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Step 1
                  </p>
                  <h2 className="text-2xl font-bold text-slate-950">Choose your house</h2>
                </div>
                {selectedHouse && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <Lock className="h-4 w-4" aria-hidden />
                    {isGuest ? 'Preview locked locally' : 'House locked'}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {HOUSE_OPTIONS.map((house) => {
                  const Icon = HOUSE_ICONS[house.value];
                  const isSelected = selectedHouse === house.value;
                  const isLockedToOtherHouse = !!selectedHouse && selectedHouse !== house.value;

                  return (
                    <button
                      key={house.value}
                      type="button"
                      onClick={() => handleLockHouse(house.value)}
                      disabled={lockingHouse || (!isGuest && !!electionUser?.house)}
                      className={`group overflow-hidden rounded-[1.5rem] border bg-white text-left shadow-sm transition-all duration-300 ${
                        isSelected
                          ? `border-transparent bg-gradient-to-br ${house.surface} ring-2 ${house.ring} shadow-lg`
                          : isLockedToOtherHouse
                            ? 'border-slate-200 opacity-60'
                            : 'border-slate-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl'
                      }`}
                    >
                      <div className={`h-2 bg-gradient-to-r ${house.accent}`} />
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${house.accent} text-white shadow-lg`}
                          >
                            <Icon className="h-7 w-7" aria-hidden />
                          </div>
                          {isSelected && (
                            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                              Selected
                            </div>
                          )}
                        </div>

                        <h3 className="mt-5 text-xl font-bold text-slate-950">{house.value}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {house.description}
                        </p>
                        <div className="mt-5 flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-500">
                            {houseCounts[house.value]} candidate{houseCounts[house.value] === 1 ? '' : 's'}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {isSelected
                              ? 'Locked'
                              : isGuest
                                ? 'Preview house'
                                : 'Lock this house'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedHouse && selectedHouseTheme && (
              <section className="mt-6 space-y-5">
                <div className={`overflow-hidden rounded-[1.5rem] border border-transparent bg-gradient-to-br ${selectedHouseTheme.surface} shadow-sm`}>
                  <div className={`h-2 bg-gradient-to-r ${selectedHouseTheme.accent}`} />
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Step 2
                      </p>
                      <h2 className="mt-1 text-2xl font-bold text-slate-950">
                        {selectedHouse} ballot
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Only candidates from your selected house are shown below, along with
                        school-wide candidates marked as None. Other house candidates remain hidden.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Available candidates
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-950">
                        {filteredCandidates.length}
                      </p>
                    </div>
                  </div>
                </div>

                {myVote && votedCandidate && (
                  <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Vote recorded
                        </p>
                        <h3 className="mt-1 text-xl font-bold text-emerald-950">
                          {votedCandidate.name} - {votedCandidate.position}
                        </h3>
                        <p className="mt-2 text-sm text-emerald-800">
                          Your house remains locked to {selectedHouse}. Duplicate or cross-house
                          voting is blocked.
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Final ballot submitted
                      </div>
                    </div>
                  </div>
                )}

                {filteredCandidates.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h3 className="text-lg font-bold text-slate-950">No candidates in this house yet</h3>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
                      The election committee has not assigned candidates to {selectedHouse} yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredCandidates.map((candidate, index) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        hasVoted={!!myVote}
                        isVotedFor={
                          myVote?.candidate_id === candidate.id || selectedCandidateId === candidate.id
                        }
                        onSelect={(nextCandidate) => {
                          if (myVote) return;
                          setSelectedCandidateId(nextCandidate.id);
                        }}
                        rank={index}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <footer className="mt-8 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-xs font-medium text-slate-600">
            Election Management System | Designed & Developed by Yeshwanth B
          </p>
        </footer>
      </main>

      {selectedHouse && !myVote && filteredCandidates.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {selectedCandidate
                  ? `Selected: ${selectedCandidate.name} · ${selectedCandidate.position}`
                  : 'Choose one candidate from your locked house'}
              </p>
              <p className="text-xs text-slate-500">
                House: {selectedHouse} · One vote only · Cannot be changed after submission
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectedCandidate && setConfirmCandidate(selectedCandidate)}
              disabled={!selectedCandidate || votingLoading}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold shadow-sm transition-all sm:min-w-[220px] ${
                selectedCandidate
                  ? 'bg-slate-950 text-white hover:bg-slate-800'
                  : 'cursor-not-allowed bg-slate-300 text-slate-500'
              }`}
            >
              <VoteIcon className="h-4 w-4" aria-hidden />
              Submit final vote
            </button>
          </div>
        </div>
      )}

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
