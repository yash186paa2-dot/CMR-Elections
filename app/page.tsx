'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowRight,
  BarChart2,
  Briefcase,
  Circle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  FileText,
  GraduationCap,
  Lock,
  LogOut,
  MapPin,
  Shield,
  Sparkles,
  Wallet,
  type LucideIcon,
  Vote as VoteIcon,
  Flame,
  Droplets,
  Leaf,
  Wind,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { CandidateCard } from '@/components/candidate-card';
import { ErrorModal } from '@/components/error-modal';
import { VoteConfirmModal } from '@/components/vote-confirm-modal';
import { VoteSuccessModal } from '@/components/vote-success-modal';
import { fetchCandidates } from '@/lib/candidates';
import { supabase, type Candidate, type Vote } from '@/lib/supabase';
import { HOUSE_OPTIONS, HOUSE_OPTIONS_BY_VALUE, isCandidateHouse, type CandidateHouse } from '@/lib/houses';

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

type PositionVisual = {
  icon: LucideIcon;
  tint: string;
  surface: string;
  border: string;
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

function getPositionVisual(position: string): PositionVisual {
  const normalized = position.toLowerCase();

  // Premium Dark Navy Blue theme for all positions as requested
  if (normalized.includes('president') || normalized.includes('head')) {
    return {
      icon: Crown,
      tint: 'text-amber-400',
      surface: 'from-[#001F3F] via-[#001F3F] to-[#002B5B]',
      border: 'border-amber-400/30',
    };
  }

  if (normalized.includes('vice')) {
    return {
      icon: GraduationCap,
      tint: 'text-blue-300',
      surface: 'from-[#001F3F] via-[#001F3F] to-[#002B5B]',
      border: 'border-blue-400/30',
    };
  }

  if (normalized.includes('secretary')) {
    return {
      icon: FileText,
      tint: 'text-blue-300',
      surface: 'from-[#001F3F] via-[#001F3F] to-[#002B5B]',
      border: 'border-blue-400/30',
    };
  }

  if (normalized.includes('treasurer')) {
    return {
      icon: Wallet,
      tint: 'text-blue-300',
      surface: 'from-[#001F3F] via-[#001F3F] to-[#002B5B]',
      border: 'border-blue-400/30',
    };
  }

  return {
    icon: Briefcase,
    tint: 'text-blue-300',
    surface: 'from-[#001F3F] via-[#001F3F] to-[#002B5B]',
    border: 'border-blue-400/30',
  };
}

function getNextPendingPosition(candidateGroups: PositionGroup[], completedPositions: Set<string>) {
  return candidateGroups.find((group) => !completedPositions.has(group.position))?.position ?? null;
}

export default function HomePage() {
  const { user, loading, signOut, isAdmin, isGuest } = useAuth();
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState(false);
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [successCandidate, setSuccessCandidate] = useState<Candidate | null>(null);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [openPosition, setOpenPosition] = useState<string | null>(null);
  const [hasStartedVoting, setHasStartedVoting] = useState(false);
  const [isReviewScreenOpen, setIsReviewScreenOpen] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSelectingHouse, setIsSelectingHouse] = useState(false);
  const [houseToConfirm, setHouseToConfirm] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerStatus, setTimerStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');

  const TIMER_DEFAULTS = useMemo(
    () => ({
      timer_enabled: false,
      timer_duration: 60,
      timer_status: 'stopped' as 'stopped' | 'running' | 'paused',
      timer_start_time: null as string | null,
    }),
    []
  );

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      router.replace('/login');
    }
  }, [user, isGuest, loading, router]);

  // Timer Logic
  useEffect(() => {
    const fetchTimer = async () => {
      const settingKeys = Object.keys(TIMER_DEFAULTS);
      const { data, error } = await supabase
        .from('election_settings')
        .select('key, value')
        .in('key', settingKeys);

      if (error) {
        console.error('Error fetching timer settings:', error);
        setTimerStatus('stopped');
        setTimeLeft(null);
        return;
      }

      const settingsMap = new Map((data ?? []).map((item) => [item.key, item.value]));
      for (const key of settingKeys) {
        if (!settingsMap.has(key)) {
          settingsMap.set(key, TIMER_DEFAULTS[key as keyof typeof TIMER_DEFAULTS]);
        }
      }

      const enabledValue = settingsMap.get('timer_enabled');
      const durationValue = settingsMap.get('timer_duration');
      const statusValue = settingsMap.get('timer_status');
      const startTimeValue = settingsMap.get('timer_start_time');

      const enabled = enabledValue === true || enabledValue === 'true';
      const duration = Number(durationValue ?? TIMER_DEFAULTS.timer_duration);
      const status = (statusValue ?? TIMER_DEFAULTS.timer_status) as 'stopped' | 'running' | 'paused';
      const startTime = startTimeValue ? new Date(String(startTimeValue)).getTime() : null;

      setTimerStatus(status);

      if (enabled && status === 'running' && startTime) {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, duration - elapsed);
        setTimeLeft(remaining);
      } else if (enabled && status === 'paused') {
        // For simplicity, we just show the full duration or some fixed value when paused
        // Real pause logic would require tracking cumulative elapsed time
        setTimeLeft(duration);
      } else {
        setTimeLeft(null);
      }
    };

    fetchTimer();
    const interval = setInterval(fetchTimer, 5000); // Polling for timer status changes
    return () => clearInterval(interval);
  }, [TIMER_DEFAULTS]);

  useEffect(() => {
    if (timerStatus === 'running' && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timerStatus, timeLeft]);

  useEffect(() => {
    if (!loading && user) {
      const isCollegeEmail = user.email?.endsWith('@cmr.ac.in');
      const isRollStudent = user.user_metadata?.login_type === 'roll_student';
      if (!isCollegeEmail && !isRollStudent) {
        signOut().then(() => router.replace('/login?error=invalid_domain'));
      }
    }
  }, [user, loading, signOut, router]);

  const fetchData = useCallback(async (forcedHouse?: string) => {
    if (!user && !isGuest) return;

    setDataLoading(true);

    try {
      const [candidatesRes, votesRes, studentRes] = await Promise.all([
        fetchCandidates(),
        user
          ? supabase
              .from('votes')
              .select('id,voter_id,voter_email,candidate_id,position,created_at')
              .eq('voter_id', user.id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as Vote[], error: null }),
        user
          ? supabase
              .from('students')
              .select('*')
              .eq('auth_user_id', user.id)
          : Promise.resolve({ data: null, error: null }),
      ]);
      const studentRow = Array.isArray(studentRes?.data) ? studentRes.data[0] ?? null : studentRes?.data ?? null;

      if (candidatesRes.error) {
        throw new Error(buildBallotErrorMessage('Candidate query', candidatesRes.error));
      }

      if (votesRes.error) {
        throw new Error(buildBallotErrorMessage('Vote history query', votesRes.error));
      }

      let filteredCandidates = candidatesRes.data ?? [];
      let currentStudentHouse: string | null = forcedHouse || null;
      
      // Database is the single source of truth for authenticated users
      if (user && studentRow?.class) {
        currentStudentHouse = studentRow.class;
        // Sync localStorage
        if (currentStudentHouse) {
          const key = `selectedHouse_${user.id}`;
          localStorage.setItem(key, currentStudentHouse);
        }
      } else if (!currentStudentHouse) {
        // Fallback to localStorage only if DB is empty or user is guest
        const key = user ? `selectedHouse_${user.id}` : 'selectedHouse';
        currentStudentHouse = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      }

      // If authenticated but no house selected in DB or localStorage, show selection screen
      if (user && !currentStudentHouse) {
        setIsSelectingHouse(true);
      } else {
        setIsSelectingHouse(false);
        
        // Default for guests if no house selected
        if (isGuest && !currentStudentHouse) {
          currentStudentHouse = 'Agni House';
        }
      }

      // Strict Filtering: Show General candidates ('None') and ONLY student's house candidates
      filteredCandidates = filteredCandidates.filter(
        c => c.house === 'None' || (currentStudentHouse && c.house === currentStudentHouse)
      );

      setCandidates(filteredCandidates);
      setSelectedHouse(currentStudentHouse);
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
  const votesByPosition = useMemo(() => new Map(votes.map((vote) => [vote.position, vote])), [votes]);
  const votedCandidateIds = useMemo(() => new Set(votes.map((vote) => vote.candidate_id)), [votes]);
  const totalPositions = candidateGroups.length;
  const completedPositions = votesByPosition.size;
  const progressPercentage = totalPositions === 0 ? 0 : Math.round((completedPositions / totalPositions) * 100);
  const firstPendingPosition = useMemo(
    () => getNextPendingPosition(candidateGroups, new Set(votesByPosition.keys())),
    [candidateGroups, votesByPosition]
  );
  const allPositionsCompleted = totalPositions > 0 && completedPositions === totalPositions;

  useEffect(() => {
    if (candidateGroups.length > 0 && !openPosition) {
      setOpenPosition(firstPendingPosition ?? candidateGroups[0].position);
    }
  }, [candidateGroups, firstPendingPosition, openPosition]);

  useEffect(() => {
    if (!candidateGroups.length || !openPosition) {
      return;
    }

    if (votesByPosition.has(openPosition) && firstPendingPosition) {
      setOpenPosition(firstPendingPosition);
    }
  }, [candidateGroups.length, firstPendingPosition, openPosition, votesByPosition]);

  const votedCandidates = useMemo(
    () =>
      votes
        .map((vote) => candidates.find((candidate) => candidate.id === vote.candidate_id) ?? null)
        .filter((candidate): candidate is Candidate => candidate !== null),
    [candidates, votes]
  );
  const recordedSelections = useMemo(
    () =>
      candidateGroups
        .map((group) => {
          const recordedVote = votesByPosition.get(group.position);
          if (!recordedVote) {
            return null;
          }

          const candidate = candidates.find((item) => item.id === recordedVote.candidate_id) ?? null;
          if (!candidate) {
            return null;
          }

          return { position: group.position, candidate };
        })
        .filter((item): item is { position: string; candidate: Candidate } => item !== null),
    [candidateGroups, candidates, votesByPosition]
  );

  const handleHouseSelect = async (house: string) => {
    if (user) {
      try {
        setVotingLoading(true);
        const fetchResult = await supabase
          .from('students')
          .select('id, class')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        const { data: existing, error: fetchError } = fetchResult;

        if (fetchError) throw fetchError;
        if (!existing) throw new Error('Student record not found for authenticated user.');

        const finalHouse = existing.class && existing.class !== '' ? existing.class : house;

        if (!existing.class || existing.class === '') {
          const updateResult = await supabase
            .from('students')
            .update({ class: house })
            .eq('auth_user_id', user.id);

          if (updateResult.error) throw updateResult.error;
        }

        // Save selected house in localStorage
        const key = `selectedHouse_${user.id}`;
        localStorage.setItem(key, finalHouse);
        
        // Update React state
        setSelectedHouse(finalHouse);
        setIsSelectingHouse(false);
        setHouseToConfirm(null);

        // Immediately continue to the voting page
        await fetchData(finalHouse);
      } catch (err) {
        console.error('House selection error:', err);
        setErrorModal({
          title: 'Selection Error',
          message: 'Failed to save your house selection. Please try again.',
        });
      } finally {
        setVotingLoading(false);
      }
    } else {
      // Guest mode
      const key = 'selectedHouse';
      localStorage.setItem(key, house);
      setSelectedHouse(house);
      setIsSelectingHouse(false);
      setHouseToConfirm(null);
      await fetchData(house);
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
      const nextPendingPosition = candidateGroups.find(
        (group) => group.position !== confirmCandidate.position && !votesByPosition.has(group.position)
      )?.position;
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
      setOpenPosition(nextPendingPosition ?? null);
      setHasStartedVoting(true);
      setIsReviewScreenOpen(!nextPendingPosition);
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

  const handleFinalBallotSubmit = async () => {
    if (!user || isGuest) {
      if (isGuest) {
        setErrorModal({
          title: 'Guest Preview',
          message: 'As a guest, you cannot submit a final ballot. Please log in with your student credentials.',
        });
      }
      return;
    }

    setVotingLoading(true);
    try {
      console.log('FINAL BALLOT SUBMITTED');
      
      const { error } = await supabase
        .from('students')
        .update({ ballot_submitted: true })
        .eq('auth_user_id', user.id);

      if (error) throw error;

      console.log('REDIRECTING TO THANK YOU PAGE');
      router.push('/thank-you');
    } catch (err) {
      console.error('Final submission error:', err);
      setErrorModal({
        title: 'Submission Error',
        message: 'There was a problem finalizing your ballot. Please try again.',
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

  if (isSelectingHouse) {
    const houseIcons: Record<string, LucideIcon> = {
      'Agni House': Flame,
      'Jal House': Droplets,
      'Bhoomi House': Leaf,
      'Vayu House': Wind,
    };

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start bg-slate-50/50 p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-2xl animate-fade-in flex flex-col pt-4 sm:pt-8">
          {/* Logo & Institution Header */}
          <div className="flex flex-col items-center text-center mb-8 sm:mb-12">
            <div className="relative mb-6 h-44 w-44 sm:h-60 sm:w-60">
              <Image
                src="/logo.png"
                alt="CMR Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">
                CMR National PU College
              </h1>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
                Official Student Council Elections 2026
              </p>
            </div>
          </div>
          
          {/* Personalized Welcome & Quote */}
          <div className="mb-12 flex flex-col items-center">
            <div className="w-full rounded-[2.5rem] bg-white p-8 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                Welcome, {getDisplayName(user)}
              </h2>
              
              <div className="mt-8 flex flex-col items-center">
                <div className="inline-block px-4 py-1 rounded-full bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                  Election Message
                </div>
                <p className="text-xl sm:text-2xl text-slate-800 font-semibold leading-snug max-w-lg mx-auto">
                  &quot;Your vote is your voice. Choose leaders who will shape the future of CMR.&quot;
                </p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1 bg-slate-200" />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Select Your House</h3>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Vertical House List */}
            <div className="space-y-4">
              {HOUSE_OPTIONS.map((house) => {
                const isSelected = selectedHouse === house.value;
                
                const styles: Record<string, { bg: string; border: string; button: string; hover: string }> = {
                  'Agni House': { 
                    bg: 'bg-[#FFF3E8]', 
                    border: 'border-orange-200', 
                    button: 'bg-orange-500',
                    hover: 'hover:border-orange-400' 
                  },
                  'Jal House': { 
                    bg: 'bg-[#EEF5FF]', 
                    border: 'border-blue-200', 
                    button: 'bg-blue-500',
                    hover: 'hover:border-blue-400' 
                  },
                  'Bhoomi House': { 
                    bg: 'bg-[#EEFDF3]', 
                    border: 'border-green-200', 
                    button: 'bg-green-600',
                    hover: 'hover:border-green-400' 
                  },
                  'Vayu House': { 
                    bg: 'bg-[#F5EEFF]', 
                    border: 'border-purple-200', 
                    button: 'bg-purple-600',
                    hover: 'hover:border-purple-400' 
                  },
                };

                const houseStyle = styles[house.value] || styles['Agni House'];
                
                return (
                  <button
                    key={house.value}
                    onClick={() => setHouseToConfirm(house.value)}
                    className={`group relative flex items-center justify-between w-full rounded-[2rem] border px-8 py-7 text-left transition-all duration-500 shadow-xl shadow-slate-200/30 ${houseStyle.bg} ${houseStyle.border} ${houseStyle.hover} hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99]`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-black tracking-tight text-[#001F3F]">
                        {house.value}
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                        Tap to continue
                      </span>
                    </div>

                    <div className="flex items-center">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-5deg] ${houseStyle.button}`}>
                        <ArrowRight className="h-6 w-6" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Institutional Footer */}
          <div className="mt-16 mb-8 text-center">
            <div className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-2.5 border border-slate-100 shadow-sm">
              <Shield className="h-4 w-4 text-slate-900" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Authorized Secure Student Ballot Portal
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {houseToConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6">
            <div className="w-full max-w-md animate-scale-in bg-white rounded-[2.5rem] p-10 shadow-2xl border border-white/20">
              <div className="flex flex-col items-center text-center">
                <div className={`mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] shadow-xl ${HOUSE_OPTIONS_BY_VALUE[houseToConfirm as CandidateHouse]?.borderColor || 'bg-slate-900'}`}>
                  {(() => {
                    const IconComp = houseIcons[houseToConfirm] || Shield;
                    return <IconComp className="h-10 w-10 text-white" />;
                  })()}
                </div>
                
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Confirm House</h3>
                
                <div className="mt-6 p-6 rounded-3xl bg-slate-50 border border-slate-100 w-full text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">You have selected</p>
                  <p className="text-2xl font-black text-slate-900 mt-2">{houseToConfirm}</p>
                </div>

                <p className="mt-8 text-base text-slate-500 font-medium leading-relaxed px-2">
                  This choice is final and <span className="text-rose-600 font-bold">cannot be changed</span> later. Are you sure?
                </p>

                <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                  <button
                    onClick={() => setHouseToConfirm(null)}
                    className="flex h-14 items-center justify-center rounded-2xl border-2 border-slate-100 font-black text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all text-sm uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      console.log("Confirm button clicked");
                      console.log("Selected house (houseToConfirm):", houseToConfirm);
                      if (houseToConfirm) {
                        handleHouseSelect(houseToConfirm);
                      } else {
                        console.error("houseToConfirm is null when clicking Confirm");
                      }
                    }}
                    className="flex h-14 items-center justify-center rounded-2xl bg-slate-900 font-black text-white shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-widest"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
            {timeLeft !== null && (
              <div className={`mr-2 hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold sm:flex ${
                timeLeft < 10 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-700'
              }`}>
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {timeLeft > 0 ? (
                    `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`
                  ) : (
                    "Time's Up!"
                  )}
                </span>
              </div>
            )}
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
        <section className="glass-panel relative overflow-hidden rounded-[2rem] border border-white/70 px-5 py-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.4)] sm:px-8 sm:py-8">
          <div className="absolute inset-x-8 top-0 h-32 rounded-full bg-gradient-to-r from-sky-200/60 via-violet-200/60 to-emerald-200/60 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.85fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Secure Student Ballot
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                CMR National PU College
              </h1>
              <p className="mt-2 text-base font-semibold text-slate-700 sm:text-lg">
                Student Council Elections 2026
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                A guided voting experience for first-time student voters. Browse one position at a
                time, select your candidate, and confirm each vote with confidence.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm shadow-slate-200/50">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Progress
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {completedPositions} / {totalPositions || 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm shadow-slate-200/50">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Voter
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {isGuest ? 'Guest Preview' : getDisplayName(user)}
                  </p>
                </div>
                {selectedHouse && (
                  <div className={`rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm shadow-slate-200/50`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Your House
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${isCandidateHouse(selectedHouse) ? HOUSE_OPTIONS_BY_VALUE[selectedHouse].accent : 'from-slate-400 to-slate-600'}`} />
                      <p className="text-lg font-black text-slate-950">
                        {selectedHouse}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-slate-950 px-5 py-6 text-white shadow-xl shadow-slate-900/10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.24),_transparent_42%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.22),_transparent_38%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Premium Voting Flow
                </div>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                  What Happens Next
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                      1
                    </span>
                    Start the guided ballot.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                      2
                    </span>
                    Open one position at a time and choose a candidate.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                      3
                    </span>
                    Confirm each selection and continue automatically.
                  </li>
                </ul>
                <div className="mt-5 h-2 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  {allPositionsCompleted
                    ? 'All positions are complete. Review your submitted ballot summary below.'
                    : `${Math.max(totalPositions - completedPositions, 0)} position${Math.max(totalPositions - completedPositions, 0) === 1 ? '' : 's'} remaining.`}
                </p>
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
            {!hasStartedVoting && !isReviewScreenOpen ? (
              <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)] sm:p-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Election Home
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    Start your guided ballot
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                    Candidates are grouped by position so you only see one decision at a time.
                    This keeps the ballot focused, mobile-friendly, and easy to complete.
                  </p>
                  <div className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Progress
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {completedPositions} / {totalPositions || 0} Positions Completed
                    </p>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="progress-shimmer h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500 transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-10">
                    <button
                      type="button"
                      onClick={() => {
                        setHasStartedVoting(true);
                        setIsReviewScreenOpen(false);
                        if (!openPosition) {
                          setOpenPosition(firstPendingPosition ?? candidateGroups[0]?.position ?? null);
                        }
                      }}
                      className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[1.25rem] bg-[#002B5B] px-8 text-lg font-black uppercase tracking-wide text-white shadow-[0_12px_24px_-8px_rgba(0,43,91,0.4)] transition-all hover:-translate-y-0.5 hover:bg-[#003a7a] active:scale-[0.98]"
                    >
                      <span>{completedPositions > 0 ? 'Continue Guided Ballot' : 'Start Guided Ballot'}</span>
                      <ArrowRight className="h-5 w-5" aria-hidden />
                    </button>
                    <p className="mt-4 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Guided step-by-step experience
                    </p>
                  </div>
                </div>

                <div className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)] sm:p-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Position Overview
                  </p>
                  <div className="mt-5 space-y-3">
                    {candidateGroups.map((group) => {
                      const visual = getPositionVisual(group.position);
                      const Icon = visual.icon;
                      const isCompleted = votesByPosition.has(group.position);

                      return (
                        <div
                          key={group.position}
                          className={`rounded-[1.35rem] border bg-gradient-to-br ${visual.surface} ${visual.border} px-4 py-4 shadow-sm`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/80 shadow-sm">
                              <Icon className={`h-5 w-5 ${visual.tint}`} aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold text-white">
                                {group.position}
                              </p>
                              <p className="text-xs text-blue-100">
                                {group.candidates.length} Candidate
                                {group.candidates.length === 1 ? '' : 's'}
                              </p>
                            </div>
                            <div
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-white text-[#001F3F]'
                              }`}
                            >
                              {isCompleted ? 'Completed' : 'Not Voted'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            ) : isReviewScreenOpen ? (
              <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)] sm:p-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Review
                      </p>
                      <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        Review your selections
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                        This summary reflects the votes already recorded for each position.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsReviewScreenOpen(false);
                        setHasStartedVoting(true);
                      }}
                      className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      <ArrowRight className="h-4 w-4 rotate-180" aria-hidden />
                      <span>Back to Ballot</span>
                    </button>
                  </div>

                  <div className="mt-6 space-y-4">
                    {recordedSelections.map(({ position, candidate }) => (
                      <div
                        key={position}
                        className="rounded-[1.5rem] border border-emerald-200/80 bg-white/80 p-4 shadow-sm shadow-emerald-100/50 sm:p-5"
                      >
                        <div className="flex items-start gap-4">
                          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-200">
                            {candidate.photo_url ? (
                              <Image
                                src={candidate.photo_url}
                                alt={candidate.name}
                                fill
                                className="object-contain bg-slate-100"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-100">
                                <VoteIcon className="h-6 w-6 text-slate-400" aria-hidden />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {position}
                            </p>
                            <p className="mt-1 truncate text-lg font-bold text-slate-950">
                              {candidate.name}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {candidate.department} · {candidate.year}
                            </p>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                            Submitted
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <aside className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)] sm:p-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Ballot Status
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                    {allPositionsCompleted ? 'Ballot completed' : 'Voting in progress'}
                  </h3>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className="progress-shimmer h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-700">
                    {completedPositions} / {totalPositions || 0} positions completed
                  </p>
                  
                  {allPositionsCompleted && (
                    <div className="mt-8 space-y-4">
                      <button
                        type="button"
                        onClick={handleFinalBallotSubmit}
                        disabled={votingLoading}
                        className="flex min-h-[60px] w-full items-center justify-center gap-3 rounded-2xl bg-[#059669] px-8 text-lg font-black uppercase tracking-widest text-white shadow-[0_20px_40px_-12px_rgba(5,150,105,0.4)] transition-all hover:bg-[#047857] active:scale-[0.98] disabled:opacity-50"
                      >
                        {votingLoading ? (
                           <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-6 w-6" aria-hidden />
                            <span>Submit Final Ballot</span>
                          </>
                        )}
                      </button>
                      <p className="text-center text-xs font-medium text-slate-500">
                        Your official ballot is ready for final submission
                      </p>
                    </div>
                  )}

                  <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/50 p-5 text-sm leading-relaxed text-emerald-800">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <p>
                        Vote submission logic remains unchanged. Each confirmed position is recorded
                        immediately and shown here as part of the final ballot summary.
                      </p>
                    </div>
                  </div>
                </aside>
              </section>
            ) : (
              <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <div className="glass-panel rounded-[1.75rem] border border-white/70 p-5 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)] sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Guided Ballot
                        </p>
                        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                          Vote one position at a time
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          Only one accordion opens at a time, so the ballot stays focused and easy
                          to use on mobile.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsReviewScreenOpen(true)}
                        className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                      >
                        <FileText className="h-4 w-4" aria-hidden />
                        <span>Review My Ballot</span>
                      </button>
                    </div>
                  <div className="mt-5 rounded-[1.35rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Current Progress
                          </p>
                          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                            {completedPositions} / {totalPositions || 0} Positions Completed
                          </p>
                        </div>
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {progressPercentage}%
                        </div>
                      </div>
                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200/80">
                        <div
                          className="progress-shimmer h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500 transition-all duration-500"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {candidateGroups.map((group) => {
                    const visual = getPositionVisual(group.position);
                    const Icon = visual.icon;
                    const selectedCandidateId = selectedCandidateIds[group.position];
                    const selectedCandidate =
                      group.candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;
                    const votedForPosition = votesByPosition.get(group.position);
                    const submittedCandidate =
                      votedForPosition
                        ? candidates.find((candidate) => candidate.id === votedForPosition.candidate_id) ?? null
                        : null;
                    const isOpen = openPosition === group.position && !isReviewScreenOpen;
                    const isMissing = !votedForPosition && !isReviewScreenOpen && showValidationErrors;

                    return (
                      <section
                        key={group.position}
                        id={`position-${group.position.replace(/\s+/g, '-').toLowerCase()}`}
                        className={`glass-panel overflow-hidden rounded-[1.75rem] border transition-all duration-500 ${
                          isMissing && !selectedCandidate ? 'border-red-400 ring-4 ring-red-50 shadow-xl shadow-red-100/50' : 'border-white/70 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenPosition(group.position)}
                          className={`flex w-full items-start gap-4 px-4 py-4 text-left transition sm:px-6 sm:py-5 ${
                            isOpen ? 'bg-white/80' : 'bg-white/65 hover:bg-white/85'
                          }`}
                          aria-expanded={isOpen}
                        >
                          <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] border bg-gradient-to-br shadow-sm ${visual.border} ${visual.surface}`}
                          >
                            <Icon className={`h-6 w-6 ${visual.tint}`} aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h3 className={`text-xl font-black tracking-tight sm:text-2xl ${isOpen ? 'text-[#001F3F]' : 'text-slate-950'}`}>
                                {group.position}
                              </h3>
                              {votedForPosition && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                  Completed
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-medium text-slate-600">
                              {group.candidates.length} candidate
                              {group.candidates.length === 1 ? '' : 's'}
                              {submittedCandidate ? ` · ${submittedCandidate.name} selected` : ''}
                              {!submittedCandidate && selectedCandidate
                                ? ` · ${selectedCandidate.name} selected`
                                : ''}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                votedForPosition
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : selectedCandidate
                                    ? 'bg-sky-100 text-sky-700'
                                    : isMissing ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-white/80 text-slate-600'
                              }`}
                            >
                              {votedForPosition
                                ? 'Voted'
                                : selectedCandidate
                                  ? 'Ready to confirm'
                                  : isMissing ? 'Missing Vote' : 'Not Voted'}
                            </div>
                            <ChevronDown
                              className={`h-5 w-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              aria-hidden
                            />
                          </div>
                        </button>

                        <div
                          className={`accordion-panel overflow-hidden border-t border-slate-200/70 bg-white/75 transition-all duration-300 ease-out ${
                            isOpen ? 'max-h-[2200px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="px-4 py-4 sm:px-6 sm:py-6">
                            {votedForPosition && submittedCandidate ? (
                              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-900">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
                                    <Check className="h-5 w-5 text-emerald-700" aria-hidden />
                                  </div>
                                  <div>
                                    <p className="text-base font-bold">{group.position} completed</p>
                                    <p className="mt-1 text-sm text-emerald-800">
                                      Your recorded vote is <strong>{submittedCandidate.name}</strong>.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
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

                                <div className="sticky bottom-4 mt-6 animate-scale-in rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-5">
                                  <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1 px-1">
                                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                        Current Selection
                                      </p>
                                      <p className="text-lg font-black text-slate-950">
                                        {selectedCandidate
                                          ? selectedCandidate.name
                                          : `Choose a candidate for ${group.position}`}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => selectedCandidate && setConfirmCandidate(selectedCandidate)}
                                      disabled={!selectedCandidate || votingLoading}
                                      className={`flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[1.25rem] px-6 text-lg font-black uppercase tracking-wide transition-all duration-300 ${
                                        selectedCandidate
                                          ? 'bg-[#002B5B] text-white shadow-[0_12px_24px_-8px_rgba(0,43,91,0.4)] hover:-translate-y-0.5 hover:bg-[#003a7a] active:scale-[0.98]'
                                          : 'cursor-not-allowed bg-slate-100 text-slate-400'
                                      }`}
                                    >
                                      {selectedCandidate ? (
                                        <>
                                          <VoteIcon className="h-5 w-5" aria-hidden />
                                          <span>Submit Vote</span>
                                        </>
                                      ) : (
                                        <>
                                          <Lock className="h-5 w-5" aria-hidden />
                                          <span>Select a Candidate</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>

                <aside className="hidden xl:block">
                  <div className="sticky top-24 space-y-4">
                    <div className="glass-panel rounded-[1.75rem] border border-white/70 p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)]">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Voting Progress
                      </p>
                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200/80">
                        <div
                          className="progress-shimmer h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500 transition-all duration-500"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <p className="mt-3 text-2xl font-black text-slate-950">
                        {completedPositions} / {totalPositions || 0}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">Positions completed</p>
                      
                      {!allPositionsCompleted && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowValidationErrors(true);
                            if (completedPositions < totalPositions) {
                              setErrorModal({
                                title: 'Incomplete Ballot',
                                message: 'Please vote for all required positions before submitting.',
                              });
                              // Find first missing position and scroll to it
                              const missing = candidateGroups.find(g => !votesByPosition.has(g.position));
                              if (missing) {
                                setOpenPosition(missing.position);
                                const el = document.getElementById(`position-${missing.position.replace(/\s+/g, '-').toLowerCase()}`);
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                              return;
                            }
                            setIsReviewScreenOpen(true);
                          }}
                          className="mt-6 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl bg-[#002B5B] px-6 text-base font-bold text-white shadow-lg transition-all hover:bg-[#003a7a] active:scale-[0.98]"
                        >
                          <FileText className="h-5 w-5" />
                          Submit Your Vote
                        </button>
                      )}
                    </div>

                    <div className="glass-panel rounded-[1.75rem] border border-white/70 p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)]">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Next Up
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-950">
                        {firstPendingPosition ?? 'All positions completed'}
                      </p>
                    </div>
                  </div>
                </aside>
              </section>
            )}
          </>
        )}

        {hasStartedVoting && totalPositions > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-40 bg-white/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-20px_40px_-15px_rgba(15,23,42,0.1)] backdrop-blur-md xl:hidden">
            <div className="mx-auto max-w-lg">
              {timeLeft !== null && (
                <div className={`mb-3 flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-black uppercase tracking-widest ${
                  timeLeft < 10 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-700'
                }`}>
                  <Clock className="h-3.5 w-3.5" />
                  <span>Time Remaining: {timeLeft > 0 ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : "Time's Up!"}</span>
                </div>
              )}
              {!isReviewScreenOpen && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Voting Progress
                    </p>
                    <p className="text-xs font-bold text-slate-900">
                      {completedPositions} / {totalPositions || 0} completed
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="progress-shimmer h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {allPositionsCompleted ? (
                <button
                  type="button"
                  onClick={handleFinalBallotSubmit}
                  disabled={votingLoading}
                  className="flex min-h-[60px] w-full items-center justify-center gap-3 rounded-2xl bg-[#059669] px-8 text-lg font-black uppercase tracking-widest text-white shadow-[0_20px_40px_-12px_rgba(5,150,105,0.4)] transition-all hover:bg-[#047857] active:scale-[0.98] disabled:opacity-50"
                >
                   {votingLoading ? (
                     <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                   ) : (
                     <>
                       <CheckCircle2 className="h-6 w-6" aria-hidden />
                       <span>Submit Final Ballot</span>
                     </>
                   )}
                </button>
              ) : (
                <div className="flex gap-3">
                  {!isReviewScreenOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowValidationErrors(true);
                        if (completedPositions < totalPositions) {
                          setErrorModal({
                            title: 'Incomplete Ballot',
                            message: 'Please vote for all required positions before submitting.',
                          });
                          const missing = candidateGroups.find(g => !votesByPosition.has(g.position));
                          if (missing) {
                            setOpenPosition(missing.position);
                            const el = document.getElementById(`position-${missing.position.replace(/\s+/g, '-').toLowerCase()}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                          return;
                        }
                        setIsReviewScreenOpen(true);
                      }}
                      className="flex min-h-[56px] flex-1 items-center justify-center gap-3 rounded-2xl bg-[#002B5B] px-6 text-base font-bold text-white shadow-lg active:scale-[0.98]"
                    >
                      <FileText className="h-5 w-5" />
                      <span>Submit Your Vote</span>
                    </button>
                  )}
                  {isReviewScreenOpen && (
                    <button
                      type="button"
                      onClick={() => setIsReviewScreenOpen(false)}
                      className="flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 text-base font-bold text-slate-700 shadow-sm active:scale-[0.98]"
                    >
                      <ArrowRight className="h-5 w-5 rotate-180" />
                      <span>Back to Ballot</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="mt-20 border-t border-slate-200 pt-10 pb-16 text-center">
          <div className="mx-auto max-w-xs">
            <div className="mb-4 flex justify-center gap-4 opacity-30">
              <div className="h-px w-10 bg-slate-900" />
              <Shield className="h-4 w-4 text-slate-900" />
              <div className="h-px w-10 bg-slate-900" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Official Election Platform
            </p>
            <p className="mt-3 text-sm font-medium text-slate-600">
              Designed & Developed by <span className="text-slate-900 font-bold">Yeshwanth B</span>
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              © 2026 CMR National PU College. All rights reserved.
            </p>
          </div>
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
