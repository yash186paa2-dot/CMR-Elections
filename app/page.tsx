'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { supabase, type Candidate, type Vote } from '@/lib/supabase';
import { CandidateCard } from '@/components/candidate-card';
import { VoteConfirmModal } from '@/components/vote-confirm-modal';
import { VoteReviewModal } from '@/components/vote-review-modal';
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
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, Candidate>>({});
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // Timer state
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerStatus, setTimerStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [timeRemaining, setTimeRemaining] = useState(0);

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

  // Fetch timer settings
  useEffect(() => {
    const fetchTimerSettings = async () => {
      try {
        const [enabledData, durationData, statusData, startTimeData] = await Promise.all([
          supabase.from('election_settings').select('value').eq('key', 'timer_enabled').single(),
          supabase.from('election_settings').select('value').eq('key', 'timer_duration').single(),
          supabase.from('election_settings').select('value').eq('key', 'timer_status').single(),
          supabase.from('election_settings').select('value').eq('key', 'timer_start_time').single(),
        ]);

        if (enabledData.data?.value) setTimerEnabled(enabledData.data.value === 'true');
        if (durationData.data?.value) setTimerDuration(Number(durationData.data.value));
        if (statusData.data?.value) setTimerStatus(statusData.data.value);
        
        if (startTimeData.data?.value && statusData.data?.value === 'running') {
          const startTime = new Date(startTimeData.data.value).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          const remaining = Math.max(0, timerDuration - elapsed);
          setTimeRemaining(remaining);
        }
      } catch (err) {
        console.error('Error fetching timer settings:', err);
      }
    };

    fetchTimerSettings();
    const interval = setInterval(fetchTimerSettings, 1000); // Poll every second
    return () => clearInterval(interval);
  }, [timerDuration]);

  // Countdown timer logic
  useEffect(() => {
    if (!timerEnabled || timerStatus !== 'running') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          // Auto-submit when timer reaches zero
          if (Object.keys(selectedCandidates).length > 0) {
            handleReviewConfirm();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerEnabled, timerStatus, selectedCandidates]);

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

  const handleReviewConfirm = async () => {
    if (!user) return;
    
    setVotingLoading(true);
    try {
      // Submit all selected candidates that haven't been voted for yet
      const votesToSubmit = Object.entries(selectedCandidates).filter(
        ([position]) => !myVotes.some(v => v.position === position)
      );

      for (const [position, candidate] of votesToSubmit) {
        const { error } = await supabase
          .from('votes')
          .insert({
            voter_id: user.id,
            voter_email: user.email,
            candidate_id: candidate.id,
            position: position,
          });

        if (error) {
          throw error;
        }

        // Update local state
        setMyVotes((current) => [
          ...current,
          {
            id: `${position}-${candidate.id}`,
            voter_id: user.id,
            voter_email: user.email ?? '',
            candidate_id: candidate.id,
            position: position,
            created_at: new Date().toISOString(),
          } satisfies Vote
        ]);

        setCandidates((current) =>
          current.map((c) =>
            c.id === candidate.id
              ? { ...c, vote_count: c.vote_count + 1 }
              : c
          )
        );
      }

      setShowReviewModal(false);
      setSelectedCandidates({});
      setSuccessCandidate(null); // We'll show a general success message instead
    } catch (err) {
      console.error('Vote submission error:', err);
      setErrorModal({
        title: 'Voting Error',
        message: 'There was an error submitting your votes. Please check your internet connection and try again.',
      });
    } finally {
      setVotingLoading(false);
    }
  };

  const handleEditSelection = (position: string) => {
    setShowReviewModal(false);
    setSelectedPosition(position);
  };

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
        setSelectedCandidates((prev) => {
          const newSelected = { ...prev };
          delete newSelected[confirmCandidate.position];
          return newSelected;
        });
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
  const votedPositions = Math.min(myVotes.length, totalPositions);
  const completionPercent =
    totalPositions > 0 ? Math.round((votedPositions / totalPositions) * 100) : 0;

  const selectedPositionData = selectedPosition
    ? grouped[selectedPosition]
    : null;

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
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:max-w-7xl sm:px-6 sm:h-16">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo.png"
              alt="CMR National PU College"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-lg object-contain sm:h-10 sm:w-10"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 sm:text-base">CMR Elections</p>
              <p className="truncate text-[10px] font-medium text-slate-500 sm:text-xs">
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
                className="flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:min-h-10 sm:min-w-0 sm:px-3 sm:text-sm"
              >
                <BarChart2 className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            {isGuest ? (
              <button
                type="button"
                onClick={() => router.push('/login')}
                aria-label="Log in to vote"
                className="flex min-h-9 items-center gap-2 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800 sm:min-h-10 sm:px-4 sm:text-sm"
              >
                <LogOut className="h-3.5 w-3.5 rotate-180" aria-hidden />
                <span>Log in</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signOut}
                aria-label="Sign out"
                className="flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 sm:min-h-10 sm:min-w-0 sm:gap-2 sm:px-4"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden text-xs font-semibold sm:inline sm:text-sm">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:max-w-7xl sm:px-6 sm:pt-6 sm:pb-12">
        {/* Progress tracker */}
        <section
          className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          aria-label="Voting progress"
        >
          <div className="bg-slate-900 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-white sm:text-lg">Election Management System</h1>
                <p className="mt-0.5 text-xs text-slate-300">CMR National PU College · Student Council 2026</p>
              </div>
              {!isGuest && totalPositions > 0 && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">
                    {votedPositions}/{totalPositions} Voted
                  </p>
                  <div
                    className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/20"
                    role="progressbar"
                    aria-valuenow={completionPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {dataLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="h-5 w-40 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <VoteIcon className="h-5 w-5 text-slate-500" aria-hidden />
            </div>
            <h2 className="text-base font-bold text-slate-950">Ballot is not ready yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              No candidates are available right now. Please check back later or contact the election committee.
            </p>
          </div>
        ) : selectedPosition ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedPosition(null)}
              className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 active:text-slate-900 min-h-[44px]"
            >
              ← Back to Positions
            </button>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="text-lg font-bold text-slate-900">{selectedPosition}</h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  Select one candidate
                </p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {selectedPositionData?.map((candidate, index) => {
                    const positionVote = myVotes.find((v) => v.position === selectedPosition);
                    return (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        hasVoted={!!positionVote}
                        isVotedFor={positionVote?.candidate_id === candidate.id || selectedCandidates[selectedPosition]?.id === candidate.id}
                        position={selectedPosition}
                        onSelect={(c) => setSelectedCandidates(prev => ({ ...prev, [selectedPosition]: c }))}
                        rank={index}
                      />
                    );
                  })}
                </div>
                
                {(() => {
                  const positionVote = myVotes.find((v) => v.position === selectedPosition);
                  return !positionVote && selectedCandidates[selectedPosition] && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setConfirmCandidate(selectedCandidates[selectedPosition])}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 text-sm font-bold text-white shadow-sm hover:bg-slate-800 active:bg-slate-700 sm:min-h-10 sm:px-5"
                      >
                        Submit Vote
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {sortedBallot.map(([position, positionCandidates], sectionIndex) => {
              const positionVote = myVotes.find((v) => v.position === position);
              const isComplete = !!positionVote;
              
              return (
                <button
                  key={position}
                  type="button"
                  onClick={() => setSelectedPosition(position)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-left hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 min-h-[72px] sm:min-h-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5" aria-hidden />
                        ) : (
                          <span className="text-sm font-semibold">{sectionIndex + 1}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{position}</h3>
                        <p className="text-xs text-slate-600">
                          {positionCandidates.length} Candidate{positionCandidates.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isComplete && (
                        <span className="text-xs font-semibold text-emerald-700">Voted</span>
                      )}
                      <span className="text-slate-400">→</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <footer className="mt-8 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-xs font-medium text-slate-600">
            Election Management System | Designed & Developed by Yeshwanth B
          </p>
        </footer>
      </main>

      {/* Sticky bottom action bar for mobile and desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-lg">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">
                Positions Completed: {votedPositions} / {totalPositions}
              </p>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const allSelected = positions.every(pos => selectedCandidates[pos] || myVotes.some(v => v.position === pos));
                if (allSelected && votedPositions < totalPositions) {
                  setShowReviewModal(true);
                }
              }}
              disabled={votedPositions < totalPositions}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-8 text-base font-bold shadow-sm transition-all sm:min-h-14 sm:px-10 sm:text-lg ${
                votedPositions >= totalPositions
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              Submit Final Vote
            </button>
          </div>
        </div>
      </div>

      {showReviewModal && (
        <VoteReviewModal
          selections={selectedCandidates}
          onEdit={handleEditSelection}
          onConfirm={handleReviewConfirm}
          onCancel={() => setShowReviewModal(false)}
          loading={votingLoading}
        />
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
