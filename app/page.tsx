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
import { LogOut, Vote as VoteIcon, BarChart2, User, CheckCircle2, Shield, Sparkles } from 'lucide-react';

export default function HomePage() {
  const { user, loading, signOut, isAdmin, isGuest } = useAuth();
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [successCandidate, setSuccessCandidate] = useState<Candidate | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const [activePosition, setActivePosition] = useState<string>('all');
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
    () => ['all', ...Array.from(new Set(candidates.map((c) => c.position)))],
    [candidates]
  );

  const filtered = useMemo(
    () => (activePosition === 'all' ? candidates : candidates.filter((c) => c.position === activePosition)),
    [activePosition, candidates]
  );

  const grouped = useMemo(
    () =>
      filtered.reduce<Record<string, Candidate[]>>((acc, c) => {
        if (!acc[c.position]) acc[c.position] = [];
        acc[c.position].push(c);
        return acc;
      }, {}),
    [filtered]
  );

  const handleVoteConfirm = async () => {
    if (!confirmCandidate) return;
    
    if (isGuest) {
      setErrorModal({
        title: 'Login Required',
        message: 'You\'re viewing as a guest. Please login with your @cmr.ac.in email to cast your vote and save it.',
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
          // Unique constraint violation - already voted for this position
          setErrorModal({
            title: 'Already Voted for This Position',
            message: 'You have already cast your vote for this position. Remember, you can only vote once per position. Your vote will remain as cast.',
          });
        } else {
          console.error('Vote error:', error);
          setErrorModal({
            title: 'Voting Error',
            message: 'There was an error submitting your vote. Please check your internet connection and try again.',
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

  const totalPositions = positions.length - 1;
  const votedPositions = myVotes.length;
  const completionPercent = totalPositions > 0 ? Math.round((votedPositions / totalPositions) * 100) : 0;

  if ((loading && !isGuest) || (!user && !isGuest && !loading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center shadow-md shadow-slate-950/15">
              <VoteIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm sm:text-base">CMR Elections</span>
              <span className="hidden sm:block text-xs text-slate-400 leading-none">Student Council 2026</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                aria-label="Open admin dashboard"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              {user?.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                </div>
              )}
              <span className="text-xs font-medium text-slate-700 hidden sm:inline max-w-[8rem] truncate">
                {isGuest ? 'Guest User' : user?.email?.replace('@cmr.ac.in', '')}
              </span>
            </div>
            {isGuest ? (
              <button
                onClick={() => router.push('/login')}
                aria-label="Login to vote"
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 rotate-180" />
                <span className="hidden sm:inline">Login</span>
              </button>
            ) : (
              <button
                onClick={signOut}
                aria-label="Sign out"
                className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero banner */}
        <div className="relative bg-slate-950 rounded-[1.75rem] p-5 sm:p-8 mb-6 overflow-hidden shadow-2xl shadow-slate-950/15 animate-fade-in-up">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-cyan-200 text-xs font-semibold uppercase tracking-wider">Voting is Live</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 tracking-tight">Student Council Elections</h1>
            <p className="text-slate-300 text-sm sm:text-base mb-5">Cast your votes for CMR&apos;s next student leaders</p>

            <div className="bg-white/[0.08] border border-white/10 rounded-2xl p-4 inline-flex w-full sm:w-auto items-center gap-4 backdrop-blur">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{isGuest ? '—' : `${votedPositions}/${totalPositions}`}</p>
                <p className="text-slate-300 text-xs">{isGuest ? 'Guest Preview' : 'Positions Voted'}</p>
              </div>
              {!isGuest && (
                <>
                  <div className="h-10 w-px bg-white/20" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all duration-700 ease-out"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {positions.slice(1).map((pos) => {
                        const voted = myVotes.some((v) => v.position === pos);
                        return (
                          <div key={pos} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className={`w-3.5 h-3.5 ${voted ? 'text-emerald-400' : 'text-white/30'}`} />
                            <span className={voted ? 'text-white' : 'text-slate-400'}>{pos}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm animate-fade-in-up animation-delay-100">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-cyan-600" />
          <span className="min-w-0">Fast mobile ballot, secure single-vote positions, and live progress on this device.</span>
        </div>

        {/* Position filter tabs */}
        <div className="sticky top-16 z-30 -mx-4 mb-8 overflow-x-auto border-b border-slate-200/80 bg-[#f6f8fb]/95 px-4 py-3 backdrop-blur scrollbar-hide sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex gap-3 overflow-x-auto whitespace-nowrap pb-2">
          {positions.map((position) => (
            <button
              key={position}
              className="whitespace-nowrap"
            >
              {position}
            </button>
          ))}
        </div>
        </div>

        {dataLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
                <div className="h-52 bg-slate-100" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-slate-100 rounded-lg w-3/4" />
                  <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                  <div className="h-10 bg-slate-100 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm animate-fade-in-up">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <VoteIcon className="h-7 w-7 text-slate-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-950">Ballot is not ready yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              No candidates are available to preview. Ask an admin to add candidates, or apply the latest Supabase migration if candidates already exist.
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([position, positionCandidates]) => {
            const positionVote = myVotes.find((v) => v.position === position);
            return (
              <section key={position} className="mb-6 md:mb-10 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-1 h-8 bg-cyan-600 rounded-full" />
                  <h2 className="text-xl font-bold text-slate-900">{position}</h2>
                  {positionVote && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Voted
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              </section>
            );
          })
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <Shield className="w-3.5 h-3.5" />
          <span>All votes are securely recorded. Each student can vote once per position.</span>
        </div>
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
